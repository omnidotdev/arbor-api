import { EXPORTABLE } from "graphile-export";
import { GraphQLError } from "graphql";
import { context, lambda, object } from "postgraphile/grafast";
import { extendSchema } from "postgraphile/utils";

import { GRAPH_LEVEL, requireUserGraphLevel } from "lib/entitlements";

import type { FieldArgs } from "postgraphile/grafast";

/**
 * Tier gate for the org-wide polyrepo graph (the /graph surface): every
 * repository the viewer can see and the dependency edges between them. This is
 * a paid graph capability (Pro, level 1); the free tier gets only the per-repo
 * graph.
 *
 * The polyrepo graph is composed client-side from the generic `repositories`
 * connection plus nested cross-repo relationships, so there is no single field
 * or owning organization to gate: the graph spans the viewer's repos across
 * every organization and their personal account. This field is that gate. It
 * resolves the VIEWER's capability (the highest graph_level across the orgs they
 * belong to, so a paying customer keeps it on personal repos too) and throws
 * GRAPH_TIER_REQUIRED below the tier.
 *
 * It is Non-Null on purpose: by the GraphQL error-propagation rules, a throw
 * here nulls the whole `data` response, so a below-tier client that requests
 * this field alongside the graph gets the upgrade prompt (off the stable
 * GRAPH_TIER_REQUIRED code) in place of a rendered graph.
 *
 * This is a monetization gate on the aggregated polyrepo VIEW, not an
 * access-control boundary: the generic `repositories` connection stays
 * reachable, so a caller that omits this field could still read the same rows
 * (their own repositories, already listed on other free surfaces) directly.
 * Nothing secret is gated here, only the paid graph view.
 */
const PolyrepoGraphAccessPlugin = extendSchema(() => {
  return {
    typeDefs: /* GraphQL */ `
      extend type Query {
        """
        Enforces access to the org-wide polyrepo graph, a paid graph capability
        (Pro tier). Resolves to true when the viewer's plan includes it and
        throws GRAPH_TIER_REQUIRED otherwise. Being non-null, a denial nulls the
        whole response so no graph data is returned below the tier. Request this
        alongside the polyrepo graph query.
        """
        polyrepoGraphAccess: Boolean!
      }
    `,

    objects: {
      Query: {
        plans: {
          polyrepoGraphAccess: EXPORTABLE(
            (
              lambda,
              object,
              context,
              requireUserGraphLevel,
              GRAPH_LEVEL,
              GraphQLError,
            ) =>
              (_$root: any, _fieldArgs: FieldArgs) => {
                const $db = context().get("db");
                const $observer = context().get("observer");

                return lambda(
                  object({ db: $db, observer: $observer }),
                  async (args: any) => {
                    // Gate on the VIEWER's plan: the polyrepo graph spans their
                    // repos across every org and their personal account, so
                    // there is no single owning org to bill. An unauthenticated
                    // caller has no plan and is denied at the Pro level
                    if (!args.observer) {
                      throw new GraphQLError(
                        "This feature is available on the Pro plan",
                        {
                          extensions: {
                            code: "GRAPH_TIER_REQUIRED",
                            requiredLevel: GRAPH_LEVEL.ORG,
                          },
                        },
                      );
                    }

                    await requireUserGraphLevel(
                      args.observer.id,
                      args.db,
                      GRAPH_LEVEL.ORG,
                    );

                    return true;
                  },
                );
              },
            [
              lambda,
              object,
              context,
              requireUserGraphLevel,
              GRAPH_LEVEL,
              GraphQLError,
            ],
          ),
        },
      },
    },
  };
});

export default PolyrepoGraphAccessPlugin;
