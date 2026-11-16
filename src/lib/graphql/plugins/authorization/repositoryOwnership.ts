/**
 * Whether a repository patch tries to change who owns the repository.
 *
 * `ownerId` and `organizationId` decide who controls a repository and whose
 * members can read it, so changing either is a transfer, not an edit. A key
 * that is present at all counts, even set to its current value or to null:
 * moving an organization repository back to personal is a transfer too
 */
export const repositoryPatchChangesOwnership = (patch: unknown): boolean => {
  if (!patch || typeof patch !== "object") return false;

  return "ownerId" in patch || "organizationId" in patch;
};
