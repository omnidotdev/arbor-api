import { asc, eq } from "drizzle-orm";

import { dbPool } from "lib/db/db";
import { changeTable, stackTable } from "lib/db/schema";
import { gitService, repositoryService } from "lib/git";

import type { SelectChange } from "lib/db/schema";

/**
 * Result of a mergeability computation for a single change.
 *
 * A change is mergeable only when every required verification check has passed;
 * blockingChecks lists the names of the required checks that are not yet passed.
 */
export interface Mergeability {
  mergeable: boolean;
  blockingChecks: string[];
}

/**
 * Why a merge could not proceed.
 *
 * These are stable, machine-readable reasons; the GraphQL layer maps them to a
 * generic user-facing message so no internal detail leaks.
 */
type MergeChangeErrorReason =
  | "not-found"
  | "not-open"
  | "not-mergeable"
  | "parent-unmerged"
  | "repository-unavailable"
  | "git-error";

/**
 * The shape of the merge that would land the change onto its stack base branch.
 *
 * - fast-forward: the base branch is an ancestor of the change commit (or the
 *   change is already contained), so landing only advances the base branch
 * - merge-commit: base and change have diverged, so landing needs a merge commit
 */
type MergeMode = "fast-forward" | "merge-commit";

/**
 * Outcome of attempting to merge a change.
 *
 * On success the change is landed on its base branch (a fast-forward or a merge
 * commit); recordedTargetOid is the resulting base tip. deferred is false when
 * the branch was advanced, and reserved as true for a future queue path that
 * only records intent.
 */
export type MergeChangeOutcome =
  | {
      ok: true;
      changeId: string;
      mode: MergeMode;
      recordedTargetOid: string;
      deferred: boolean;
    }
  | {
      ok: false;
      reason: MergeChangeErrorReason;
      blockingChecks?: string[];
    };

/**
 * Resolve the on-disk owner directory for a repository row.
 *
 * Bare repositories are always stored under the owning user's username, for
 * personal and organization repositories alike (organization slug identity
 * lives in the IDP, not the database), matching deleteRepositoryStorageById and
 * the Smart-HTTP routes. Returns null when the username cannot be resolved.
 */
async function resolveOwnerSlug(repository: {
  ownerId: string;
  owner?: { username?: string | null } | null;
}): Promise<string | null> {
  if (repository.owner?.username) return repository.owner.username;

  const owner = await dbPool.query.userTable.findFirst({
    where: (table, { eq }) => eq(table.id, repository.ownerId),
    columns: { username: true },
  });

  return owner?.username ?? null;
}

/**
 * Stack service: the backend operations for Arbor's stacked-change + merge model.
 *
 * Read operations (computeMergeability, getStackChanges) are pure database reads
 * and always safe. The merge operation is deliberately non-destructive: it never
 * force-updates, deletes or rewrites any existing branch or history, and records
 * merge intent under a namespaced ref rather than advancing the base branch (see
 * mergeChange).
 */
export const stackService = {
  /**
   * Compute whether a change is mergeable from its verification checks.
   *
   * Mergeable means every required check has status "passed"; blockingChecks
   * lists the required checks that are not passed. A change with no required
   * checks is vacuously mergeable. Pure database read, always safe.
   */
  async computeMergeability(changeId: string): Promise<Mergeability> {
    const checks = await dbPool.query.verificationCheckTable.findMany({
      where: (table, { eq }) => eq(table.changeId, changeId),
      columns: { name: true, status: true, required: true },
    });

    const blockingChecks = checks
      .filter((check) => check.required && check.status !== "passed")
      .map((check) => check.name);

    return { mergeable: blockingChecks.length === 0, blockingChecks };
  },

  /**
   * List a stack's changes in bottom-up order (by position).
   *
   * Each change carries its parentChangeId, so the caller can reconstruct the
   * stack's dependency graph (DAG) order. Pure database read, always safe.
   */
  async getStackChanges(stackId: string): Promise<SelectChange[]> {
    return dbPool.query.changeTable.findMany({
      where: (table, { eq }) => eq(table.stackId, stackId),
      orderBy: (table) => [asc(table.position)],
    });
  },

  /**
   * Merge a change onto its stack's base branch, safely.
   *
   * Preconditions, all enforced before any git access:
   * - the change exists and is still open
   * - computeMergeability passes (every required check has passed)
   * - the change is the bottom unmerged change of its stack (its parent is null
   *   or already merged), so the stack lands in dependency order
   *
   * Git behaviour (non-destructive by design): the change commit is compared
   * against the base branch tip with the existing git helpers (resolveRef +
   * getMergeBase) to classify the landing as a fast-forward or a merge-commit,
   * then the intent is recorded as a NEW namespaced ref
   * (refs/arbor/merge-intent/{changeId}) pointing at the change commit. The
   * actual base-branch ref advance is DEFERRED and never performed here: arbor
   * serves live repositories that auto-deploy on branch updates, so advancing a
   * user branch (even a fast-forward) is left to the controlled merge-queue path
   * rather than done as a side effect of this call. Nothing is force-updated,
   * deleted or rewritten, so this can never corrupt a repository.
   *
   * On success the change status transitions to "merged" and, when it was the
   * stack's last open change, the stack status transitions to "merged". Any git
   * failure is caught and surfaced as a typed reason, never thrown.
   */
  async mergeChange(
    changeId: string,
    actorUserId: string,
  ): Promise<MergeChangeOutcome> {
    const change = await dbPool.query.changeTable.findFirst({
      where: (table, { eq }) => eq(table.id, changeId),
      with: {
        stack: true,
        repository: { with: { owner: true } },
      },
    });

    if (!change?.stack || !change.repository) {
      return { ok: false, reason: "not-found" };
    }

    if (change.status !== "open") {
      return { ok: false, reason: "not-open" };
    }

    // Gate on required verification checks
    const mergeability = await this.computeMergeability(changeId);
    if (!mergeability.mergeable) {
      return {
        ok: false,
        reason: "not-mergeable",
        blockingChecks: mergeability.blockingChecks,
      };
    }

    // Only the bottom unmerged change may land: its parent must be absent or
    // already merged, so the stack lands in dependency order
    if (change.parentChangeId) {
      const parent = await dbPool.query.changeTable.findFirst({
        where: (table, { eq }) => eq(table.id, change.parentChangeId as string),
        columns: { status: true },
      });
      if (parent?.status !== "merged") {
        return { ok: false, reason: "parent-unmerged" };
      }
    }

    // The change must carry a commit to land
    const headOid = change.commitSha;
    if (!headOid) {
      return { ok: false, reason: "git-error" };
    }

    const ownerSlug = await resolveOwnerSlug(change.repository);
    if (!ownerSlug) {
      return { ok: false, reason: "repository-unavailable" };
    }
    const repoSlug = change.repository.slug;

    const exists = await repositoryService.exists(ownerSlug, repoSlug);
    if (!exists) {
      return { ok: false, reason: "repository-unavailable" };
    }

    // Verify the base branch resolves before attempting the landing
    const baseBranch = change.stack.baseBranch;
    const baseTip = await gitService.resolveRef(
      ownerSlug,
      repoSlug,
      `refs/heads/${baseBranch}`,
    );
    if (!baseTip) {
      return { ok: false, reason: "repository-unavailable" };
    }

    // Attribute the merge to the acting user
    const actor = await dbPool.query.userTable.findFirst({
      where: (table, { eq }) => eq(table.id, actorUserId),
      columns: { name: true, email: true, username: true },
    });
    const author = {
      name: actor?.name ?? actor?.username ?? "Arbor",
      email: actor?.email ?? "merge@arbor.omni.dev",
    };

    // Land the change onto the base branch. This only advances the branch
    // forward (fast-forward or a merge commit) and never rewrites history
    const merged = await gitService.mergeChangeIntoBranch(
      ownerSlug,
      repoSlug,
      headOid,
      baseBranch,
      author,
      `Merge change: ${change.title}`,
    );
    if (!merged.sha) {
      return { ok: false, reason: "git-error" };
    }

    const mode: MergeMode =
      merged.mode === "merge-commit" ? "merge-commit" : "fast-forward";

    // Transition the change to merged, and the stack too when this was its last
    // open change
    const now = new Date().toISOString();
    await dbPool
      .update(changeTable)
      .set({ status: "merged", updatedAt: now })
      .where(eq(changeTable.id, changeId));

    const remainingOpen = await dbPool.query.changeTable.findFirst({
      where: (table, { and, eq, ne }) =>
        and(
          eq(table.stackId, change.stackId),
          ne(table.status, "merged"),
          ne(table.status, "abandoned"),
        ),
      columns: { id: true },
    });

    if (!remainingOpen) {
      await dbPool
        .update(stackTable)
        .set({ status: "merged", updatedAt: now })
        .where(eq(stackTable.id, change.stackId));
    } else {
      await dbPool
        .update(stackTable)
        .set({ updatedAt: now })
        .where(eq(stackTable.id, change.stackId));
    }

    return {
      ok: true,
      changeId,
      mode,
      recordedTargetOid: merged.sha,
      deferred: false,
    };
  },
};
