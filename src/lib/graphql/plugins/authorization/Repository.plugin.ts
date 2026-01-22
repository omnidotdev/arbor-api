import { EXPORTABLE } from "graphile-export";
import { context, sideEffect } from "postgraphile/grafast";
import { wrapPlans } from "postgraphile/utils";

import { isWithinLimit } from "lib/entitlements";
import { FEATURE_KEYS, billingBypassOrgIds } from "./constants";

import type { InsertRepository } from "lib/db/schema";
import type { PlanWrapperFn } from "postgraphile/utils";
import type { MutationScope } from "./types";

/**
 * Validate repository permissions for update/delete.
 *
 * - Update: Owner or admin collaborator can update
 * - Delete: Owner only
 */
const validatePermissions = (propName: string, scope: MutationScope) =>
  EXPORTABLE(
    (context, sideEffect, propName, scope): PlanWrapperFn =>
      (plan, _, fieldArgs) => {
        const $input = fieldArgs.getRaw(["input", propName]);
        const $observer = context().get("observer");
        const $db = context().get("db");

        sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
          if (!observer) throw new Error("Unauthorized");

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
        });

        return plan();
      },
    [context, sideEffect, propName, scope],
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

          if (!organization) throw new Error("Organization not found");

          // Check membership via IDP claims (from JWT)
          // Organizations array contains the user's org memberships from Gatekeeper
          const isMember = organizations.some(
            (org: { id: string }) => org.id === organization.idpOrganizationId,
          );

          if (!isMember) throw new Error("Unauthorized");

          // Check tier limits via Aether entitlements
          const totalRepos = await withPgClient(null, async (client) => {
            const result = await client.query({
              text: "SELECT count(*)::int as total FROM repository WHERE organization_id = $1",
              values: [organizationId],
            });
            return (
              (result.rows[0] as { total: number } | undefined)?.total ?? 0
            );
          });

          const withinLimit = await isWithinLimit(
            { organizationId },
            FEATURE_KEYS.MAX_REPOSITORIES,
            totalRepos,
            billingBypassOrgIds,
          );

          if (!withinLimit) {
            throw new Error(
              "Maximum number of repositories reached for your plan",
            );
          }
        },
      );

      return plan();
    },
  [context, sideEffect, isWithinLimit, FEATURE_KEYS, billingBypassOrgIds],
);

/**
 * Authorization plugin for repositories.
 *
 * - Create: Any authenticated user (with tier limits for org repos)
 *   + Auto-initializes git repository on disk after creation
 * - Update: Owner or admin collaborator
 * - Delete: Owner only
 */
const RepositoryPlugin = wrapPlans({
  Mutation: {
    createRepository: createRepositoryWrapper,
    updateRepository: validatePermissions("rowId", "update"),
    deleteRepository: validatePermissions("rowId", "delete"),
  },
});

export default RepositoryPlugin;
