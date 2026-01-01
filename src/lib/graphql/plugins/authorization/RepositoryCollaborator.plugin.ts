import { EXPORTABLE } from "graphile-export";
import { context, sideEffect } from "postgraphile/grafast";
import { wrapPlans } from "postgraphile/utils";

import {
  BASIC_TIER_MAX_COLLABORATORS,
  FREE_TIER_MAX_COLLABORATORS,
  billingBypassSlugs,
} from "./constants";

import type { InsertRepositoryCollaborator } from "lib/db/schema";
import type { PlanWrapperFn } from "postgraphile/utils";

/**
 * Validate repository collaborator permissions for create and update.
 *
 * - Create: Owner or admin collaborator can add collaborators (with tier limits)
 * - Update: Owner or admin collaborator can change permissions
 */
const validatePermissions = (propName: string, scope: "create" | "update") =>
  EXPORTABLE(
    (
      context,
      sideEffect,
      propName,
      scope,
      FREE_TIER_MAX_COLLABORATORS,
      BASIC_TIER_MAX_COLLABORATORS,
      billingBypassSlugs,
    ): PlanWrapperFn =>
      (plan, _, fieldArgs) => {
        const $input = fieldArgs.getRaw(["input", propName]);
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
              organization: true,
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
            // Check tier limits for org repos
            if (repository.organization) {
              const org = repository.organization;

              if (!billingBypassSlugs.includes(org.slug)) {
                if (org.tier === "free") {
                  if (
                    repository.collaborators.length >=
                    FREE_TIER_MAX_COLLABORATORS
                  )
                    throw new Error("Maximum number of collaborators reached");
                }

                if (org.tier === "basic") {
                  if (
                    repository.collaborators.length >=
                    BASIC_TIER_MAX_COLLABORATORS
                  )
                    throw new Error("Maximum number of collaborators reached");
                }
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
      propName,
      scope,
      FREE_TIER_MAX_COLLABORATORS,
      BASIC_TIER_MAX_COLLABORATORS,
      billingBypassSlugs,
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
      "repositoryCollaborator",
      "create",
    ),
    updateRepositoryCollaborator: validatePermissions("patch", "update"),
    deleteRepositoryCollaborator: validateDeletePermissions(),
  },
});

export default RepositoryCollaboratorPlugin;
