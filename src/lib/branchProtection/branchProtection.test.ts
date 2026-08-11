import { describe, expect, test } from "bun:test";

import { evaluateBranchProtection, rulesForBranch } from "./branchProtection";

import type { BranchProtectionRule } from "./branchProtection";

const rule = (
  refPattern: string,
  overrides: Partial<BranchProtectionRule> = {},
): BranchProtectionRule => ({
  refPattern,
  requiredApprovals: 0,
  requirePassingChecks: false,
  ...overrides,
});

describe("rulesForBranch", () => {
  test("matches by glob and normalizes refs/heads/", () => {
    const rules = [rule("main"), rule("release/*"), rule("dev")];
    // a full ref and a bare branch name both resolve to the same rule
    expect(
      rulesForBranch(rules, "refs/heads/main").map((r) => r.refPattern),
    ).toEqual(["main"]);
    expect(
      rulesForBranch(rules, "release/v1").map((r) => r.refPattern),
    ).toEqual(["release/*"]);
    // `*` does not cross a segment
    expect(
      rulesForBranch(rules, "release/v1/rc").map((r) => r.refPattern),
    ).toEqual([]);
  });
});

describe("evaluateBranchProtection", () => {
  test("no matching rule is unprotected (allowed)", () => {
    const result = evaluateBranchProtection([rule("main")], "feature/x", {
      approvals: 0,
      checkVerdict: "pending",
    });
    expect(result.allowed).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  test("blocks when approvals are below the requirement", () => {
    const result = evaluateBranchProtection(
      [rule("main", { requiredApprovals: 2 })],
      "main",
      { approvals: 1, checkVerdict: "passed" },
    );
    expect(result.allowed).toBe(false);
    expect(result.reasons[0]).toContain("2 approval");
  });

  test("allows when approvals meet the requirement", () => {
    const result = evaluateBranchProtection(
      [rule("main", { requiredApprovals: 2 })],
      "main",
      { approvals: 2, checkVerdict: "passed" },
    );
    expect(result.allowed).toBe(true);
  });

  test("blocks when required checks are not passed", () => {
    for (const verdict of ["pending", "failed"] as const) {
      const result = evaluateBranchProtection(
        [rule("main", { requirePassingChecks: true })],
        "main",
        { approvals: 0, checkVerdict: verdict },
      );
      expect(result.allowed).toBe(false);
      expect(result.reasons.join(" ")).toContain("check");
    }
    const passing = evaluateBranchProtection(
      [rule("main", { requirePassingChecks: true })],
      "main",
      { approvals: 0, checkVerdict: "passed" },
    );
    expect(passing.allowed).toBe(true);
  });

  test("a branch must satisfy every matching rule (strictest wins)", () => {
    const rules = [
      rule("*", { requirePassingChecks: true }),
      rule("main", { requiredApprovals: 1 }),
    ];
    // main matches both; needs approvals AND passing checks
    const result = evaluateBranchProtection(rules, "main", {
      approvals: 0,
      checkVerdict: "pending",
    });
    expect(result.allowed).toBe(false);
    expect(result.reasons.length).toBe(2);
  });
});
