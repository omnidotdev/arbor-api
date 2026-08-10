import { EXPORTABLE } from "graphile-export";
import { context, lambda, object } from "postgraphile/grafast";
import { extendSchema } from "postgraphile/utils";

import { discoverDependencies } from "lib/dependencies";

import type { FieldArgs } from "postgraphile/grafast";

/**
 * Custom mutation to reconcile a repository's dependency graph from its package
 * manifests. It reads `package.json` and `Cargo.toml` at the default branch,
 * resolves each dependency to another repository the owner holds (an edge) or an
 * external package, and replaces the repository's previous manifest-detected
 * rows. This is what makes the polyrepo graph self-maintaining, not hand-curated.
 *
 * The schema is built at boot with makeSchema, so the plan closes over
 * discoverDependencies directly. Authorization (write access to the repository)
 * lives in the service, so the MCP surface can share it without drift.
 */
const DependencyDiscoveryPlugin = extendSchema(() => {
  return {
    typeDefs: /* GraphQL */ `
      """
      Input for discovering a repository's dependencies from its manifest.
      """
      input DiscoverDependenciesInput {
        """
        The repository to scan.
        """
        repositoryId: UUID!
      }

      """
      Payload for the discoverDependencies mutation.
      """
      type DiscoverDependenciesPayload {
        """
        The number of internal repository-to-repository edges detected.
        """
        internalDependencies: Int

        """
        The number of external (non-Arbor) package dependencies detected.
        """
        externalDependencies: Int

        """
        A non-fatal reason discovery produced nothing (e.g. no manifest).
        """
        error: String
      }

      extend type Mutation {
        """
        Scan a repository's package manifest at its default branch and reconcile
        its dependency graph, replacing previously auto-detected dependencies.
        """
        discoverDependencies(
          input: DiscoverDependenciesInput!
        ): DiscoverDependenciesPayload
      }
    `,

    objects: {
      DiscoverDependenciesPayload: {
        plans: {
          internalDependencies: EXPORTABLE(
            (lambda) => ($payload: any) =>
              lambda($payload, (p) => (p as any)?.internalDependencies ?? null),
            [lambda],
          ),
          externalDependencies: EXPORTABLE(
            (lambda) => ($payload: any) =>
              lambda($payload, (p) => (p as any)?.externalDependencies ?? null),
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
          discoverDependencies: EXPORTABLE(
            (lambda, object, context, discoverDependencies) =>
              (_$root: any, fieldArgs: FieldArgs) => {
                const $input = fieldArgs.getRaw("input");
                const $db = context().get("db");
                const $observer = context().get("observer");

                return lambda(
                  object({ input: $input, db: $db, observer: $observer }),
                  async (args: any) =>
                    await discoverDependencies({
                      observer: args.observer,
                      db: args.db,
                      input: args.input,
                    }),
                );
              },
            [lambda, object, context, discoverDependencies],
          ),
        },
      },
    },
  };
});

export default DependencyDiscoveryPlugin;
