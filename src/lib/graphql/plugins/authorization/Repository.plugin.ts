import { EXPORTABLE } from "graphile-export";
import { constant, context, sideEffect } from "postgraphile/grafast";
import { wrapPlans } from "postgraphile/utils";

import {
  INSUFFICIENT_ROLE_MESSAGE,
  organizationRepositoryCreateDenial,
} from "lib/auth/organizationRoles";
import { isWithinLimit } from "lib/entitlements";
import { FEATURE_KEYS, billingBypassOrgIds } from "./constants";
import { repositoryPatchChangesOwnership } from "./repositoryOwnership";

import type { InsertRepository } from "lib/db/schema";
import type { PlanWrapperFn } from "postgraphile/utils";
import type { MutationScope } from "./types";

/**
 * The input fields each guarded repository mutation reads: the row id, and the
 * patch for the one mutation that has one. Reading a field an input type lacks
 * fails the whole mutation at plan time, so this stays in step with the schema
 * (checked against `schema.graphql` in a test)
 */
export const REPOSITORY_MUTATION_INPUTS = {
  updateRepository: { rowId: "rowId", patch: "patch" },
  renameRepository: { rowId: "rowId", patch: null },
  deleteRepository: { rowId: "rowId", patch: null },
} as const satisfies Record<
  string,
  { rowId: string; patch: string | null }
>;

/**
 * Validate repository permissions for update/delete.
 *
 * - Update: Owner or admin collaborator can update, but never the owner or
 *   organization (a transfer)
 * - Delete: Owner only
 */
const validatePermissions = (
  { rowId: propName, patch: patchName }: { rowId: string; patch: string | null },
  scope: MutationScope,
) =>
  EXPORTABLE(
    (
      constant,
      context,
      sideEffect,
      repositoryPatchChangesOwnership,
      propName,
      patchName,
      scope,
    ): PlanWrapperFn =>
      (plan, _, fieldArgs) => {
        const $input = fieldArgs.getRaw(["input", propName]);
        // Only an update carries a patch; rename and delete inputs have none
        const $patch = patchName
          ? fieldArgs.getRaw(["input", patchName])
          : constant(null);
        const $observer = context().get("observer");
        const $db = context().get("db");

        sideEffect(
          [$input, $patch, $observer, $db],
          async ([input, patch, observer, db]) => {
            if (!observer) throw new Error("Unauthorized");

            // Ownership is fixed at creation. Moving a repository to another
            // owner or into an organization is a transfer, which needs the
            // destination's consent and role checks that a patch cannot carry,
            // so a patch may never change either. The schema hides both fields
            // from RepositoryPatch (SmartTag.plugin.ts); this is the backstop
            if (repositoryPatchChangesOwnership(patch)) {
              throw new Error("Repository ownership cannot be changed");
            }

            // Update or delete
            const repository = await db.query.repositoryTable.findFirst({
              where: (table, { eq }) => eq(table.id, input),
              with: {
                collaborators: {
                  where: (table, { eq }) => eq(table.userId, observer.id),
                },
              },
            });

            if (!repository) throw new Error("Unauthorized");

            const isOwner = repository.ownerId === observer.id;
            const collaborator = repository.collaborators[0];
            const isAdminCollaborator = collaborator?.permission === "admin";

            if (scope === "delete") {
              // Only owner can delete
              if (!isOwner) throw new Error("Unauthorized");
            } else if (scope === "update") {
              // Owner or admin collaborator can update
              if (!isOwner && !isAdminCollaborator)
                throw new Error("Unauthorized");
            }
          },
        );

        return plan();
      },
    [
      constant,
      context,
      sideEffect,
      repositoryPatchChangesOwnership,
      propName,
      patchName,
      scope,
    ],
  );

/**
 * Wrapper for createRepository that validates permissions and tier limits.
 *
 * Note: Git repository initialization is handled by the custom
 * createRepositoryWithGit mutation in RepositoryCreate.plugin.ts.
 * This wrapper validates membership for org repos and enforces tier limits.
 */
const createRepositoryWrapper = EXPORTABLE(
  (
    context,
    sideEffect,
    isWithinLimit,
    FEATURE_KEYS,
    billingBypassOrgIds,
    organizationRepositoryCreateDenial,
    INSUFFICIENT_ROLE_MESSAGE,
  ): PlanWrapperFn =>
    (plan, _, fieldArgs) => {
      const $input = fieldArgs.getRaw(["input", "repository"]);
      const $observer = context().get("observer");
      const $organizations = context().get("organizations");
      const $db = context().get("db");
      const $withPgClient = context().get("withPgClient");

      // Pre-mutation: validate permissions and tier limits
      sideEffect(
        [$input, $observer, $organizations, $db, $withPgClient],
        async ([input, observer, organizations, db, withPgClient]) => {
          if (!observer) throw new Error("Unauthorized");

          const organizationId = (input as InsertRepository).organizationId;

          // Personal repos - no membership or tier check needed for now
          if (!organizationId) return;

          // Fetch organization to get idpOrganizationId
          const organization = await db.query.organizationTable.findFirst({
            where: (table, { eq }) => eq(table.id, organizationId),
          });

          if (!organization) throw new Error("Workspace not found");

          // Membership and an owner or admin role, from the caller's claims
          const denial = organizationRepositoryCreateDenial(
            organizations,
            organization.idpOrganizationId,
          );

          if (denial === "not_member") throw new Error("Unauthorized");
          if (denial === "insufficient_role") {
            throw new Error(INSUFFICIENT_ROLE_MESSAGE);
          }

          // Check tier limits via Aether entitlements.
          // The catalog limit (max_private_repos) only governs private repos,
          // so only count existing private repos. Creating a public repo is
          // unaffected when the new repo itself is public, but the limit is
          // enforced against the current private repo count regardless.
          const privateRepos = await withPgClient(null, async (client) => {
            const result = await client.query({
              text: "SELECT count(*)::int as total FROM repository WHERE organization_id = $1 AND visibility = 'private'",
              values: [organizationId],
            });
            return (
              (result.rows[0] as { total: number } | undefined)?.total ?? 0
            );
          });

          // Public repos are unlimited; only enforce the limit for private repos
          if ((input as InsertRepository).visibility === "private") {
            const withinLimit = await isWithinLimit(
              { organizationId },
              FEATURE_KEYS.MAX_PRIVATE_REPOS,
              privateRepos,
              billingBypassOrgIds,
            );

            if (!withinLimit) {
              throw new Error(
                "Maximum number of private repositories reached for your plan",
              );
            }
          }
        },
      );

      return plan();
    },
  [
    context,
    sideEffect,
    isWithinLimit,
    FEATURE_KEYS,
    billingBypassOrgIds,
    organizationRepositoryCreateDenial,
    INSUFFICIENT_ROLE_MESSAGE,
  ],
);

/**
 * Authorization plugin for repositories.
 *
 * - Create: Any authenticated user for a personal repository; an organization
 *   repository needs an owner or admin role there (plus tier limits)
 * - Update: Owner or admin collaborator, never changing owner or organization
 * - Rename: Owner or admin collaborator (update-level permission)
 * - Delete: Owner only
 */
const RepositoryPlugin = wrapPlans({
  Mutation: {
    createRepository: createRepositoryWrapper,
    updateRepository: validatePermissions(
      REPOSITORY_MUTATION_INPUTS.updateRepository,
      "update",
    ),
    renameRepository: validatePermissions(
      REPOSITORY_MUTATION_INPUTS.renameRepository,
      "update",
    ),
    deleteRepository: validatePermissions(
      REPOSITORY_MUTATION_INPUTS.deleteRepository,
      "delete",
    ),
  },
});

export default RepositoryPlugin;
