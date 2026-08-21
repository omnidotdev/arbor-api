import { and, eq, inArray, sql } from "drizzle-orm";

import { dbPool } from "lib/db/db";
import { pullRequestTable } from "lib/db/schema";

import type { SelectPullRequest } from "lib/db/schema";

/** Open/closed transition a caller can request on a pull request. */
export type PullRequestStateAction = "close" | "reopen";

interface PullRequestStateChange {
  /** State to write. */
  to: string;
  /** States the pull request may currently be in for the change to apply. */
  from: string[];
  /** closedAt to write: the close time when closing, cleared when reopening. */
  closedAt: Date | null;
}

/**
 * The open/closed state change for an action, as a pure policy.
 *
 * `from` deliberately omits "merged": a merged pull request is terminal and must
 * never be reopened or reclosed. The service constrains the UPDATE to `from`, so
 * this set is also what makes the close/reopen path race-safe against a merge.
 */
export function pullRequestStateChange(
  action: PullRequestStateAction,
  now: Date,
): PullRequestStateChange {
  return action === "close"
    ? { to: "closed", from: ["open", "draft"], closedAt: now }
    : { to: "open", from: ["closed"], closedAt: null };
}

/**
 * Input for opening a pull request.
 *
 * The per-repository number is assigned by the service. Author and agent
 * attribution are set by the caller from its authenticated identity, never
 * from client input.
 */
export interface CreatePullRequestInput {
  repositoryId: string;
  authorId: string;
  authoredByAgentId?: string | null;
  title: string;
  description?: string | null;
  sourceBranch: string;
  targetBranch: string;
}

/** Postgres unique-violation SQLSTATE. */
const UNIQUE_VIOLATION = "23505";

/**
 * Pull request service: the shared create path for the GraphQL mutation and
 * the MCP tool, so per-repository numbering and insertion live in one place.
 */
export const pullRequestService = {
  /**
   * Open a pull request, assigning the next per-repository number.
   *
   * The number is max(number)+1 scoped to the repository. Two concurrent opens
   * can compute the same number, so the insert is retried on the
   * (repositoryId, number) unique-index violation until it lands. Returns null
   * if a free number could not be claimed within the retry budget.
   */
  async createPullRequest(
    input: CreatePullRequestInput,
    db: typeof dbPool = dbPool,
  ): Promise<SelectPullRequest | null> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const [row] = await db
        .select({
          max: sql<number>`coalesce(max(${pullRequestTable.number}), 0)`,
        })
        .from(pullRequestTable)
        .where(eq(pullRequestTable.repositoryId, input.repositoryId));

      const number = (row?.max ?? 0) + 1;

      try {
        const [created] = await db
          .insert(pullRequestTable)
          .values({
            number,
            repositoryId: input.repositoryId,
            authorId: input.authorId,
            authoredByAgentId: input.authoredByAgentId ?? null,
            title: input.title,
            description: input.description ?? null,
            sourceBranch: input.sourceBranch,
            targetBranch: input.targetBranch,
          })
          .returning();

        return created ?? null;
      } catch (err) {
        // Another open claimed this number first: recompute and retry
        if (
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err as { code?: string }).code === UNIQUE_VIOLATION
        ) {
          continue;
        }
        throw err;
      }
    }

    return null;
  },

  /**
   * Close or reopen a pull request.
   *
   * The change is applied atomically with the current state constrained to the
   * action's allowed `from` states (see pullRequestStateChange), so a merged
   * pull request is never affected and a concurrent merge cannot be clobbered.
   * Returns the updated row, or null when no row matched (not found, already in
   * the target state, or merged) so the caller can report a clean error.
   */
  async setPullRequestState(
    id: string,
    action: PullRequestStateAction,
    db: typeof dbPool = dbPool,
  ): Promise<SelectPullRequest | null> {
    const now = new Date();
    const change = pullRequestStateChange(action, now);

    const [updated] = await db
      .update(pullRequestTable)
      .set({
        state: change.to,
        // closedAt is a plain timestamp() (Date); updatedAt is mode "string"
        closedAt: change.closedAt,
        updatedAt: now.toISOString(),
      })
      .where(
        and(
          eq(pullRequestTable.id, id),
          inArray(pullRequestTable.state, change.from),
        ),
      )
      .returning();

    return updated ?? null;
  },
};
