import { and, eq } from "drizzle-orm";

import { projectRepositoryTable } from "lib/db/schema";
import { gitService } from "lib/git";
import {
  parseProjectDescriptor,
  resolveDescriptorProjectIds,
} from "./projectDescriptor";

import type { dbPool } from "lib/db/db";

/** Membership rows written from the descriptor carry this source, so a re-scan replaces only them. */
const DETECTION_SOURCE = "descriptor";

/** The in-repo descriptor declaring the projects a repository belongs to. */
const DESCRIPTOR_PATH = "arbor.project.json";

export interface ReconcileProjectMembershipResult {
  linkedProjects: number;
  error: string | null;
}

/**
 * Whether the caller owns, or has write/admin on, a repository. Mirrors the
 * dependency-discovery gate; reconciling membership from the repository's own
 * descriptor requires the same write access.
 */
const hasWriteAccess = async (
  db: typeof dbPool,
  repositoryId: string,
  userId: string,
): Promise<boolean> => {
  const repository = await db.query.repositoryTable.findFirst({
    where: (table, { eq: equals }) => equals(table.id, repositoryId),
    with: {
      collaborators: {
        where: (table, { eq: equals }) => equals(table.userId, userId),
      },
    },
  });
  if (!repository) return false;
  const collaborator = repository.collaborators[0];
  return (
    repository.ownerId === userId ||
    collaborator?.permission === "write" ||
    collaborator?.permission === "admin"
  );
};

/**
 * Reconcile a repository's project memberships from its `arbor.project.json` at
 * the default branch: the repository is linked to each project it declares that
 * its owner or organization also holds. Previous descriptor-managed memberships
 * are cleared first, so removing a project from the file unlinks it, while
 * memberships added by hand (`detectionSource = manual`) are left untouched. A
 * declared project the owner does not hold is ignored, so a descriptor cannot
 * link a repository into a project outside its owner's scope.
 */
export const reconcileProjectMembership = async (args: {
  observer: { id: string } | null | undefined;
  db: typeof dbPool;
  input: { repositoryId: string };
}): Promise<ReconcileProjectMembershipResult> => {
  const { observer, db, input } = args;

  if (!observer) throw new Error("Unauthorized");
  if (!(await hasWriteAccess(db, input.repositoryId, observer.id)))
    throw new Error("Unauthorized");

  const repository = await db.query.repositoryTable.findFirst({
    where: (table, { eq: equals }) => equals(table.id, input.repositoryId),
    with: { owner: true, organization: true },
  });
  if (!repository) throw new Error("Repository not found");

  const ownerSlug =
    repository.organization?.slug ?? repository.owner?.username ?? null;
  if (!ownerSlug) return { linkedProjects: 0, error: null };

  const content = await gitService.getFileContent(
    ownerSlug,
    repository.slug,
    repository.defaultBranch,
    DESCRIPTOR_PATH,
  );
  if (content === null)
    return {
      linkedProjects: 0,
      error: "No arbor.project.json found on the default branch",
    };

  let declaredSlugs: string[];
  try {
    declaredSlugs = parseProjectDescriptor(content);
  } catch {
    return { linkedProjects: 0, error: "arbor.project.json is not valid JSON" };
  }

  // Candidate projects: those the same owner or organization holds. A declared
  // slug outside this set does not resolve, so it cannot be linked
  const candidates = (
    await db.query.projectTable.findMany({
      where: (table, { or, eq: equals }) =>
        repository.organizationId
          ? or(
              equals(table.ownerId, repository.ownerId),
              equals(table.organizationId, repository.organizationId),
            )
          : equals(table.ownerId, repository.ownerId),
      columns: { id: true, slug: true },
    })
  ).map((project) => ({ id: project.id, slug: project.slug }));

  const projectIds = resolveDescriptorProjectIds(declaredSlugs, candidates);

  await db.transaction(async (tx) => {
    await tx
      .delete(projectRepositoryTable)
      .where(
        and(
          eq(projectRepositoryTable.repositoryId, repository.id),
          eq(projectRepositoryTable.detectionSource, DETECTION_SOURCE),
        ),
      );

    if (projectIds.length > 0) {
      await tx
        .insert(projectRepositoryTable)
        .values(
          projectIds.map((projectId) => ({
            projectId,
            repositoryId: repository.id,
            detectionSource: DETECTION_SOURCE,
          })),
        )
        // a manual membership for the same pair wins; skip rather than dupe
        .onConflictDoNothing();
    }
  });

  return { linkedProjects: projectIds.length, error: null };
};
