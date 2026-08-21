import { EXPORTABLE } from "graphile-export";
import { context, lambda, object } from "postgraphile/grafast";
import { extendSchema } from "postgraphile/utils";

import events from "lib/providers";
import { pullRequestService } from "lib/pullRequest";

import type { PullRequestStateAction } from "lib/pullRequest";
import type { FieldArgs } from "postgraphile/grafast";

/**
 * Custom closePullRequest / reopenPullRequest mutations.
 *
 * The generic updatePullRequest CRUD would let a client set arbitrary columns
 * (including state, mergedAt, author) with no transition rules. These mutations
 * take only the pull request id, authorize the caller (repository owner, a
 * write/admin collaborator, or the pull request's own author), apply the
 * open/closed transition atomically through the service (which refuses to touch
 * a merged pull request), and emit the matching arbor.pull_request.* event.
 *
 * Built with extendSchema + lambda() so the whole flow runs in one step with a
 * guaranteed order, mirroring OpenPullRequest.plugin.ts.
 */

/**
 * Build the Grafast plan for a state-changing pull request mutation. The action
 * decides the transition and the event type; the rest of the flow is shared.
 */
const setStatePlan = (
  action: PullRequestStateAction,
  eventType: `arbor.pull_request.${string}`,
) =>
  EXPORTABLE(
    (lambda, object, context, pullRequestService, events, action, eventType) =>
      (_$root: any, fieldArgs: FieldArgs) => {
        const $input = fieldArgs.getRaw("input");
        const $db = context().get("db");
        const $observer = context().get("observer");

        return lambda(
          object({ input: $input, db: $db, observer: $observer }),
          async (args: any) => {
            const { input, db, observer } = args;

            // Must be authenticated
            if (!observer) {
              return {
                rowId: null,
                number: null,
                state: null,
                error: "Unauthorized",
              };
            }

            const { pullRequestId } = input;

            // Load the pull request with its repository owner and the caller's
            // collaborator row, to gate on write access
            const pullRequest = await db.query.pullRequestTable.findFirst({
              where: (table: any, { eq }: any) => eq(table.id, pullRequestId),
              with: {
                repository: {
                  with: {
                    collaborators: {
                      where: (table: any, { eq }: any) =>
                        eq(table.userId, observer.id),
                    },
                  },
                },
              },
            });

            if (!pullRequest?.repository) {
              return {
                rowId: null,
                number: null,
                state: null,
                error: "Pull request not found",
              };
            }

            // The repository owner, a write/admin collaborator, or the pull
            // request's own author may change its open/closed state
            const isOwner = pullRequest.repository.ownerId === observer.id;
            const isAuthor = pullRequest.authorId === observer.id;
            const collaborator = pullRequest.repository.collaborators?.[0];
            const canAct =
              isOwner ||
              isAuthor ||
              collaborator?.permission === "write" ||
              collaborator?.permission === "admin";

            if (!canAct) {
              return {
                rowId: null,
                number: null,
                state: null,
                error: "Unauthorized",
              };
            }

            const updated = await pullRequestService.setPullRequestState(
              pullRequestId,
              action,
              db,
            );

            // Null means the transition did not apply: the pull request is
            // merged, or already in the target state
            if (!updated) {
              return {
                rowId: null,
                number: null,
                state: null,
                error:
                  action === "close"
                    ? "Pull request cannot be closed"
                    : "Pull request cannot be reopened",
              };
            }

            events
              .emit({
                type: eventType,
                data: {
                  pullRequestId: updated.id,
                  number: updated.number,
                  repositoryId: updated.repositoryId,
                  actorId: observer.id,
                },
                organizationId:
                  pullRequest.repository.organizationId ||
                  pullRequest.repository.ownerId,
                subject: updated.id,
              })
              .catch((err: unknown) =>
                console.warn("[arbor] Event emit failed", err),
              );

            return {
              rowId: updated.id,
              number: updated.number,
              state: updated.state,
              error: null,
            };
          },
        );
      },
    [lambda, object, context, pullRequestService, events, action, eventType],
  );

const SetPullRequestStatePlugin = extendSchema(() => {
  return {
    typeDefs: /* GraphQL */ `
      """
      Input for closing or reopening a pull request.
      """
      input SetPullRequestStateInput {
        """
        The pull request to act on.
        """
        pullRequestId: UUID!
      }

      """
      Payload for the closePullRequest / reopenPullRequest mutations.
      """
      type SetPullRequestStatePayload {
        """
        The affected pull request row id.
        """
        rowId: UUID

        """
        The per-repository pull request number.
        """
        number: Int

        """
        The pull request's state after the change.
        """
        state: String

        """
        Error message if the change failed.
        """
        error: String
      }

      extend type Mutation {
        """
        Close an open pull request without merging it. Requires the repository
        owner, a write/admin collaborator, or the pull request's author. A merged
        pull request cannot be closed.
        """
        closePullRequest(
          input: SetPullRequestStateInput!
        ): SetPullRequestStatePayload

        """
        Reopen a closed pull request. Requires the repository owner, a
        write/admin collaborator, or the pull request's author. A merged pull
        request cannot be reopened.
        """
        reopenPullRequest(
          input: SetPullRequestStateInput!
        ): SetPullRequestStatePayload
      }
    `,

    objects: {
      SetPullRequestStatePayload: {
        plans: {
          rowId: EXPORTABLE(
            (lambda) => ($payload: any) =>
              lambda($payload, (p) => (p as any)?.rowId ?? null),
            [lambda],
          ),
          number: EXPORTABLE(
            (lambda) => ($payload: any) =>
              lambda($payload, (p) => (p as any)?.number ?? null),
            [lambda],
          ),
          state: EXPORTABLE(
            (lambda) => ($payload: any) =>
              lambda($payload, (p) => (p as any)?.state ?? null),
            [lambda],
          ),
          error: EXPORTABLE(
            (lambda) => ($payload: any) =>
              lambda($payload, (p) => (p as any)?.error ?? null),
            [lambda],
          ),
        },
      },

      Mutation: {
        plans: {
          closePullRequest: setStatePlan("close", "arbor.pull_request.closed"),
          reopenPullRequest: setStatePlan(
            "reopen",
            "arbor.pull_request.reopened",
          ),
        },
      },
    },
  };
});

export default SetPullRequestStatePlugin;
