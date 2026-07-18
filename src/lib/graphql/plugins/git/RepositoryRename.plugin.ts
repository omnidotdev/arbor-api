import { eq } from "drizzle-orm";
import { context, lambda, object } from "postgraphile/grafast";
import { extendSchema } from "postgraphile/utils";

import { repositoryTable } from "lib/db/schema";
import { repositoryService } from "lib/git";
import { getOwnerSlug } from "./GitTypes.plugin";

import type { ExecutableStep, FieldArgs } from "postgraphile/grafast";

/**
 * Slugs are used to build the on-disk storage path
 * ({repositoriesPath}/{owner}/{slug}.git), so a slug must be a plain
 * URL-friendly identifier and can never contain a path separator or traversal
 * segment. Validate at the boundary before it ever reaches the filesystem.
 */
const SLUG_PATTERN = /^[a-z0-9][a-z0-9._-]*$/i;

/** Plan that reads a property off a plain object step */
const prop =
  (key: string, fallback: unknown = null) =>
  ($obj: ExecutableStep) =>
    lambda($obj, (obj) => (obj as Record<string, unknown>)?.[key] ?? fallback);

/**
 * Custom renameRepository mutation plugin.
 *
 * A repository's on-disk bare storage is keyed by slug, so the generic
 * updateRepository mutation can change the slug in the database while leaving
 * the storage stranded at the old path. This mutation keeps the two in lockstep:
 * it updates the row and moves the storage as a single transactional operation.
 *
 * Ordering and rollback: the database row is updated first, then the storage is
 * moved. The unique (owner, slug) constraint is the authoritative guard against
 * a name collision, so updating first means the most likely failure (another
 * repository already owns newSlug) is rejected by the database before the
 * filesystem is ever touched, needing no cleanup. Only a filesystem failure
 * after a committed row update requires a rollback, which is a single reverse
 * update restoring the original slug and name.
 *
 * The schema is built at boot with makeSchema, so plans close over
 * repositoryService and the Drizzle table directly without EXPORTABLE.
 */
const RepositoryRenamePlugin = extendSchema(() => {
  return {
    typeDefs: /* GraphQL */ `
      """
      Input for renaming a repository.
      """
      input RenameRepositoryInput {
        """
        The repository row ID.
        """
        rowId: UUID!

        """
        The new slug (URL-friendly name). Moves the on-disk storage.
        """
        newSlug: String!

        """
        Optional new display name. The name is left unchanged when omitted.
        """
        newName: String
      }

      """
      Payload for renameRepository mutation.
      """
      type RenameRepositoryPayload {
        """
        The renamed repository.
        """
        repository: Repository

        """
        Error message if the rename failed.
        """
        error: String
      }

      extend type Mutation {
        """
        Rename a repository, moving its on-disk git storage to match the new
        slug so the database row and storage never diverge. Requires the
        repository owner or an admin collaborator.
        """
        renameRepository(input: RenameRepositoryInput!): RenameRepositoryPayload
      }
    `,

    objects: {
      RenameRepositoryPayload: {
        plans: {
          repository: prop("repository"),
          error: prop("error"),
        },
      },

      Mutation: {
        plans: {
          renameRepository(_$root: ExecutableStep, fieldArgs: FieldArgs) {
            const $input = fieldArgs.getRaw("input");
            const $db = context().get("db");
            const $observer = context().get("observer");

            return lambda(
              object({ input: $input, db: $db, observer: $observer }),
              async (args) => {
                const { input, db, observer } = args as {
                  input: {
                    rowId: string;
                    newSlug: string;
                    newName?: string | null;
                  };
                  db: any;
                  observer: { id: string } | null;
                };

                if (!observer) {
                  return { repository: null, error: "Unauthorized" };
                }

                const { rowId, newSlug, newName } = input;

                // Validate the slug at the boundary before it reaches the
                // filesystem
                if (!SLUG_PATTERN.test(newSlug)) {
                  return { repository: null, error: "Invalid slug" };
                }

                const repository = await db.query.repositoryTable.findFirst({
                  where: (table: any, { eq }: any) => eq(table.id, rowId),
                  with: { owner: true, organization: true },
                });

                if (!repository) {
                  return { repository: null, error: "Repository not found" };
                }

                const owner = await getOwnerSlug(repository, db);

                if (!owner) {
                  return { repository: null, error: "Invalid owner" };
                }

                // Unchanged slug with no name change is a no-op success
                if (repository.slug === newSlug && !newName) {
                  return { repository, error: null };
                }

                // Enforce the unique (owner, slug) constraint up front so a
                // clean error is returned rather than a raw database violation.
                // Scope the check to the same owner the on-disk constraint uses
                // (organization for org repos, otherwise the owning user)
                if (repository.slug !== newSlug) {
                  const collision = await db.query.repositoryTable.findFirst({
                    where: (table: any, { and, eq, ne }: any) =>
                      and(
                        eq(table.slug, newSlug),
                        ne(table.id, rowId),
                        repository.organizationId
                          ? eq(table.organizationId, repository.organizationId)
                          : eq(table.ownerId, repository.ownerId),
                      ),
                  });

                  if (collision) {
                    return {
                      repository: null,
                      error: "A repository with that slug already exists",
                    };
                  }
                }

                const oldSlug = repository.slug;
                const oldName = repository.name;
                const oldUpdatedAt = repository.updatedAt;

                // Update the row first: the database unique constraint is the
                // authoritative collision guard, so a rejected update never
                // touches the filesystem
                try {
                  await db
                    .update(repositoryTable)
                    .set({
                      slug: newSlug,
                      ...(newName ? { name: newName } : {}),
                      updatedAt: new Date().toISOString(),
                    })
                    .where(eq(repositoryTable.id, rowId));
                } catch {
                  return {
                    repository: null,
                    error: "A repository with that slug already exists",
                  };
                }

                // Move the storage. A slug change moves the bare directory; a
                // name-only change leaves the slug (and path) untouched
                if (oldSlug !== newSlug) {
                  const moved = await repositoryService.rename(
                    owner,
                    oldSlug,
                    newSlug,
                  );

                  if (!moved) {
                    // Roll back the committed row so it never points at a path
                    // that was not moved
                    await db
                      .update(repositoryTable)
                      .set({
                        slug: oldSlug,
                        name: oldName,
                        updatedAt: oldUpdatedAt,
                      })
                      .where(eq(repositoryTable.id, rowId));

                    return {
                      repository: null,
                      error: "Failed to rename repository storage",
                    };
                  }
                }

                const updated = await db.query.repositoryTable.findFirst({
                  where: (table: any, { eq }: any) => eq(table.id, rowId),
                  with: { owner: true, organization: true },
                });

                return { repository: updated ?? repository, error: null };
              },
            );
          },
        },
      },
    },
  };
});

export default RepositoryRenamePlugin;
