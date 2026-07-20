import { eq, sql } from "drizzle-orm";

import { dbPool } from "lib/db/db";
import { pullRequestTable } from "lib/db/schema";

import type { SelectPullRequest } from "lib/db/schema";

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
};
