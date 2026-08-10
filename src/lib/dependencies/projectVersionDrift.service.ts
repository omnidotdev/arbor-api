import { eq, inArray } from "drizzle-orm";

import {
  externalDependencyTable,
  organizationMemberTable,
} from "lib/db/schema";
import { computeVersionDrift } from "./versionDrift";

import type { dbPool } from "lib/db/db";

/**
 * One (package, version, repository) cell of a project's version-drift view,
 * flattened so the client can group it into a heatmap. Only packages a project's
 * repositories depend on at more than one version appear.
 */
export interface VersionDriftEntry {
  packageManager: string;
  packageName: string;
  versionConstraint: string | null;
  repositoryId: string;
  name: string;
  slug: string;
  ownerUsername: string | null;
  organizationSlug: string | null;
}

/**
 * The version drift among a project's repositories: external packages depended
 * on at inconsistent versions, with the repositories on each version.
 *
 * Scoped to what the caller may see. A project the caller cannot see, or a
 * member repository they cannot see, is excluded, so drift never reveals a
 * private repository (the same both-ends rule the graph reads use).
 */
export const projectVersionDrift = async (args: {
  observer: { id: string } | null | undefined;
  db: typeof dbPool;
  input: { projectId: string };
}): Promise<VersionDriftEntry[]> => {
  const { observer, db, input } = args;
  const userId = observer?.id ?? null;
  if (!userId) return [];

  const memberOrgIds = (
    await db
      .select({ id: organizationMemberTable.organizationId })
      .from(organizationMemberTable)
      .where(eq(organizationMemberTable.userId, userId))
  ).map((row) => row.id);

  // The project must be visible to the caller: owned by them, or in one of their
  // organizations. There is no public project
  const project = await db.query.projectTable.findFirst({
    where: (table, { eq: equals }) => equals(table.id, input.projectId),
    columns: { id: true, ownerId: true, organizationId: true },
  });
  if (!project) return [];
  const projectVisible =
    project.ownerId === userId ||
    (project.organizationId !== null &&
      memberOrgIds.includes(project.organizationId));
  if (!projectVisible) return [];

  // Member repositories the caller may also see (public, owned, in one of their
  // organizations, or collaborated on), so a private member never leaks
  const members = await db.query.projectRepositoryTable.findMany({
    where: (table, { eq: equals }) => equals(table.projectId, project.id),
    columns: { repositoryId: true },
    with: {
      repository: {
        columns: {
          id: true,
          name: true,
          slug: true,
          visibility: true,
          ownerId: true,
          organizationId: true,
        },
        with: {
          owner: { columns: { username: true } },
          organization: { columns: { slug: true } },
          collaborators: {
            where: (table, { eq: equals }) => equals(table.userId, userId),
            columns: { userId: true },
          },
        },
      },
    },
  });

  const visibleRepos = members
    .map((member) => member.repository)
    .filter((repo): repo is NonNullable<typeof repo> => {
      if (!repo) return false;
      return (
        repo.visibility === "public" ||
        repo.ownerId === userId ||
        (repo.organizationId !== null &&
          memberOrgIds.includes(repo.organizationId)) ||
        repo.collaborators.length > 0
      );
    });

  const byId = new Map(visibleRepos.map((repo) => [repo.id, repo]));
  const repoIds = [...byId.keys()];
  if (repoIds.length === 0) return [];

  const rows = await db
    .select({
      repositoryId: externalDependencyTable.repositoryId,
      packageManager: externalDependencyTable.packageManager,
      packageName: externalDependencyTable.packageName,
      versionConstraint: externalDependencyTable.versionConstraint,
    })
    .from(externalDependencyTable)
    .where(inArray(externalDependencyTable.repositoryId, repoIds));

  const entries: VersionDriftEntry[] = [];
  for (const pkg of computeVersionDrift(rows)) {
    for (const version of pkg.versions) {
      for (const repositoryId of version.repositoryIds) {
        const repo = byId.get(repositoryId);
        if (!repo) continue;
        entries.push({
          packageManager: pkg.packageManager,
          packageName: pkg.packageName,
          versionConstraint: version.versionConstraint,
          repositoryId,
          name: repo.name,
          slug: repo.slug,
          ownerUsername: repo.owner?.username ?? null,
          organizationSlug: repo.organization?.slug ?? null,
        });
      }
    }
  }
  return entries;
};
