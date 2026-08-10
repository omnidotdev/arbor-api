import { EXPORTABLE } from "graphile-export";
import { context, lambda, object } from "postgraphile/grafast";
import { extendSchema } from "postgraphile/utils";

import { repositoryBlastRadius } from "lib/dependencies";

import type { FieldArgs } from "postgraphile/grafast";

/**
 * Custom query exposing a repository's blast radius: the repositories that would
 * be affected by a change to it, following the dependency graph in reverse. This
 * is the "what breaks if this changes" view the graph exists to answer, for both
 * humans and agents scoping a cross-repo change.
 *
 * Visibility is enforced in the service (only edges and repositories the caller
 * may see participate, and an invisible root yields an empty list), so this
 * cannot leak a private repository through the graph.
 */
const RepositoryBlastRadiusPlugin = extendSchema(() => {
  return {
    typeDefs: /* GraphQL */ `
      """
      A repository affected by a change to another repository, with its shortest
      dependency distance from it.
      """
      type BlastRadiusRepository {
        """
        The affected repository's row id.
        """
        repositoryId: UUID

        """
        The affected repository's name.
        """
        name: String

        """
        The affected repository's slug.
        """
        slug: String

        """
        The owner username, for a personal repository.
        """
        ownerUsername: String

        """
        The organization slug, for an organization repository.
        """
        organizationSlug: String

        """
        Dependency distance from the changed repository (1 = a direct dependent).
        """
        depth: Int
      }

      extend type Query {
        """
        The repositories transitively affected by a change to the given
        repository, nearest first. Only repositories the caller may see appear.
        """
        repositoryBlastRadius(repositoryId: UUID!): [BlastRadiusRepository!]
      }
    `,

    objects: {
      BlastRadiusRepository: {
        plans: {
          repositoryId: EXPORTABLE(
            (lambda) => ($entry: any) =>
              lambda($entry, (e) => (e as any)?.repositoryId ?? null),
            [lambda],
          ),
          name: EXPORTABLE(
            (lambda) => ($entry: any) =>
              lambda($entry, (e) => (e as any)?.name ?? null),
            [lambda],
          ),
          slug: EXPORTABLE(
            (lambda) => ($entry: any) =>
              lambda($entry, (e) => (e as any)?.slug ?? null),
            [lambda],
          ),
          ownerUsername: EXPORTABLE(
            (lambda) => ($entry: any) =>
              lambda($entry, (e) => (e as any)?.ownerUsername ?? null),
            [lambda],
          ),
          organizationSlug: EXPORTABLE(
            (lambda) => ($entry: any) =>
              lambda($entry, (e) => (e as any)?.organizationSlug ?? null),
            [lambda],
          ),
          depth: EXPORTABLE(
            (lambda) => ($entry: any) =>
              lambda($entry, (e) => (e as any)?.depth ?? null),
            [lambda],
          ),
        },
      },

      Query: {
        plans: {
          repositoryBlastRadius: EXPORTABLE(
            (lambda, object, context, repositoryBlastRadius) =>
              (_$root: any, fieldArgs: FieldArgs) => {
                const $repositoryId = fieldArgs.getRaw("repositoryId");
                const $db = context().get("db");
                const $observer = context().get("observer");

                return lambda(
                  object({
                    repositoryId: $repositoryId,
                    db: $db,
                    observer: $observer,
                  }),
                  async (args: any) =>
                    await repositoryBlastRadius({
                      observer: args.observer,
                      db: args.db,
                      input: { repositoryId: args.repositoryId },
                    }),
                );
              },
            [lambda, object, context, repositoryBlastRadius],
          ),
        },
      },
    },
  };
});

export default RepositoryBlastRadiusPlugin;
