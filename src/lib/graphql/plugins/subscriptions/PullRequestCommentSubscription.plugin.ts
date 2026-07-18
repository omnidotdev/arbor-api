/**
 * Pull Request Comment Subscription Plugin
 *
 * Exposes `pullRequestCommentChanged`, a GraphQL subscription that pushes an
 * event whenever a comment on a given pull request is created, updated, or
 * deleted. Backed by Postgres LISTEN/NOTIFY: the subscribe plan listens on a
 * per pull request channel (`pr_comment:<pullRequestId>`) via the grafast
 * `listen` step + the request's `pgSubscriber`, and the comment mutations
 * publish with `pg_notify` (see PullRequestComment.plugin). Served over SSE by
 * graphql-yoga.
 *
 * The delivered payload carries the change `action` and the affected comment's
 * id, plus the resolved `comment` re-selected through its pg resource so the
 * client can select any PullRequestComment field. On a delete the comment no
 * longer exists, so `comment` resolves to null while `commentId` and `action`
 * still identify what changed.
 */

import { EXPORTABLE } from "graphile-export";
import { jsonParse } from "postgraphile/@dataplan/json";
import { context, lambda, listen } from "postgraphile/grafast";
import { gql, makeExtendSchemaPlugin } from "postgraphile/utils";

import { hasReadAccess } from "lib/graphql/plugins/authorization/PullRequestComment.plugin";
import { NO_ACCESS_TOPIC, pullRequestCommentTopic } from "./topic";

const PullRequestCommentSubscriptionPlugin = makeExtendSchemaPlugin((build) => {
  // Resolved once at schema build. This is the payload's backing resource, so a
  // missing one means the registry never picked up the table and the
  // subscription would fail at query-planning time with an opaque error. Fail
  // at boot instead
  const commentResource =
    build.input.pgRegistry.pgResources.pull_request_comment;

  if (!commentResource) {
    throw new Error(
      "PullRequestCommentSubscriptionPlugin requires the pull_request_comment pg resource",
    );
  }

  return {
    typeDefs: gql`
      "The kind of change delivered on a pullRequestCommentChanged event."
      enum PullRequestCommentChangeAction {
        CREATED
        UPDATED
        DELETED
      }

      "A single change to a comment on a pull request's conversation."
      type PullRequestCommentChangePayload {
        "Whether the comment was created, updated, or deleted."
        action: PullRequestCommentChangeAction
        "The affected comment's id (always present, including on delete)."
        commentId: UUID
        "The affected comment, or null if it was deleted."
        comment: PullRequestComment
      }

      extend type Subscription {
        "Fires when a comment on the given pull request is created, updated, or deleted."
        pullRequestCommentChanged(
          pullRequestId: UUID!
        ): PullRequestCommentChangePayload
      }
    `,
    plans: {
      PullRequestCommentChangePayload: {
        action($event: any) {
          return $event.get("action");
        },
        commentId($event: any) {
          return $event.get("id");
        },
        comment($event: any) {
          // re-select the row by the notified id so the PullRequestComment type
          // resolves its fields normally; null on delete
          return commentResource.get({ id: $event.get("id") });
        },
      },
      Subscription: {
        pullRequestCommentChanged: {
          subscribePlan: EXPORTABLE(
            (
              context,
              lambda,
              listen,
              jsonParse,
              hasReadAccess,
              pullRequestCommentTopic,
              NO_ACCESS_TOPIC,
            ) =>
              function subscribePlan(_$root: any, fieldArgs: any) {
                const $pgSubscriber = context().get("pgSubscriber");
                const $observer = context().get("observer");
                const $db = context().get("db");
                const $pullRequestId = fieldArgs.getRaw("pullRequestId");

                // Authorize at subscribe time: resolve the LISTEN channel only
                // after confirming the subscriber can read the pull request
                // (public repo, or owner/collaborator). Anonymous or
                // unauthorized subscribers are routed to a dead channel that is
                // never published to, so the subscription stays open but silent
                const $topic = lambda(
                  [$pullRequestId, $observer, $db],
                  async ([rawPullRequestId, observer, db]) => {
                    const pullRequestId = rawPullRequestId as string | null;
                    if (!observer || !pullRequestId) return NO_ACCESS_TOPIC;

                    const pullRequest =
                      await db.query.pullRequestTable.findFirst({
                        where: (table, { eq }) => eq(table.id, pullRequestId),
                        columns: { repositoryId: true },
                      });
                    if (!pullRequest) return NO_ACCESS_TOPIC;

                    const canRead = await hasReadAccess(
                      db,
                      pullRequest.repositoryId,
                      observer.id,
                    );
                    return canRead
                      ? pullRequestCommentTopic(pullRequestId)
                      : NO_ACCESS_TOPIC;
                  },
                );

                return listen($pgSubscriber, $topic, jsonParse);
              },
            [
              context,
              lambda,
              listen,
              jsonParse,
              hasReadAccess,
              pullRequestCommentTopic,
              NO_ACCESS_TOPIC,
            ],
          ),
          plan: EXPORTABLE(
            () =>
              function plan($event: any) {
                return $event;
              },
            [],
          ),
        },
      },
    },
  };
});

export default PullRequestCommentSubscriptionPlugin;
