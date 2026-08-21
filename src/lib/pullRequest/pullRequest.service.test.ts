import { describe, expect, test } from "bun:test";

import { pullRequestStateChange } from "./pullRequest.service";

/**
 * Pull request open/closed state-transition policy.
 *
 * The atomic UPDATE in the service applies this change with `state` constrained
 * to `from`, so a merged pull request (never listed in `from`) can never be
 * reopened or reclosed, and the close/reopen race with a merge cannot clobber
 * the merged state. These tests lock that policy.
 */
describe("pullRequestStateChange", () => {
  const now = new Date("2026-08-21T00:00:00.000Z");

  test("closing moves an open or draft pull request to closed and stamps closedAt", () => {
    const change = pullRequestStateChange("close", now);
    expect(change.to).toBe("closed");
    expect(change.from).toContain("open");
    expect(change.from).toContain("draft");
    expect(change.closedAt).toEqual(now);
  });

  test("closing never applies to a merged pull request", () => {
    const change = pullRequestStateChange("close", now);
    expect(change.from).not.toContain("merged");
  });

  test("reopening moves a closed pull request to open and clears closedAt", () => {
    const change = pullRequestStateChange("reopen", now);
    expect(change.to).toBe("open");
    expect(change.from).toEqual(["closed"]);
    expect(change.closedAt).toBeNull();
  });

  test("reopening never applies to a merged pull request", () => {
    const change = pullRequestStateChange("reopen", now);
    expect(change.from).not.toContain("merged");
  });
});
