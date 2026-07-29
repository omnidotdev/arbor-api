import { EXPORTABLE } from "graphile-export";
import { context, lambda, object } from "postgraphile/grafast";
import { extendSchema } from "postgraphile/utils";

import { createRepository } from "lib/repository";

import type { FieldArgs } from "postgraphile/grafast";

/**
 * Custom createRepository mutation plugin.
 *
 * This replaces the auto-generated createRepository mutation to ensure
 * the git repository is initialized on disk immediately after the
 * database record is created.
 *
 * We use extendSchema with lambda() because:
 * - wrapPlans sideEffect on $result doesn't guarantee execution order
 * - Grafast may tree-shake sideEffects if result isn't used in data flow
 * - lambda() executes all logic in a single step, guaranteeing order
 */
const RepositoryCreatePlugin = extendSchema(() => {
  return {
    typeDefs: /* GraphQL */ `
      """
      Input for creating a repository.
      """
      input CreateRepositoryWithGitInput {
        """
        The repository name.
        """
        name: String!

        """
        The repository slug (URL-friendly name).
        """
        slug: String!

        """
        Optional description.
        """
        description: String

        """
        Visibility (public or private). Defaults to public.
        """
        visibility: Visibility

        """
        Default branch name. Defaults to master.
        """
        defaultBranch: String

        """
        Organization ID if this is an organization repository.
        """
        organizationId: UUID
      }

      """
      Payload for createRepositoryWithGit mutation.
      """
      type CreateRepositoryWithGitPayload {
        """
        The created repository row ID.
        """
        rowId: UUID

        """
        The repository slug.
        """
        slug: String

        """
        The owner username (for personal repos).
        """
        ownerUsername: String

        """
        The organization slug (for org repos).
        """
        organizationSlug: String

        """
        Error message if creation failed.
        """
        error: String
      }

      extend type Mutation {
        """
        Create a repository and initialize git storage.
        This replaces the standard createRepository mutation to ensure
        the git repository is properly initialized on disk.
        """
        createRepositoryWithGit(
          input: CreateRepositoryWithGitInput!
        ): CreateRepositoryWithGitPayload
      }
    `,

    objects: {
      CreateRepositoryWithGitPayload: {
        plans: {
          rowId: EXPORTABLE(
            (lambda) => ($payload: any) => {
              return lambda($payload, (p) => (p as any)?.rowId ?? null);
            },
            [lambda],
          ),
          slug: EXPORTABLE(
            (lambda) => ($payload: any) => {
              return lambda($payload, (p) => (p as any)?.slug ?? null);
            },
            [lambda],
          ),
          ownerUsername: EXPORTABLE(
            (lambda) => ($payload: any) => {
              return lambda($payload, (p) => (p as any)?.ownerUsername ?? null);
            },
            [lambda],
          ),
          organizationSlug: EXPORTABLE(
            (lambda) => ($payload: any) => {
              return lambda(
                $payload,
                (p) => (p as any)?.organizationSlug ?? null,
              );
            },
            [lambda],
          ),
          error: EXPORTABLE(
            (lambda) => ($payload: any) => {
              return lambda($payload, (p) => (p as any)?.error ?? null);
            },
            [lambda],
          ),
        },
      },

      Mutation: {
        plans: {
          createRepositoryWithGit: EXPORTABLE(
            (lambda, object, context, createRepository) =>
              (_$root: any, fieldArgs: FieldArgs) => {
                const $input = fieldArgs.getRaw("input");
                const $db = context().get("db");
                const $observer = context().get("observer");
                const $organizations = context().get("organizations");

                return lambda(
                  object({
                    input: $input,
                    db: $db,
                    observer: $observer,
                    organizations: $organizations,
                  }),
                  async (args: any) => {
                    const { input, db, observer, organizations } = args;

                    // Shared creation path, also used by the MCP tool, so the
                    // two surfaces cannot drift on membership, entitlement, or
                    // storage initialization
                    return await createRepository({
                      observer,
                      organizations: organizations ?? [],
                      input,
                      db,
                    });
                  },
                );
              },
            [lambda, object, context, createRepository],
          ),
        },
      },
    },
  };
});

export default RepositoryCreatePlugin;
