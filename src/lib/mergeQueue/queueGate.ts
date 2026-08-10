/**
 * Pure classification of a change's required verification checks into a single
 * merge-gate verdict. The serial processor already knows a change is not
 * mergeable when a required check has not passed, but treats every such block
 * the same: it leaves the entry queued to retry. That is correct for a check
 * still running, but wrong for one that has definitively failed, which would
 * keep the entry (and a whole stack) in the queue forever. Splitting the verdict
 * into passed / failed / pending is what lets the queue evict a hard failure
 * (the bisection outcome) while still waiting on a pending one.
 */
export type QueueGateVerdict = "passed" | "failed" | "pending";

/**
 * Classify a change's checks:
 * - `passed` when every required check has passed (vacuously true with none),
 * - `failed` when any required check has failed (a definitive block that
 *   outweighs anything still pending),
 * - `pending` when a required check is neither passed nor failed (still running).
 * Non-required checks never affect the verdict.
 */
export const classifyRequiredChecks = (
  checks: { status: string; required: boolean }[],
): QueueGateVerdict => {
  const required = checks.filter((check) => check.required);

  if (required.some((check) => check.status === "failed")) return "failed";
  if (required.every((check) => check.status === "passed")) return "passed";
  return "pending";
};
