import { EXPORTABLE } from "graphile-export";
import { context, lambda, object } from "postgraphile/grafast";
import { extendSchema } from "postgraphile/utils";

import { repositoryBlastRadius } from "lib/dependencies";
import { GRAPH_LEVEL, requireGraphLevel } from "lib/entitlements";

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
            (
              lambda,
              object,
              context,
              repositoryBlastRadius,
              requireGraphLevel,
              GRAPH_LEVEL,
            ) =>
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
                  async (args: any) => {
                    // Blast radius is a paid graph capability (Team, level 2).
                    // graph_level is an ORGANIZATION entitlement (billing is
                    // per-org), so resolve the repository's owning organization
                    // and require the tier before running. A PERSONAL repository
                    // has no organizationId and resolves to the free tier (level
                    // 0), so blast radius is denied on it; revisit if
                    // personal-account billing is introduced. A GraphQLError
                    // with extensions.code GRAPH_TIER_REQUIRED is thrown when
                    // below the tier so the UI can prompt an upgrade (a plain
                    // Error would be masked by graphql-yoga)
                    const repo = await args.db.query.repositoryTable.findFirst({
                      columns: { organizationId: true },
                      where: (table: any, { eq }: any) =>
                        eq(table.id, args.repositoryId),
                    });

                    await requireGraphLevel(
                      repo?.organizationId ?? null,
                      GRAPH_LEVEL.BLAST_RADIUS,
                    );

                    return await repositoryBlastRadius({
                      observer: args.observer,
                      db: args.db,
                      input: { repositoryId: args.repositoryId },
                    });
                  },
                );
              },
            [
              lambda,
              object,
              context,
              repositoryBlastRadius,
              requireGraphLevel,
              GRAPH_LEVEL,
            ],
          ),
        },
      },
    },
  };
});

export default RepositoryBlastRadiusPlugin;
