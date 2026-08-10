import { and, eq, inArray } from "drizzle-orm";

import {
  organizationMemberTable,
  repositoryCollaboratorTable,
  repositoryRelationshipTable,
} from "lib/db/schema";
import { computeBlastRadius } from "./blastRadius";

import type { dbPool } from "lib/db/db";

/** An affected repository, shaped for output with its shortest dependency distance. */
export interface BlastRadiusRepository {
  repositoryId: string;
  name: string;
  slug: string;
  ownerUsername: string | null;
  organizationSlug: string | null;
  depth: number;
}

/**
 * The repositories transitively affected by a change to a repository: everything
 * that depends on it, directly or through a chain, ordered nearest first.
 *
 * Only edges and repositories the caller may see participate, so a private
 * repository never leaks through the graph (the same both-ends rule the graph
 * reads use). A root the caller cannot see resolves to an empty list, so its
 * existence is not revealed.
 */
export const repositoryBlastRadius = async (args: {
  observer: { id: string } | null | undefined;
  db: typeof dbPool;
  input: { repositoryId: string };
}): Promise<BlastRadiusRepository[]> => {
  const { observer, db, input } = args;
  const userId = observer?.id ?? null;

  // Organizations and collaborations that widen what the caller may see
  const orgIds = userId
    ? (
        await db
          .select({ id: organizationMemberTable.organizationId })
          .from(organizationMemberTable)
          .where(eq(organizationMemberTable.userId, userId))
      ).map((row) => row.id)
    : [];
  const collaboratorRepoIds = userId
    ? (
        await db
          .select({ id: repositoryCollaboratorTable.repositoryId })
          .from(repositoryCollaboratorTable)
          .where(eq(repositoryCollaboratorTable.userId, userId))
      ).map((row) => row.id)
    : [];

  // Every repository visible to the caller: public, owned, in one of their
  // organizations, or collaborated on. This is the same visibility the graph
  // read wrappers enforce, applied here so the traversal cannot cross into a
  // repository the caller may not see
  const visibleRepositories = await db.query.repositoryTable.findMany({
    columns: { id: true, name: true, slug: true },
    with: {
      owner: { columns: { username: true } },
      organization: { columns: { slug: true } },
    },
    where: (table, { or, eq: equals, inArray: within }) =>
      or(
        equals(table.visibility, "public"),
        userId ? equals(table.ownerId, userId) : undefined,
        orgIds.length ? within(table.organizationId, orgIds) : undefined,
        collaboratorRepoIds.length
          ? within(table.id, collaboratorRepoIds)
          : undefined,
      ),
  });

  const byId = new Map(visibleRepositories.map((repo) => [repo.id, repo]));

  // A root the caller cannot see is reported as no impact, so its existence and
  // its dependents are not revealed
  if (!byId.has(input.repositoryId)) return [];

  const visibleIds = [...byId.keys()];
  if (visibleIds.length === 0) return [];

  // Only edges where both ends are visible, matching the both-ends graph rule
  const edges = await db
    .select({
      sourceRepositoryId: repositoryRelationshipTable.sourceRepositoryId,
      targetRepositoryId: repositoryRelationshipTable.targetRepositoryId,
    })
    .from(repositoryRelationshipTable)
    .where(
      and(
        inArray(repositoryRelationshipTable.sourceRepositoryId, visibleIds),
        inArray(repositoryRelationshipTable.targetRepositoryId, visibleIds),
      ),
    );

  const affected: BlastRadiusRepository[] = [];
  for (const { repositoryId, depth } of computeBlastRadius(
    edges,
    input.repositoryId,
  )) {
    const repo = byId.get(repositoryId);
    if (!repo) continue;
    affected.push({
      repositoryId,
      name: repo.name,
      slug: repo.slug,
      ownerUsername: repo.owner?.username ?? null,
      organizationSlug: repo.organization?.slug ?? null,
      depth,
    });
  }

  affected.sort((a, b) => a.depth - b.depth || a.name.localeCompare(b.name));
  return affected;
};
