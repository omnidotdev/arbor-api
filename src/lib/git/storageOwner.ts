import type { dbPool } from "lib/db/db";

/** The repository fields storage-owner resolution reads */
export interface StorageOwnerRepository {
  ownerId?: string | null;
  owner?: { username?: string | null } | null;
}

/**
 * Resolve the owner path a repository's git storage is keyed by.
 *
 * Bare repositories live at `{ownerUsername}/{slug}.git` for personal and
 * organization repositories alike: an organization repository is still stored
 * under the username of the member who owns it, never under the organization
 * slug (which lives in the IDP and can differ from any username). Every git
 * call site resolves its owner path here so none can address the wrong
 * directory. Uses the loaded `owner` relation when present, otherwise looks the
 * owner up by `ownerId`; null when no username can be found
 */
export const resolveStorageOwner = async (
  repository: StorageOwnerRepository,
  db: Pick<typeof dbPool, "query">,
): Promise<string | null> => {
  if (repository.owner?.username) return repository.owner.username;
  if (!repository.ownerId) return null;

  const ownerId = repository.ownerId;
  const owner = await db.query.userTable.findFirst({
    where: (table, { eq }) => eq(table.id, ownerId),
    columns: { username: true },
  });

  return owner?.username ?? null;
};
