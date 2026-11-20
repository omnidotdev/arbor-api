import { and, eq } from "drizzle-orm";

import {
  organizationMemberTable,
  repositoryRedirectTable,
  repositoryTable,
} from "lib/db/schema";
import { invalidateRepositorySizeCache } from "lib/git";
import events from "lib/providers";

import type { dbPool } from "lib/db/db";

/** Result of moving a repository; `error` is null on success */
export interface MoveRepositoryResult {
  rowId: string | null;
  slug: string | null;
  /** Clone path owner (`<owner>/<slug>`) after the move */
  ownerUsername: string | null;
  /** The target workspace's slug, for links into Arbor */
  organizationSlug: string | null;
  /** Clone path owner before the move (still served as a redirect) */
  previousOwnerUsername: string | null;
  error: string | null;
}

export const moveFailure = (error: string): MoveRepositoryResult => ({
  rowId: null,
  slug: null,
  ownerUsername: null,
  organizationSlug: null,
  previousOwnerUsername: null,
  error,
});

export interface MoveRepositoryIntoArgs {
  db: typeof dbPool;
  repository: {
    id: string;
    slug: string;
    ownerId: string;
    visibility: "public" | "private";
    ownerUsername: string | null;
  };
  /** The member moving it, who becomes its owner */
  member: { id: string; username: string | null };
  /** Organization memberships to mirror for the member's later git access */
  memberships: Array<{ organizationId: string; roles: string[] }>;
  /** The organization the repository leaves (null for a personal repository) */
  sourceOrganizationId: string | null;
  /** The organization it moves into; null only for a dry run before it exists */
  target: { id: string; slug: string | null } | null;
  /** The target's slug, when the organization row does not exist yet */
  targetSlug?: string | null;
  dryRun: boolean;
  relocate: (owner: string, slug: string, newOwner: string) => Promise<boolean>;
  checkLimit: (
    organizationId: string,
    currentCount: number,
  ) => Promise<boolean>;
}

/**
 * Move a repository into an organization, the member moving it becoming its
 * owner. Callers have checked who may move it; this applies the move.
 *
 * The repository keeps its id, history and collaborators. A new owner changes
 * the storage and clone path (`{owner}/{slug}`), so the bare repository moves
 * on disk and moves back if the database write fails. The old path is kept as
 * a redirect (for clone, fetch and push, and for links into the old
 * workspace), and a repository that actually lives at a path always wins over
 * a redirect for it. A dry run makes every check and changes nothing
 */
export const moveRepositoryInto = async ({
  db,
  repository,
  member,
  memberships,
  sourceOrganizationId,
  target,
  targetSlug,
  dryRun,
  relocate,
  checkLimit,
}: MoveRepositoryIntoArgs): Promise<MoveRepositoryResult> => {
  const previousOwner = repository.ownerUsername;
  const newOwner = member.username;
  if (!previousOwner || !newOwner) return moveFailure("Invalid owner");

  // The member's own path must be free for the repository to move onto it
  if (member.id !== repository.ownerId) {
    const clash = await db.query.repositoryTable.findFirst({
      where: (table, { eq: eqOp, and: andOp }) =>
        andOp(
          eqOp(table.ownerId, member.id),
          eqOp(table.slug, repository.slug),
        ),
      columns: { id: true },
    });
    if (clash) {
      return moveFailure(
        "You already have a repository with this name. Rename it first, then move this one.",
      );
    }
  }

  // The slug must be free in the target workspace
  if (target) {
    const taken = await db.query.repositoryTable.findFirst({
      where: (table, { eq: eqOp, and: andOp }) =>
        andOp(
          eqOp(table.organizationId, target.id),
          eqOp(table.slug, repository.slug),
        ),
      columns: { id: true },
    });
    if (taken && taken.id !== repository.id) {
      return moveFailure(
        "A repository with this name already exists in that workspace",
      );
    }
  }

  // The private-repository limit governs the target like a new repository
  if (repository.visibility === "private" && target) {
    const privateCount = (
      await db.query.repositoryTable.findMany({
        where: (table, { eq: eqOp, and: andOp }) =>
          andOp(
            eqOp(table.organizationId, target.id),
            eqOp(table.visibility, "private"),
          ),
        columns: { id: true },
      })
    ).length;
    if (!(await checkLimit(target.id, privateCount))) {
      return moveFailure(
        "The target workspace has reached its plan's private repository limit",
      );
    }
  }

  const outcome = {
    rowId: repository.id,
    slug: repository.slug,
    ownerUsername: newOwner,
    organizationSlug: target?.slug ?? targetSlug ?? null,
    previousOwnerUsername: previousOwner,
    error: null,
  };

  if (dryRun || !target) return outcome;

  // Mirror memberships now, so the member's later git access resolves the
  // organizations without waiting for the next sign-in
  for (const { organizationId, roles } of memberships) {
    await db
      .insert(organizationMemberTable)
      .values({ userId: member.id, organizationId, roles })
      .onConflictDoUpdate({
        target: [
          organizationMemberTable.userId,
          organizationMemberTable.organizationId,
        ],
        set: { roles, syncedAt: new Date().toISOString() },
      });
  }

  const ownerChanges = previousOwner !== newOwner;
  if (
    ownerChanges &&
    !(await relocate(previousOwner, repository.slug, newOwner))
  ) {
    return moveFailure("Failed to move the repository");
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(repositoryTable)
        .set({
          ownerId: member.id,
          organizationId: target.id,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(repositoryTable.id, repository.id));

      // The new path is a real repository now: no redirect may claim it
      if (ownerChanges) {
        await tx
          .delete(repositoryRedirectTable)
          .where(
            and(
              eq(repositoryRedirectTable.ownerUsername, newOwner),
              eq(repositoryRedirectTable.slug, repository.slug),
            ),
          );
      }
      // Keep the old path (owner and workspace) leading to this repository
      await tx
        .insert(repositoryRedirectTable)
        .values({
          ownerUsername: previousOwner,
          slug: repository.slug,
          organizationId: sourceOrganizationId,
          repositoryId: repository.id,
        })
        .onConflictDoUpdate({
          target: [
            repositoryRedirectTable.ownerUsername,
            repositoryRedirectTable.slug,
          ],
          set: {
            repositoryId: repository.id,
            organizationId: sourceOrganizationId,
          },
        });
    });
  } catch (error) {
    // Put storage back where the unchanged row says it is
    if (ownerChanges) await relocate(newOwner, repository.slug, previousOwner);
    console.error("[arbor] repository transfer failed", error);
    return moveFailure("Failed to move the repository");
  }

  if (ownerChanges) {
    invalidateRepositorySizeCache(previousOwner, repository.slug);
  }

  events
    .emit({
      type: "arbor.repository.transferred",
      data: {
        repositoryId: repository.id,
        slug: repository.slug,
        fromOrganizationId: sourceOrganizationId,
        toOrganizationId: target.id,
        ownerId: member.id,
      },
      organizationId: target.id,
      subject: repository.id,
    })
    .catch((err) => console.warn("[arbor] Event emit failed", err));

  return outcome;
};
