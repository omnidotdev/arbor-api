import { describe, expect, test } from "bun:test";

import { classifyRequiredChecks } from "./queueGate";

const check = (status: string, required = true) => ({ status, required });

describe("classifyRequiredChecks", () => {
  test("passes when every required check has passed", () => {
    expect(classifyRequiredChecks([check("passed"), check("passed")])).toBe(
      "passed",
    );
  });

  test("passes vacuously when there are no required checks", () => {
    expect(classifyRequiredChecks([])).toBe("passed");
    expect(classifyRequiredChecks([check("failed", false)])).toBe("passed");
  });

  test("fails when a required check has failed", () => {
    expect(classifyRequiredChecks([check("passed"), check("failed")])).toBe(
      "failed",
    );
  });

  test("is pending when a required check is neither passed nor failed", () => {
    expect(classifyRequiredChecks([check("passed"), check("pending")])).toBe(
      "pending",
    );
    expect(classifyRequiredChecks([check("running")])).toBe("pending");
  });

  test("a definitive failure outweighs a pending check", () => {
    // a change with one failed and one pending required check is not merely
    // waiting; it cannot land as-is and should be evicted, not retried forever
    expect(classifyRequiredChecks([check("pending"), check("failed")])).toBe(
      "failed",
    );
  });

  test("ignores the status of non-required checks", () => {
    expect(
      classifyRequiredChecks([check("passed"), check("failed", false)]),
    ).toBe("passed");
  });
});
