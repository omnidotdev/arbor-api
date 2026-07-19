import { asc, eq, sql } from "drizzle-orm";

import { dbPool } from "lib/db/db";
import { mergeQueueEntryTable } from "lib/db/schema";
import { stackService } from "lib/stack";

/**
 * Why an enqueue could not proceed.
 *
 * Stable, machine-readable reasons; the GraphQL layer maps them to a generic
 * user-facing message so no internal detail leaks.
 */
type EnqueueStackErrorReason = "stack-not-found";

/**
 * Outcome of enqueuing a stack onto the merge queue.
 *
 * On success entryId is the queue entry for the stack; alreadyQueued is true
 * when an active entry already existed (the call is idempotent) and false when a
 * new entry was inserted.
 */
export type EnqueueStackOutcome =
  | { ok: true; entryId: string; alreadyQueued: boolean }
  | { ok: false; reason: EnqueueStackErrorReason };

/**
 * How a single queue entry ended after one processing pass.
 *
 * - merged: every open change of the entry's stack landed, entry marked merged
 * - blocked: a change's gate was not green or an outcome was not ok, so the
 *   entry is left queued for a later pass (never evicted here)
 * - skipped: the entry is not a stack entry, so this serial processor left it
 *   untouched
 */
type EntryProcessStatus = "merged" | "blocked" | "skipped";

/**
 * Per-entry result of a processing pass.
 *
 * mergedChangeIds lists the changes that landed during this pass (bottom-up).
 * When status is blocked, detail is a generic reason and blockingChecks lists
 * the required checks that were not yet passed, when the block was a gate.
 */
interface EntryProcessResult {
  entryId: string;
  stackId: string | null;
  status: EntryProcessStatus;
  mergedChangeIds: string[];
  detail?: string;
  blockingChecks?: string[];
}

/**
 * Summary of a full processQueue pass over a repository's queued entries.
 */
export interface ProcessQueueOutcome {
  ok: true;
  repositoryId: string;
  results: EntryProcessResult[];
}

/**
 * States that keep a queue entry active (still occupying the queue).
 *
 * An entry in one of these states must not be duplicated when enqueuing, which
 * is what makes enqueueStack idempotent.
 */
const ACTIVE_ENTRY_STATES = ["queued", "testing", "optimistic"] as const;

/**
 * Merge queue service: the safe serialization point for landing stacks.
 *
 * This service never advances any git ref itself. Every landing goes through
 * stackService.mergeChange, which is the single non-destructive merge path
 * (verification gate + bottom-of-stack ordering + forward-only branch advance,
 * never throwing). The processor here only sequences those calls and records
 * queue state, so it can never corrupt a repository.
 *
 * The current processor is a plain serial loop. Speculative batching and
 * bisection (the merge_batch model) are a deliberate follow-up and not yet
 * implemented.
 */
export const mergeQueueService = {
  /**
   * Enqueue a stack for merging, idempotently.
   *
   * Inserts a merge_queue_entry for the stack in state "queued" at the end of
   * the repository's queue (position = current max position for the repo + 1),
   * with targetBranch set to the stack's base branch. If the stack already has
   * an active entry (queued, testing or optimistic, i.e. not merged or evicted),
   * that existing entry is returned instead of inserting a duplicate. Never
   * throws; returns a typed outcome.
   */
  async enqueueStack(
    stackId: string,
    _actorUserId: string,
  ): Promise<EnqueueStackOutcome> {
    const stack = await dbPool.query.stackTable.findFirst({
      where: (table, { eq }) => eq(table.id, stackId),
      columns: { id: true, repositoryId: true, baseBranch: true },
    });

    if (!stack) return { ok: false, reason: "stack-not-found" };

    // Idempotency: reuse any still-active entry for this stack
    const existing = await dbPool.query.mergeQueueEntryTable.findFirst({
      where: (table, { and, eq, inArray }) =>
        and(
          eq(table.stackId, stackId),
          inArray(table.state, [...ACTIVE_ENTRY_STATES]),
        ),
      columns: { id: true },
    });

    if (existing)
      return { ok: true, entryId: existing.id, alreadyQueued: true };

    // Append to the end of this repository's queue
    const [maxRow] = await dbPool
      .select({
        maxPosition: sql<number | null>`max(${mergeQueueEntryTable.position})`,
      })
      .from(mergeQueueEntryTable)
      .where(eq(mergeQueueEntryTable.repositoryId, stack.repositoryId));

    const position = Number(maxRow?.maxPosition ?? -1) + 1;

    const [inserted] = await dbPool
      .insert(mergeQueueEntryTable)
      .values({
        repositoryId: stack.repositoryId,
        stackId,
        state: "queued",
        position,
        targetBranch: stack.baseBranch,
      })
      .returning({ id: mergeQueueEntryTable.id });

    if (!inserted) return { ok: false, reason: "stack-not-found" };

    return { ok: true, entryId: inserted.id, alreadyQueued: false };
  },

  /**
   * Process a repository's queue serially, landing what it safely can.
   *
   * Takes the repository's queued entries ordered by position ascending and, for
   * each stack entry, lands its still-open changes bottom-up by calling
   * stackService.mergeChange in order. It stops working an entry at the first
   * change whose gate is not green, or on any non-ok outcome, and leaves that
   * entry queued (a not-yet-green gate is never an eviction). When every open
   * change of the stack has landed, the entry is marked "merged". Entries that
   * are not stack entries are left untouched (skipped). Never throws; returns a
   * per-entry summary.
   */
  async processQueue(
    repositoryId: string,
    actorUserId: string,
  ): Promise<ProcessQueueOutcome> {
    const entries = await dbPool.query.mergeQueueEntryTable.findMany({
      where: (table, { and, eq }) =>
        and(eq(table.repositoryId, repositoryId), eq(table.state, "queued")),
      orderBy: (table) => [asc(table.position)],
      columns: { id: true, stackId: true },
    });

    const results: EntryProcessResult[] = [];

    for (const entry of entries) {
      if (!entry.stackId) {
        // Only stack entries are handled by this serial processor; pull request
        // entries are a bridge left for a later pass
        results.push({
          entryId: entry.id,
          stackId: null,
          status: "skipped",
          mergedChangeIds: [],
          detail: "Not a stack entry",
        });
        continue;
      }

      const changes = await stackService.getStackChanges(entry.stackId);
      const mergedChangeIds: string[] = [];
      let blocked = false;
      let blockDetail: string | undefined;
      let blockingChecks: string[] | undefined;

      for (const change of changes) {
        // Already-landed or dropped changes do not block the entry
        if (change.status === "merged" || change.status === "abandoned") {
          continue;
        }

        const outcome = await stackService.mergeChange(change.id, actorUserId);

        if (outcome.ok) {
          mergedChangeIds.push(change.id);
          continue;
        }

        // First change that will not land: stop the entry and leave it queued.
        // A merely-not-yet-green gate is not an eviction; the entry is retried
        // on a later pass
        blocked = true;
        blockDetail = mergeBlockDetail(outcome.reason);
        blockingChecks = outcome.blockingChecks;
        break;
      }

      if (blocked) {
        results.push({
          entryId: entry.id,
          stackId: entry.stackId,
          status: "blocked",
          mergedChangeIds,
          detail: blockDetail,
          blockingChecks,
        });
        continue;
      }

      // Every open change landed: retire the entry
      await dbPool
        .update(mergeQueueEntryTable)
        .set({ state: "merged", updatedAt: new Date().toISOString() })
        .where(eq(mergeQueueEntryTable.id, entry.id));

      results.push({
        entryId: entry.id,
        stackId: entry.stackId,
        status: "merged",
        mergedChangeIds,
      });
    }

    return { ok: true, repositoryId, results };
  },
};

/**
 * Map a merge failure reason to a generic, queue-facing detail string.
 *
 * Reasons are stable and machine-readable server-side; the summary only ever
 * carries a generic explanation so no internal detail leaks.
 */
function mergeBlockDetail(reason: string): string {
  switch (reason) {
    case "not-mergeable":
      return "Waiting on required checks";
    case "parent-unmerged":
      return "Waiting on the change below to land";
    case "not-open":
      return "Change is no longer open";
    case "repository-unavailable":
      return "Repository is not available";
    default:
      return "Change could not be landed yet";
  }
}
