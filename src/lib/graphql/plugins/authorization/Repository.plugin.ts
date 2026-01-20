import { EXPORTABLE } from "graphile-export";
import { context, sideEffect } from "postgraphile/grafast";
import { wrapPlans } from "postgraphile/utils";

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
 * Wrapper for createRepository that validates permissions.
 *
 * Note: Git repository initialization is handled by the custom
 * createRepositoryWithGit mutation in RepositoryCreate.plugin.ts.
 * This wrapper validates membership for org repos.
 *
 * Tier limits are enforced by Aether (entitlements service) and checked
 * separately - this plugin only validates basic membership.
 */
const createRepositoryWrapper = EXPORTABLE(
  (context, sideEffect): PlanWrapperFn =>
    (plan, _, fieldArgs) => {
      const $input = fieldArgs.getRaw(["input", "repository"]);
      const $observer = context().get("observer");
      const $organizations = context().get("organizations");
      const $db = context().get("db");

      // Pre-mutation: validate permissions
      sideEffect(
        [$input, $observer, $organizations, $db],
        async ([input, observer, organizations, db]) => {
          if (!observer) throw new Error("Unauthorized");

          const organizationId = (input as InsertRepository).organizationId;

          // Personal repos - no membership check needed
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

          // Note: Tier limits (max repositories) are enforced by Aether entitlements
          // service and should be checked via a separate entitlements API call
          // TODO: Integrate with Aether entitlements API for tier limit checks
        },
      );

      return plan();
    },
  [context, sideEffect],
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
