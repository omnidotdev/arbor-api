import { matchesGlob } from "lib/auth/refPathMatch";

/**
 * Branch protection: a per-branch policy layer on top of the per-change merge
 * gate. A rule names a branch glob and the conditions a change must meet before
 * it may land on a matching branch. Pure so the decision is unit-tested and
 * shared by every enforcement point (today the merge queue; direct-push
 * enforcement can reuse the same evaluation).
 *
 * Ref globs use the same semantics as the push credential boundary
 * (`refPathMatch`): `*` within a segment, `**` across, everything else literal.
 */

/** A single branch protection rule for a repository. */
export interface BranchProtectionRule {
  /** Branch-name glob, e.g. `main`, `release/*`, `**` */
  refPattern: string;
  /** Minimum approving reviews before a change may land */
  requiredApprovals: number;
  /** Require every required verification check to have passed */
  requirePassingChecks: boolean;
}

/** The merge-gate state of the change being landed. */
export interface BranchProtectionContext {
  /** Count of approving reviews on the change's pull request */
  approvals: number;
  /** Verdict of the change's required checks (see queueGate) */
  checkVerdict: "passed" | "failed" | "pending";
}

/** The decision: allowed, plus a client-facing reason per unmet condition. */
export interface BranchProtectionResult {
  allowed: boolean;
  reasons: string[];
}

/** A target branch as a bare name, stripping a leading `refs/heads/`. */
const branchName = (ref: string): string =>
  ref.startsWith("refs/heads/") ? ref.slice("refs/heads/".length) : ref;

/** The rules whose glob matches the (normalized) branch. */
export const rulesForBranch = (
  rules: BranchProtectionRule[],
  ref: string,
): BranchProtectionRule[] => {
  const branch = branchName(ref);
  return rules.filter((rule) => matchesGlob(rule.refPattern, branch));
};

/**
 * Decide whether a change may land on `ref`. It must satisfy EVERY rule whose
 * glob matches (the strictest applies, and an unmatched branch is unprotected).
 * Returns one reason per unmet condition, deduplicated.
 */
export const evaluateBranchProtection = (
  rules: BranchProtectionRule[],
  ref: string,
  context: BranchProtectionContext,
): BranchProtectionResult => {
  const branch = branchName(ref);
  const reasons = new Set<string>();

  for (const rule of rulesForBranch(rules, ref)) {
    if (context.approvals < rule.requiredApprovals) {
      reasons.add(
        `branch ${branch} requires ${rule.requiredApprovals} approval(s), has ${context.approvals}`,
      );
    }
    if (rule.requirePassingChecks && context.checkVerdict !== "passed") {
      reasons.add(
        `branch ${branch} requires all required checks to pass (currently ${context.checkVerdict})`,
      );
    }
  }

  return { allowed: reasons.size === 0, reasons: [...reasons] };
};
