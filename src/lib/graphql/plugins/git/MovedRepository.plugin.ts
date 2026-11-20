import { EXPORTABLE } from "graphile-export";
import { context, lambda, object } from "postgraphile/grafast";
import { extendSchema } from "postgraphile/utils";

import { resolveMovedRepository } from "lib/repository";

import type { FieldArgs } from "postgraphile/grafast";

/**
 * `movedRepository`: where a repository that moved away from a web path lives
 * now, so the app can redirect an old link after a transfer between
 * workspaces. See `resolveMovedRepository` for who gets an answer
 */
const MovedRepositoryPlugin = extendSchema(() => ({
  typeDefs: /* GraphQL */ `
    """
    Where a repository lives.
    """
    type RepositoryLocation {
      """
      The owning workspace's slug, or the owner's username.
      """
      ownerSlug: String!

      """
      The repository slug.
      """
      repoSlug: String!
    }

    extend type Query {
      """
      Where a repository that moved away from this path (an old workspace
      slug or username, and slug) lives now. Null when nothing moved away from
      it, a repository still lives there, or the caller may not read it.
      """
      movedRepository(ownerSlug: String!, repoSlug: String!): RepositoryLocation
    }
  `,
  objects: {
    Query: {
      plans: {
        movedRepository: EXPORTABLE(
          (lambda, object, context, resolveMovedRepository) =>
            (_$root: any, fieldArgs: FieldArgs) =>
              lambda(
                object({
                  ownerSlug: fieldArgs.getRaw("ownerSlug"),
                  repoSlug: fieldArgs.getRaw("repoSlug"),
                  db: context().get("db"),
                  observer: context().get("observer"),
                  organizations: context().get("organizations"),
                }),
                async (args: any) =>
                  await resolveMovedRepository({
                    ownerSlug: args.ownerSlug,
                    repoSlug: args.repoSlug,
                    observer: args.observer ?? null,
                    organizations: args.organizations ?? [],
                    db: args.db,
                  }),
              ),
          [lambda, object, context, resolveMovedRepository],
        ),
      },
    },
  },
}));

export default MovedRepositoryPlugin;
