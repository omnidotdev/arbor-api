import { EXPORTABLE } from "graphile-export";
import { context, lambda, object } from "postgraphile/grafast";
import { extendSchema } from "postgraphile/utils";

import { repositoryTable } from "lib/db/schema";
import { isWithinLimit } from "lib/entitlements";
import { repositoryService } from "lib/git";
import {
  FEATURE_KEYS,
  billingBypassOrgIds,
} from "lib/graphql/plugins/authorization/constants";

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
            (
              lambda,
              object,
              context,
              repositoryTable,
              repositoryService,
              isWithinLimit,
              FEATURE_KEYS,
              billingBypassOrgIds,
            ) =>
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

                    // Must be authenticated
                    if (!observer) {
                      return { repository: null, error: "Unauthorized" };
                    }

                    const {
                      name,
                      slug,
                      description,
                      visibility = "public",
                      defaultBranch = "master",
                      organizationId,
                    } = input;

                    // Validate membership and tier limits for organization repos
                    if (organizationId) {
                      const organization =
                        await db.query.organizationTable.findFirst({
                          where: (table: any, { eq }: any) =>
                            eq(table.id, organizationId),
                          with: {
                            repositories: true,
                          },
                        });

                      if (!organization) {
                        return {
                          repository: null,
                          error: "Organization not found",
                        };
                      }

                      // Check membership via IDP claims (from JWT)
                      const isMember = organizations?.some(
                        (org: { id: string }) =>
                          org.id === organization.idpOrganizationId,
                      );

                      if (!isMember) {
                        return { repository: null, error: "Unauthorized" };
                      }

                      // Check tier limits via Aether entitlements
                      const withinLimit = await isWithinLimit(
                        { organizationId },
                        FEATURE_KEYS.MAX_REPOSITORIES,
                        organization.repositories.length,
                        billingBypassOrgIds,
                      );

                      if (!withinLimit) {
                        return {
                          repository: null,
                          error:
                            "Maximum number of repositories reached for your plan",
                        };
                      }
                    }

                    // Insert the repository record
                    const [repository] = await db
                      .insert(repositoryTable)
                      .values({
                        name,
                        slug,
                        description,
                        visibility,
                        defaultBranch,
                        ownerId: observer.id,
                        organizationId: organizationId || null,
                      })
                      .returning();

                    if (!repository) {
                      return {
                        rowId: null,
                        slug: null,
                        ownerUsername: null,
                        organizationSlug: null,
                        error: "Failed to create repository",
                      };
                    }

                    // Fetch with relations to get owner slug
                    const fullRepository =
                      await db.query.repositoryTable.findFirst({
                        where: (table: any, { eq }: any) =>
                          eq(table.id, repository.id),
                        with: { owner: true, organization: true },
                      });

                    if (!fullRepository) {
                      return {
                        rowId: null,
                        slug: null,
                        ownerUsername: null,
                        organizationSlug: null,
                        error: "Failed to fetch repository",
                      };
                    }

                    const ownerSlug =
                      fullRepository.organization?.slug ??
                      fullRepository.owner?.username;

                    if (!ownerSlug) {
                      return {
                        rowId: null,
                        slug: null,
                        ownerUsername: null,
                        organizationSlug: null,
                        error: "Invalid owner",
                      };
                    }

                    // Initialize git storage
                    const success = await repositoryService.init(
                      ownerSlug,
                      fullRepository.slug,
                    );

                    if (!success) {
                      return {
                        rowId: null,
                        slug: null,
                        ownerUsername: null,
                        organizationSlug: null,
                        error: "Failed to initialize git repository",
                      };
                    }

                    return {
                      rowId: fullRepository.id,
                      slug: fullRepository.slug,
                      ownerUsername: fullRepository.owner?.username ?? null,
                      organizationSlug:
                        fullRepository.organization?.slug ?? null,
                      error: null,
                    };
                  },
                );
              },
            [
              lambda,
              object,
              context,
              repositoryTable,
              repositoryService,
              isWithinLimit,
              FEATURE_KEYS,
              billingBypassOrgIds,
            ],
          ),
        },
      },
    },
  };
});

export default RepositoryCreatePlugin;
