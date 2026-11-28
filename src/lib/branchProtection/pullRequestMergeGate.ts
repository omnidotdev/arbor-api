import { evaluateBranchProtection } from "./branchProtection";

import type { dbPool } from "lib/db/db";
import type {
  BranchProtectionContext,
  BranchProtectionResult,
} from "./branchProtection";

/** Statuses a required check can be in that will never turn into a pass */
const FAILED_STATUSES = new Set(["failed", "errored"]);

/**
 * Verdict of the required verification checks on a pull request's linked
 * changes: failed when any required check failed or errored, pending when any
 * other required check has not passed yet, passed otherwise (including when
 * there are none).
 */
export const pullRequestCheckVerdict = (
  checks: { status: string; required: boolean }[],
): BranchProtectionContext["checkVerdict"] => {
  const required = checks.filter((check) => check.required);
  if (required.some((check) => FAILED_STATUSES.has(check.status))) {
    return "failed";
  }
  if (required.some((check) => check.status !== "passed")) return "pending";
  return "passed";
};

/**
 * Whether a pull request may merge into `targetBranch` under the repository's
 * branch protection rules: the same per-branch policy a stack merge enforces
 * (required approvals and passing required checks), evaluated with
 * {@link evaluateBranchProtection}. An unprotected branch is always allowed.
 * Approvals count distinct approving reviewers; checks are the required
 * verification checks of the changes linked to the pull request.
 */
export const evaluatePullRequestMergeGate = async (
  db: Pick<typeof dbPool, "query">,
  input: { pullRequestId: string; repositoryId: string; targetBranch: string },
): Promise<BranchProtectionResult> => {
  const rules = await db.query.branchProtectionRuleTable.findMany({
    where: (table, { eq }) => eq(table.repositoryId, input.repositoryId),
    columns: {
      refPattern: true,
      requiredApprovals: true,
      requirePassingChecks: true,
    },
  });
  if (rules.length === 0) return { allowed: true, reasons: [] };

  const reviews = await db.query.pullRequestReviewTable.findMany({
    where: (table, { and, eq }) =>
      and(
        eq(table.pullRequestId, input.pullRequestId),
        eq(table.state, "approved"),
      ),
    columns: { reviewerId: true },
  });
  const approvals = new Set(reviews.map((review) => review.reviewerId)).size;

  const changes = await db.query.changeTable.findMany({
    where: (table, { eq }) => eq(table.pullRequestId, input.pullRequestId),
    columns: { id: true },
  });
  const changeIds = changes.map((change) => change.id);
  const checks =
    changeIds.length === 0
      ? []
      : await db.query.verificationCheckTable.findMany({
          where: (table, { inArray }) => inArray(table.changeId, changeIds),
          columns: { status: true, required: true },
        });
  const checkVerdict = pullRequestCheckVerdict(checks);

  return evaluateBranchProtection(rules, input.targetBranch, {
    approvals,
    checkVerdict,
  });
};
