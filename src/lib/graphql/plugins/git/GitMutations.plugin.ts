import { EXPORTABLE } from "graphile-export";
import { context, lambda, object } from "postgraphile/grafast";
import { extendSchema } from "postgraphile/utils";

import { gitService, repositoryService } from "lib/git";

import type { FieldArgs } from "postgraphile/grafast";

/**
 * Git mutations plugin.
 *
 * Provides mutations for:
 * - initializeRepository: Initialize git storage after DB record created
 * - createRef: Create a new branch or tag
 * - deleteRef: Delete a branch or tag
 */
const GitMutationsPlugin = extendSchema((build) => {
  return {
    typeDefs: /* GraphQL */ `
      """
      Input for initializing a repository's git storage.
      """
      input InitializeRepositoryInput {
        """
        The repository ID.
        """
        repositoryId: UUID!
      }

      """
      Payload for initializeRepository mutation.
      """
      type InitializeRepositoryPayload {
        """
        Whether the initialization was successful.
        """
        success: Boolean!

        """
        The repository that was initialized.
        """
        repository: Repository

        """
        Error message if initialization failed.
        """
        error: String
      }

      """
      Input for creating a new ref.
      """
      input CreateRefInput {
        """
        The repository ID.
        """
        repositoryId: UUID!

        """
        The fully qualified ref name (e.g., "refs/heads/feature-branch").
        """
        name: String!

        """
        The SHA or ref to point to.
        """
        oid: String!
      }

      """
      Payload for createRef mutation.
      """
      type CreateRefPayload {
        """
        The created ref.
        """
        ref: Ref

        """
        Error message if creation failed.
        """
        error: String
      }

      """
      Input for deleting a ref.
      """
      input DeleteRefInput {
        """
        The repository ID.
        """
        repositoryId: UUID!

        """
        The fully qualified ref name (e.g., "refs/heads/feature-branch").
        """
        name: String!
      }

      """
      Payload for deleteRef mutation.
      """
      type DeleteRefPayload {
        """
        Whether the deletion was successful.
        """
        success: Boolean!

        """
        Error message if deletion failed.
        """
        error: String
      }

      extend type Mutation {
        """
        Initialize git storage for a repository.
        Called after the repository record is created in the database.
        """
        initializeRepository(
          input: InitializeRepositoryInput!
        ): InitializeRepositoryPayload

        """
        Create a new ref (branch or tag).
        """
        createRef(input: CreateRefInput!): CreateRefPayload

        """
        Delete a ref (branch or tag).
        """
        deleteRef(input: DeleteRefInput!): DeleteRefPayload
      }
    `,

    objects: {
      InitializeRepositoryPayload: {
        plans: {
          success: EXPORTABLE(
            (lambda) => ($payload: any) => {
              return lambda($payload, (p) => (p as any)?.success ?? false);
            },
            [lambda],
          ),
          repository: EXPORTABLE(
            (lambda) => ($payload: any) => {
              return lambda($payload, (p) => (p as any)?.repository ?? null);
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

      CreateRefPayload: {
        plans: {
          ref: EXPORTABLE(
            (lambda) => ($payload: any) => {
              return lambda($payload, (p) => (p as any)?.ref ?? null);
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

      DeleteRefPayload: {
        plans: {
          success: EXPORTABLE(
            (lambda) => ($payload: any) => {
              return lambda($payload, (p) => (p as any)?.success ?? false);
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
          initializeRepository: EXPORTABLE(
            (lambda, object, context, repositoryService) =>
              (_$root: any, fieldArgs: FieldArgs) => {
                const $input = fieldArgs.getRaw("input");
                const $db = context().get("db");
                const $observer = context().get("observer");

                return lambda(
                  object({ input: $input, db: $db, observer: $observer }),
                  async (args) => {
                    const { input, db, observer } = args as any;

                    if (!observer) {
                      return {
                        success: false,
                        repository: null,
                        error: "Unauthorized",
                      };
                    }

                    const { repositoryId } = input;

                    const repository = await db.query.repositoryTable.findFirst(
                      {
                        where: (table: any, { eq }: any) =>
                          eq(table.id, repositoryId),
                        with: {
                          owner: true,
                          organization: true,
                          collaborators: {
                            where: (table: any, { eq }: any) =>
                              eq(table.userId, observer.id),
                          },
                        },
                      },
                    );

                    if (!repository) {
                      return {
                        success: false,
                        repository: null,
                        error: "Repository not found",
                      };
                    }

                    const isOwner = repository.ownerId === observer.id;
                    const isAdmin = repository.collaborators?.some(
                      (c: any) => c.permission === "admin",
                    );

                    if (!isOwner && !isAdmin) {
                      return {
                        success: false,
                        repository: null,
                        error: "Unauthorized",
                      };
                    }

                    const ownerSlug =
                      repository.organization?.slug ||
                      repository.owner?.username;

                    if (!ownerSlug) {
                      return {
                        success: false,
                        repository: null,
                        error: "Invalid owner",
                      };
                    }

                    const success = await repositoryService.init(
                      ownerSlug,
                      repository.slug,
                    );

                    if (!success) {
                      return {
                        success: false,
                        repository: null,
                        error: "Failed to initialize repository",
                      };
                    }

                    return { success: true, repository, error: null };
                  },
                );
              },
            [lambda, object, context, repositoryService],
          ),

          createRef: EXPORTABLE(
            (lambda, object, context, repositoryService, gitService) =>
              (_$root: any, fieldArgs: FieldArgs) => {
                const $input = fieldArgs.getRaw("input");
                const $db = context().get("db");
                const $observer = context().get("observer");

                return lambda(
                  object({ input: $input, db: $db, observer: $observer }),
                  async (args) => {
                    const { input, db, observer } = args as any;

                    if (!observer) {
                      return { ref: null, error: "Unauthorized" };
                    }

                    const { repositoryId, name, oid } = input;

                    if (
                      !name.startsWith("refs/heads/") &&
                      !name.startsWith("refs/tags/")
                    ) {
                      return {
                        ref: null,
                        error:
                          "Ref name must start with refs/heads/ or refs/tags/",
                      };
                    }

                    const repository = await db.query.repositoryTable.findFirst(
                      {
                        where: (table: any, { eq }: any) =>
                          eq(table.id, repositoryId),
                        with: {
                          owner: true,
                          organization: true,
                          collaborators: {
                            where: (table: any, { eq }: any) =>
                              eq(table.userId, observer.id),
                          },
                        },
                      },
                    );

                    if (!repository) {
                      return { ref: null, error: "Repository not found" };
                    }

                    const isOwner = repository.ownerId === observer.id;
                    const hasWriteAccess = repository.collaborators?.some(
                      (c: any) =>
                        c.permission === "admin" || c.permission === "write",
                    );

                    if (!isOwner && !hasWriteAccess) {
                      return { ref: null, error: "Unauthorized" };
                    }

                    const ownerSlug =
                      repository.organization?.slug ||
                      repository.owner?.username;

                    if (!ownerSlug) {
                      return { ref: null, error: "Invalid owner" };
                    }

                    const exists = await repositoryService.exists(
                      ownerSlug,
                      repository.slug,
                    );
                    if (!exists) {
                      return { ref: null, error: "Repository not initialized" };
                    }

                    let prefix: string;
                    let shortName: string;

                    if (name.startsWith("refs/heads/")) {
                      prefix = "refs/heads/";
                      shortName = name.slice(11);
                    } else {
                      prefix = "refs/tags/";
                      shortName = name.slice(10);
                    }

                    const success = await gitService.createBranch(
                      ownerSlug,
                      repository.slug,
                      shortName,
                      oid,
                    );

                    if (!success) {
                      return { ref: null, error: "Failed to create ref" };
                    }

                    const sha = await gitService.resolveRef(
                      ownerSlug,
                      repository.slug,
                      name,
                    );

                    return {
                      ref: {
                        prefix,
                        name: shortName,
                        sha: sha || oid,
                        owner: ownerSlug,
                        repo: repository.slug,
                      },
                      error: null,
                    };
                  },
                );
              },
            [lambda, object, context, repositoryService, gitService],
          ),

          deleteRef: EXPORTABLE(
            (lambda, object, context, repositoryService, gitService) =>
              (_$root: any, fieldArgs: FieldArgs) => {
                const $input = fieldArgs.getRaw("input");
                const $db = context().get("db");
                const $observer = context().get("observer");

                return lambda(
                  object({ input: $input, db: $db, observer: $observer }),
                  async (args) => {
                    const { input, db, observer } = args as any;

                    if (!observer) {
                      return { success: false, error: "Unauthorized" };
                    }

                    const { repositoryId, name } = input;

                    if (
                      !name.startsWith("refs/heads/") &&
                      !name.startsWith("refs/tags/")
                    ) {
                      return {
                        success: false,
                        error:
                          "Ref name must start with refs/heads/ or refs/tags/",
                      };
                    }

                    const repository = await db.query.repositoryTable.findFirst(
                      {
                        where: (table: any, { eq }: any) =>
                          eq(table.id, repositoryId),
                        with: {
                          owner: true,
                          organization: true,
                          collaborators: {
                            where: (table: any, { eq }: any) =>
                              eq(table.userId, observer.id),
                          },
                        },
                      },
                    );

                    if (!repository) {
                      return { success: false, error: "Repository not found" };
                    }

                    const isOwner = repository.ownerId === observer.id;
                    const hasWriteAccess = repository.collaborators?.some(
                      (c: any) =>
                        c.permission === "admin" || c.permission === "write",
                    );

                    if (!isOwner && !hasWriteAccess) {
                      return { success: false, error: "Unauthorized" };
                    }

                    const ownerSlug =
                      repository.organization?.slug ||
                      repository.owner?.username;

                    if (!ownerSlug) {
                      return { success: false, error: "Invalid owner" };
                    }

                    const exists = await repositoryService.exists(
                      ownerSlug,
                      repository.slug,
                    );
                    if (!exists) {
                      return {
                        success: false,
                        error: "Repository not initialized",
                      };
                    }

                    const shortName = name.startsWith("refs/heads/")
                      ? name.slice(11)
                      : name.slice(10);

                    if (
                      name.startsWith("refs/heads/") &&
                      shortName === repository.defaultBranch
                    ) {
                      return {
                        success: false,
                        error: "Cannot delete the default branch",
                      };
                    }

                    const success = await gitService.deleteBranch(
                      ownerSlug,
                      repository.slug,
                      shortName,
                    );

                    if (!success) {
                      return { success: false, error: "Failed to delete ref" };
                    }

                    return { success: true, error: null };
                  },
                );
              },
            [lambda, object, context, repositoryService, gitService],
          ),
        },
      },
    },
  };
});

export default GitMutationsPlugin;
