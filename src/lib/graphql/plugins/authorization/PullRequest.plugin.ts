import { EXPORTABLE } from "graphile-export";
import { context, sideEffect } from "postgraphile/grafast";
import { wrapPlans } from "postgraphile/utils";

import type {
  InsertPullRequest,
  InsertPullRequestComment,
  InsertPullRequestReview,
} from "lib/db/schema";
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
 * Validate pull request review permissions.
 *
 * - Create: Any user with read access to the repository
 * - Update: Review author only
 * - Delete: Review author or PR author
 */
const validateReviewPermissions = (propName: string, scope: MutationScope) =>
  EXPORTABLE(
    (context, sideEffect, propName, scope, hasReadAccess): PlanWrapperFn =>
      (plan, _, fieldArgs) => {
        const $input = fieldArgs.getRaw(["input", propName]);
        const $observer = context().get("observer");
        const $db = context().get("db");

        sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
          if (!observer) throw new Error("Unauthorized");

          if (scope === "create") {
            const pullRequestId = (input as InsertPullRequestReview)
              .pullRequestId;

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
            const review = await db.query.pullRequestReviewTable.findFirst({
              where: (table, { eq }) => eq(table.id, input),
              with: {
                pullRequest: true,
              },
            });

            if (!review) throw new Error("Unauthorized");

            const isReviewer = review.reviewerId === observer.id;
            const isPRAuthor = review.pullRequest.authorId === observer.id;

            if (scope === "update") {
              if (!isReviewer) throw new Error("Unauthorized");
            } else if (scope === "delete") {
              if (!isReviewer && !isPRAuthor) throw new Error("Unauthorized");
            }
          }
        });

        return plan();
      },
    [context, sideEffect, propName, scope, hasReadAccess],
  );

/**
 * Validate pull request comment permissions.
 *
 * - Create: Any user with read access to the repository
 * - Update: Comment author only
 * - Delete: Comment author or PR author
 */
const validateCommentPermissions = (propName: string, scope: MutationScope) =>
  EXPORTABLE(
    (context, sideEffect, propName, scope, hasReadAccess): PlanWrapperFn =>
      (plan, _, fieldArgs) => {
        const $input = fieldArgs.getRaw(["input", propName]);
        const $observer = context().get("observer");
        const $db = context().get("db");

        sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
          if (!observer) throw new Error("Unauthorized");

          if (scope === "create") {
            const pullRequestId = (input as InsertPullRequestComment)
              .pullRequestId;

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
            const comment = await db.query.pullRequestCommentTable.findFirst({
              where: (table, { eq }) => eq(table.id, input),
              with: {
                pullRequest: true,
              },
            });

            if (!comment) throw new Error("Unauthorized");

            const isAuthor = comment.authorId === observer.id;
            const isPRAuthor = comment.pullRequest.authorId === observer.id;

            if (scope === "update") {
              if (!isAuthor) throw new Error("Unauthorized");
            } else if (scope === "delete") {
              if (!isAuthor && !isPRAuthor) throw new Error("Unauthorized");
            }
          }
        });

        return plan();
      },
    [context, sideEffect, propName, scope, hasReadAccess],
  );

/**
 * Authorization plugin for pull requests.
 */
const PullRequestPlugin = wrapPlans({
  Mutation: {
    // Pull Requests
    createPullRequest: validatePullRequestPermissions("pullRequest", "create"),
    updatePullRequest: validatePullRequestPermissions("rowId", "update"),
    deletePullRequest: validatePullRequestPermissions("rowId", "delete"),

    // Reviews
    createPullRequestReview: validateReviewPermissions(
      "pullRequestReview",
      "create",
    ),
    updatePullRequestReview: validateReviewPermissions("rowId", "update"),
    deletePullRequestReview: validateReviewPermissions("rowId", "delete"),

    // Comments
    createPullRequestComment: validateCommentPermissions(
      "pullRequestComment",
      "create",
    ),
    updatePullRequestComment: validateCommentPermissions("rowId", "update"),
    deletePullRequestComment: validateCommentPermissions("rowId", "delete"),
  },
});

export default PullRequestPlugin;
