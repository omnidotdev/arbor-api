import { EXPORTABLE } from "graphile-export";
import { context, sideEffect } from "postgraphile/grafast";
import { wrapPlans } from "postgraphile/utils";

import type { InsertPullRequest } from "lib/db/schema";
import type { PlanWrapperFn } from "postgraphile/utils";
import type { MutationScope } from "./types";

/**
 * Check if user has write access to a repository.
 */
const hasWriteAccess = async (
  db: typeof import("lib/db/db").dbPool,
  repositoryId: string,
  userId: string,
): Promise<boolean> => {
  const repository = await db.query.repositoryTable.findFirst({
    where: (table, { eq }) => eq(table.id, repositoryId),
    with: {
      collaborators: {
        where: (table, { eq }) => eq(table.userId, userId),
      },
    },
  });

  if (!repository) return false;

  const isOwner = repository.ownerId === userId;
  const collaborator = repository.collaborators[0];
  const hasWritePermission =
    collaborator?.permission === "write" ||
    collaborator?.permission === "admin";

  return isOwner || hasWritePermission;
};

/**
 * Validate pull request permissions.
 *
 * - Create: Any user with write access to the repository
 * - Update: PR author or repo admin
 * - Delete: PR author or repo owner
 */
const validatePullRequestPermissions = (
  propName: string,
  scope: MutationScope,
) =>
  EXPORTABLE(
    (context, sideEffect, propName, scope, hasWriteAccess): PlanWrapperFn =>
      (plan, _, fieldArgs) => {
        const $input = fieldArgs.getRaw(["input", propName]);
        const $observer = context().get("observer");
        const $db = context().get("db");

        sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
          if (!observer) throw new Error("Unauthorized");

          if (scope === "create") {
            const repositoryId = (input as InsertPullRequest).repositoryId;

            const canWrite = await hasWriteAccess(
              db,
              repositoryId,
              observer.id,
            );
            if (!canWrite) throw new Error("Unauthorized");
          } else {
            // Update or delete - get the PR first
            const pullRequest = await db.query.pullRequestTable.findFirst({
              where: (table, { eq }) => eq(table.id, input),
              with: {
                repository: {
                  with: {
                    collaborators: {
                      where: (table, { eq }) => eq(table.userId, observer.id),
                    },
                  },
                },
              },
            });

            if (!pullRequest) throw new Error("Unauthorized");

            const isAuthor = pullRequest.authorId === observer.id;
            const isOwner = pullRequest.repository.ownerId === observer.id;
            const collaborator = pullRequest.repository.collaborators[0];
            const isAdmin = collaborator?.permission === "admin";

            if (scope === "delete") {
              // Only author or owner can delete
              if (!isAuthor && !isOwner) throw new Error("Unauthorized");
            } else if (scope === "update") {
              // Author or admin can update
              if (!isAuthor && !isOwner && !isAdmin)
                throw new Error("Unauthorized");
            }
          }
        });

        return plan();
      },
    [context, sideEffect, propName, scope, hasWriteAccess],
  );

/**
 * Authorization plugin for pull requests.
 *
 * Review and comment authorization live in their own plugins
 * (PullRequestReview.plugin.ts / PullRequestComment.plugin.ts).
 */
const PullRequestPlugin = wrapPlans({
  Mutation: {
    createPullRequest: validatePullRequestPermissions("pullRequest", "create"),
    updatePullRequest: validatePullRequestPermissions("rowId", "update"),
    deletePullRequest: validatePullRequestPermissions("rowId", "delete"),
  },
});

export default PullRequestPlugin;
