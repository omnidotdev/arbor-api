import { EXPORTABLE } from "graphile-export";
import { context, lambda, object } from "postgraphile/grafast";
import { extendSchema } from "postgraphile/utils";

import { topicReadiness } from "lib/topic";

import type { FieldArgs } from "postgraphile/grafast";

/**
 * Custom query reporting whether a cross-repository topic is ready to submit
 * all-or-nothing: every member pull request is landable (merged, or open). It is
 * the gate a Gerrit-style "submit whole topic" action would check. Visibility is
 * enforced in the service (an invisible topic yields not-ready, and a member in
 * a repository the caller cannot see is excluded), so it cannot leak a private
 * pull request.
 */
const TopicReadinessPlugin = extendSchema(() => {
  return {
    typeDefs: /* GraphQL */ `
      """
      Whether a topic can submit all-or-nothing, and the members blocking it.
      """
      type TopicReadiness {
        """True when every member pull request is landable (merged or open)."""
        ready: Boolean

        """The member pull requests that cannot land yet, by row id."""
        blockingPullRequestIds: [UUID!]
      }

      extend type Query {
        """
        Whether the topic is ready to submit as one all-or-nothing unit. Only
        member pull requests the caller may see are considered.
        """
        topicReadiness(topicId: UUID!): TopicReadiness
      }
    `,

    objects: {
      TopicReadiness: {
        plans: {
          ready: EXPORTABLE(
            (lambda) => ($r: any) =>
              lambda($r, (r) => (r as any)?.ready ?? null),
            [lambda],
          ),
          blockingPullRequestIds: EXPORTABLE(
            (lambda) => ($r: any) =>
              lambda($r, (r) => (r as any)?.blockingPullRequestIds ?? null),
            [lambda],
          ),
        },
      },

      Query: {
        plans: {
          topicReadiness: EXPORTABLE(
            (lambda, object, context, topicReadiness) =>
              (_$root: any, fieldArgs: FieldArgs) => {
                const $topicId = fieldArgs.getRaw("topicId");
                const $db = context().get("db");
                const $observer = context().get("observer");

                return lambda(
                  object({ topicId: $topicId, db: $db, observer: $observer }),
                  async (args: any) =>
                    await topicReadiness({
                      observer: args.observer,
                      db: args.db,
                      input: { topicId: args.topicId },
                    }),
                );
              },
            [lambda, object, context, topicReadiness],
          ),
        },
      },
    },
  };
});

export default TopicReadinessPlugin;
