import { describe, expect, test } from "bun:test";

import {
  evaluatePullRequestMergeGate,
  pullRequestCheckVerdict,
} from "./pullRequestMergeGate";

/** A db stub answering each table's findMany with fixed rows */
const stubDb = (rows: {
  rules?: unknown[];
  reviews?: { reviewerId: string }[];
  changes?: { id: string }[];
  checks?: { status: string; required: boolean }[];
}) =>
  ({
    query: {
      branchProtectionRuleTable: { findMany: async () => rows.rules ?? [] },
      pullRequestReviewTable: { findMany: async () => rows.reviews ?? [] },
      changeTable: { findMany: async () => rows.changes ?? [] },
      verificationCheckTable: { findMany: async () => rows.checks ?? [] },
    },
  }) as unknown as Parameters<typeof evaluatePullRequestMergeGate>[0];

const input = {
  pullRequestId: "pr1",
  repositoryId: "repo1",
  targetBranch: "master",
};

const rule = (overrides: Record<string, unknown> = {}) => ({
  refPattern: "master",
  requiredApprovals: 0,
  requirePassingChecks: false,
  ...overrides,
});

describe("pull request merge gate", () => {
  test("an unprotected branch merges freely", async () => {
    expect(await evaluatePullRequestMergeGate(stubDb({}), input)).toEqual({
      allowed: true,
      reasons: [],
    });
  });

  test("required approvals count distinct approving reviewers", async () => {
    const blocked = await evaluatePullRequestMergeGate(
      stubDb({
        rules: [rule({ requiredApprovals: 2 })],
        reviews: [{ reviewerId: "a" }, { reviewerId: "a" }],
      }),
      input,
    );
    expect(blocked.allowed).toBe(false);
    expect(blocked.reasons).toEqual([
      "branch master requires 2 approval(s), has 1",
    ]);

    const allowed = await evaluatePullRequestMergeGate(
      stubDb({
        rules: [rule({ requiredApprovals: 2 })],
        reviews: [{ reviewerId: "a" }, { reviewerId: "b" }],
      }),
      input,
    );
    expect(allowed.allowed).toBe(true);
  });

  test("required checks on the linked changes must pass", async () => {
    const protectedRule = [rule({ requirePassingChecks: true })];
    const failing = await evaluatePullRequestMergeGate(
      stubDb({
        rules: protectedRule,
        changes: [{ id: "c1" }],
        checks: [
          { status: "passed", required: true },
          { status: "failed", required: true },
        ],
      }),
      input,
    );
    expect(failing.allowed).toBe(false);

    const passing = await evaluatePullRequestMergeGate(
      stubDb({
        rules: protectedRule,
        changes: [{ id: "c1" }],
        checks: [
          { status: "passed", required: true },
          { status: "failed", required: false },
        ],
      }),
      input,
    );
    expect(passing.allowed).toBe(true);
  });

  test("a rule for another branch does not apply", async () => {
    const result = await evaluatePullRequestMergeGate(
      stubDb({
        rules: [rule({ refPattern: "release/*", requiredApprovals: 3 })],
      }),
      input,
    );
    expect(result.allowed).toBe(true);
  });

  test("check verdict", () => {
    expect(pullRequestCheckVerdict([])).toBe("passed");
    expect(
      pullRequestCheckVerdict([{ status: "running", required: true }]),
    ).toBe("pending");
    expect(
      pullRequestCheckVerdict([
        { status: "running", required: true },
        { status: "errored", required: true },
      ]),
    ).toBe("failed");
  });
});
