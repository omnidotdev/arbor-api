import { sql } from "drizzle-orm";
import { EXPORTABLE } from "graphile-export";
import { context, sideEffect } from "postgraphile/grafast";
import { wrapPlans } from "postgraphile/utils";

import { pullRequestCommentTopic } from "lib/graphql/plugins/subscriptions/topic";

import type { InsertPullRequestComment } from "lib/db/schema";
import type { PullRequestCommentAction } from "lib/graphql/plugins/subscriptions/topic";
import type { PlanWrapperFn } from "postgraphile/utils";
import type { MutationScope } from "./types";

/**
 * Check if user has read access to a repository.
 */
export const hasReadAccess = async (
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
 * Validate pull request comment permissions, then publish the change so the
 * pullRequestCommentChanged subscription can push it in real time.
 *
 * - Create: User must be able to see the target pull request (public repo, or
 *   owner/collaborator). The author is pinned to the authenticated user; a
 *   client-supplied authorId that is not the authenticated user is rejected
 * - Update: Author only
 * - Delete: Author only
 *
 * After the mutation runs, `pg_notify` is fired application-side onto the pull
 * request's comment channel (org rule: no NOTIFY trigger, all DDL flows through
 * Drizzle). The publish is best-effort and never fails the mutation. It runs on
 * a pooled connection before the mutation's own transaction commits, so on a
 * create a subscriber may momentarily re-select a null `comment`; the payload
 * always carries the id + action, so the client learns of the change and can
 * refetch.
 */
const validateAndPublish = (
  propName: string,
  scope: MutationScope,
  action: PullRequestCommentAction,
) =>
  EXPORTABLE(
    (
      context,
      sideEffect,
      sql,
      propName,
      scope,
      action,
      hasReadAccess,
      pullRequestCommentTopic,
    ): PlanWrapperFn =>
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

        const $result = plan();

        // Post-mutation realtime publish
        sideEffect([$result, $input, $db], async ([result, input, db]) => {
          let commentId: string | undefined;
          let pullRequestId: string | undefined;

          if (scope === "create") {
            // the id is db-generated, so read it off the affected row; the pull
            // request comes from the input
            commentId = (result as { id?: string } | null)?.id;
            pullRequestId = (input as InsertPullRequestComment).pullRequestId;
          } else {
            // update/delete: the input is the comment rowId. Read the pull
            // request back by comment id. On a pooled connection this still
            // sees the pre-commit row, so it resolves for delete too
            commentId = input as string;
            const comment = await db.query.pullRequestCommentTable.findFirst({
              where: (table, { eq }) => eq(table.id, commentId as string),
              columns: { pullRequestId: true },
            });
            pullRequestId = comment?.pullRequestId;
          }

          if (!commentId || !pullRequestId) return;

          await db
            .execute(
              sql`select pg_notify(${pullRequestCommentTopic(pullRequestId)}, ${JSON.stringify(
                { id: commentId, action },
              )})`,
            )
            .catch((error) =>
              console.error("[PullRequestComment] pg_notify failed:", error),
            );
        });

        return $result;
      },
    [
      context,
      sideEffect,
      sql,
      propName,
      scope,
      action,
      hasReadAccess,
      pullRequestCommentTopic,
    ],
  );

/**
 * Authorization plugin for pull request comments.
 *
 * - Create: Any user who can see the target pull request; author pinned to the
 *   authenticated user
 * - Update: Author only
 * - Delete: Author only
 *
 * Each mutation also publishes a realtime change event (see validateAndPublish).
 */
const PullRequestCommentPlugin = wrapPlans({
  Mutation: {
    createPullRequestComment: validateAndPublish(
      "pullRequestComment",
      "create",
      "CREATED",
    ),
    updatePullRequestComment: validateAndPublish("rowId", "update", "UPDATED"),
    deletePullRequestComment: validateAndPublish("rowId", "delete", "DELETED"),
  },
});

export default PullRequestCommentPlugin;
