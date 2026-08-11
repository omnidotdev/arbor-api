import { eq } from "drizzle-orm";

import { organizationMemberTable } from "lib/db/schema";
import { evaluateTopicReadiness } from "./topicReadiness";

import type { dbPool } from "lib/db/db";

/** Whether a topic can submit all-or-nothing, and which member PRs block it. */
export interface TopicReadinessResult {
  ready: boolean;
  blockingPullRequestIds: string[];
}

/**
 * Evaluate whether a cross-repository topic is ready to submit: every member
 * pull request must be landable (already merged, or open). Scoped to what the
 * caller may see - the topic must be visible (owned, or in one of the caller's
 * organizations), and a member pull request in a repository the caller cannot
 * see is excluded rather than leaked. An invisible or empty topic is not ready.
 *
 * A pull request has no checks gate in Arbor today (verification checks hang off
 * stacked changes), so "mergeable" is currently just "open"; when a PR-level gate
 * exists, feed it in here without changing the pure readiness rule.
 */
export const topicReadiness = async (args: {
  observer: { id: string } | null | undefined;
  db: typeof dbPool;
  input: { topicId: string };
}): Promise<TopicReadinessResult> => {
  const { observer, db, input } = args;
  const userId = observer?.id ?? null;
  if (!userId) return { ready: false, blockingPullRequestIds: [] };

  const memberOrgIds = (
    await db
      .select({ id: organizationMemberTable.organizationId })
      .from(organizationMemberTable)
      .where(eq(organizationMemberTable.userId, userId))
  ).map((row) => row.id);

  const topic = await db.query.topicTable.findFirst({
    where: (table, { eq: equals }) => equals(table.id, input.topicId),
    columns: { id: true, ownerId: true, organizationId: true },
  });
  if (!topic) return { ready: false, blockingPullRequestIds: [] };

  const topicVisible =
    topic.ownerId === userId ||
    (topic.organizationId !== null &&
      memberOrgIds.includes(topic.organizationId));
  if (!topicVisible) return { ready: false, blockingPullRequestIds: [] };

  const memberships = await db.query.topicPullRequestTable.findMany({
    where: (table, { eq: equals }) => equals(table.topicId, topic.id),
    columns: { pullRequestId: true },
    with: {
      pullRequest: {
        columns: { id: true, state: true },
        with: {
          repository: {
            columns: {
              visibility: true,
              ownerId: true,
              organizationId: true,
            },
            with: {
              collaborators: {
                where: (table, { eq: equals }) => equals(table.userId, userId),
                columns: { userId: true },
              },
            },
          },
        },
      },
    },
  });

  const members = memberships
    .map((membership) => membership.pullRequest)
    .filter((pr): pr is NonNullable<typeof pr> => {
      const repo = pr?.repository;
      if (!repo) return false;
      return (
        repo.visibility === "public" ||
        repo.ownerId === userId ||
        (repo.organizationId !== null &&
          memberOrgIds.includes(repo.organizationId)) ||
        repo.collaborators.length > 0
      );
    })
    .map((pr) => ({
      pullRequestId: pr.id,
      state: pr.state,
      mergeable: pr.state === "open",
    }));

  const { ready, blocking } = evaluateTopicReadiness(members);
  return { ready, blockingPullRequestIds: blocking };
};
