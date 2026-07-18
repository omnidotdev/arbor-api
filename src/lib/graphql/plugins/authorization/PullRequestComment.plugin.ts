import { EXPORTABLE } from "graphile-export";
import { context, sideEffect } from "postgraphile/grafast";
import { wrapPlans } from "postgraphile/utils";

import type { InsertPullRequestComment } from "lib/db/schema";
import type { PlanWrapperFn } from "postgraphile/utils";
import type { MutationScope } from "./types";

/**
 * Check if user has read access to a repository.
 */
const hasReadAccess = async (
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

  // Public repos are readable by anyone
  if (repository.visibility === "public") return true;

  // Private repos require owner or collaborator access
  const isOwner = repository.ownerId === userId;
  const isCollaborator = repository.collaborators.length > 0;

  return isOwner || isCollaborator;
};

/**
 * Validate pull request comment permissions.
 *
 * - Create: User must be able to see the target pull request (public repo, or
 *   owner/collaborator). The author is pinned to the authenticated user; a
 *   client-supplied authorId that is not the authenticated user is rejected
 * - Update: Author only
 * - Delete: Author only
 */
const validatePermissions = (propName: string, scope: MutationScope) =>
  EXPORTABLE(
    (context, sideEffect, propName, scope, hasReadAccess): PlanWrapperFn =>
      (plan, _, fieldArgs) => {
        const $input = fieldArgs.getRaw(["input", propName]);
        const $observer = context().get("observer");
        const $db = context().get("db");

        sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
          if (!observer) throw new Error("Unauthorized");

          if (scope === "create") {
            const { pullRequestId, authorId } =
              input as InsertPullRequestComment;

            // Pin the author to the authenticated user; never trust a
            // client-supplied author
            if (authorId !== observer.id) throw new Error("Unauthorized");

            const pullRequest = await db.query.pullRequestTable.findFirst({
              where: (table, { eq }) => eq(table.id, pullRequestId),
            });

            if (!pullRequest) throw new Error("Unauthorized");

            const canRead = await hasReadAccess(
              db,
              pullRequest.repositoryId,
              observer.id,
            );
            if (!canRead) throw new Error("Unauthorized");
          } else {
            // Update or delete - only the author may modify their comment
            const comment = await db.query.pullRequestCommentTable.findFirst({
              where: (table, { eq }) => eq(table.id, input),
            });

            if (!comment) throw new Error("Unauthorized");

            if (comment.authorId !== observer.id)
              throw new Error("Unauthorized");
          }
        });

        return plan();
      },
    [context, sideEffect, propName, scope, hasReadAccess],
  );

/**
 * Authorization plugin for pull request comments.
 *
 * - Create: Any user who can see the target pull request; author pinned to the
 *   authenticated user
 * - Update: Author only
 * - Delete: Author only
 */
const PullRequestCommentPlugin = wrapPlans({
  Mutation: {
    createPullRequestComment: validatePermissions(
      "pullRequestComment",
      "create",
    ),
    updatePullRequestComment: validatePermissions("rowId", "update"),
    deletePullRequestComment: validatePermissions("rowId", "delete"),
  },
});

export default PullRequestCommentPlugin;
