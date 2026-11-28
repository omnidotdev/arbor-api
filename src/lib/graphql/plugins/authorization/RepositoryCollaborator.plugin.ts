import { EXPORTABLE } from "graphile-export";
import { context, sideEffect } from "postgraphile/grafast";
import { wrapPlans } from "postgraphile/utils";

import { isWithinLimit } from "lib/entitlements";
import { FEATURE_KEYS, billingBypassOrgIds } from "./constants";

import type { InsertRepositoryCollaborator } from "lib/db/schema";
import type { PlanWrapperFn } from "postgraphile/utils";

/**
 * Validate repository collaborator permissions for create and update.
 *
 * - Create: Owner or admin collaborator can add collaborators (with tier limits)
 * - Update: Owner or admin collaborator can change permissions
 *
 * `inputPath` locates the repository and user ids: the new row on create, and on
 * update the mutation's own key arguments. Update once read them from the
 * patch, which was not the row being changed: a caller authorized on their own
 * repository could name another repository's collaborator row as the key and
 * move it out. Key columns are no longer patchable at all
 * (ImmutableReferences.plugin.ts)
 */
const validatePermissions = (inputPath: string[], scope: "create" | "update") =>
  EXPORTABLE(
    (
      context,
      sideEffect,
      isWithinLimit,
      FEATURE_KEYS,
      billingBypassOrgIds,
      inputPath,
      scope,
    ): PlanWrapperFn =>
      (plan, _, fieldArgs) => {
        const $input = fieldArgs.getRaw(inputPath);
        const $observer = context().get("observer");
        const $db = context().get("db");

        sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
          if (!observer) throw new Error("Unauthorized");

          const repositoryId = (input as InsertRepositoryCollaborator)
            .repositoryId;

          const repository = await db.query.repositoryTable.findFirst({
            where: (table, { eq }) => eq(table.id, repositoryId),
            with: {
              collaborators: true,
            },
          });

          if (!repository) throw new Error("Unauthorized");

          const isOwner = repository.ownerId === observer.id;
          const callerCollaborator = repository.collaborators.find(
            (rc: { userId: string }) => rc.userId === observer.id,
          );
          const isAdminCollaborator =
            callerCollaborator?.permission === "admin";

          // Must be owner or admin collaborator
          if (!isOwner && !isAdminCollaborator) throw new Error("Unauthorized");

          if (scope === "create") {
            // Enforce max_collaborators entitlement for org repos
            if (repository.organizationId) {
              const withinLimit = await isWithinLimit(
                { organizationId: repository.organizationId },
                FEATURE_KEYS.MAX_COLLABORATORS,
                repository.collaborators.length,
                billingBypassOrgIds,
              );

              if (!withinLimit) {
                throw new Error("Collaborator limit reached");
              }
            }
          }

          if (scope === "update") {
            const targetUserId = (input as InsertRepositoryCollaborator).userId;

            // Cannot modify owner's implicit permissions
            if (targetUserId === repository.ownerId) {
              throw new Error("Cannot modify owner permissions");
            }
          }
        });

        return plan();
      },
    [
      context,
      sideEffect,
      isWithinLimit,
      FEATURE_KEYS,
      billingBypassOrgIds,
      inputPath,
      scope,
    ],
  );

/**
 * Validate repository collaborator delete permissions.
 */
const validateDeletePermissions = (): PlanWrapperFn =>
  EXPORTABLE(
    (context, sideEffect): PlanWrapperFn =>
      (plan, _, fieldArgs) => {
        const $repositoryId = fieldArgs.getRaw(["input", "repositoryId"]);
        const $userId = fieldArgs.getRaw(["input", "userId"]);
        const $observer = context().get("observer");
        const $db = context().get("db");

        sideEffect(
          [$repositoryId, $userId, $observer, $db],
          async ([repositoryId, userId, observer, db]) => {
            if (!observer) throw new Error("Unauthorized");

            const repository = await db.query.repositoryTable.findFirst({
              where: (table, { eq }) => eq(table.id, repositoryId),
              with: {
                collaborators: true,
              },
            });

            if (!repository) throw new Error("Unauthorized");

            const isOwner = repository.ownerId === observer.id;
            const callerCollaborator = repository.collaborators.find(
              (rc: { userId: string }) => rc.userId === observer.id,
            );
            const isAdminCollaborator =
              callerCollaborator?.permission === "admin";

            // Must be owner or admin collaborator
            if (!isOwner && !isAdminCollaborator)
              throw new Error("Unauthorized");

            // Cannot remove owner from collaborators (they have implicit access)
            if (userId === repository.ownerId) {
              throw new Error("Cannot remove owner");
            }
          },
        );

        return plan();
      },
    [context, sideEffect],
  );

/**
 * Authorization plugin for repository collaborators.
 *
 * - Create: Owner or admin collaborator (with tier limits)
 * - Update: Owner or admin collaborator
 * - Delete: Owner or admin collaborator
 */
const RepositoryCollaboratorPlugin = wrapPlans({
  Mutation: {
    createRepositoryCollaborator: validatePermissions(
      ["input", "repositoryCollaborator"],
      "create",
    ),
    updateRepositoryCollaborator: validatePermissions(["input"], "update"),
    deleteRepositoryCollaborator: validateDeletePermissions(),
  },
});

export default RepositoryCollaboratorPlugin;
