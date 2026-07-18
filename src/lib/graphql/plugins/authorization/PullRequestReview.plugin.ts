import { EXPORTABLE } from "graphile-export";
import { context, sideEffect } from "postgraphile/grafast";
import { wrapPlans } from "postgraphile/utils";

import type { InsertPullRequestReview } from "lib/db/schema";
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
 * Validate pull request review permissions.
 *
 * - Create: User must be able to see the target pull request (public repo, or
 *   owner/collaborator). The reviewer is pinned to the authenticated user; a
 *   client-supplied reviewerId that is not the authenticated user is rejected
 * - Update: Reviewer only
 * - Delete: Reviewer only
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
            const { pullRequestId, reviewerId } =
              input as InsertPullRequestReview;

            // Pin the reviewer to the authenticated user; never trust a
            // client-supplied reviewer
            if (reviewerId !== observer.id) throw new Error("Unauthorized");

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
            // Update or delete - only the reviewer may modify their review
            const review = await db.query.pullRequestReviewTable.findFirst({
              where: (table, { eq }) => eq(table.id, input),
            });

            if (!review) throw new Error("Unauthorized");

            if (review.reviewerId !== observer.id)
              throw new Error("Unauthorized");
          }
        });

        return plan();
      },
    [context, sideEffect, propName, scope, hasReadAccess],
  );

/**
 * Authorization plugin for pull request reviews.
 *
 * - Create: Any user who can see the target pull request; reviewer pinned to
 *   the authenticated user
 * - Update: Reviewer only
 * - Delete: Reviewer only
 */
const PullRequestReviewPlugin = wrapPlans({
  Mutation: {
    createPullRequestReview: validatePermissions("pullRequestReview", "create"),
    updatePullRequestReview: validatePermissions("rowId", "update"),
    deletePullRequestReview: validatePermissions("rowId", "delete"),
  },
});

export default PullRequestReviewPlugin;
