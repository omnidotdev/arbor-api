import { describe, expect, spyOn, test } from "bun:test";

import { warnIfRowLevelSecurityIsBypassed } from "./rowLevelSecurity";

/** Capture console.warn for the duration of one call */
const captureWarnings = async (run: () => Promise<void>) => {
  const warnings: string[] = [];
  const spy = spyOn(console, "warn").mockImplementation(
    (...args: unknown[]) => {
      warnings.push(args.map(String).join(" "));
    },
  );

  try {
    await run();
  } finally {
    spy.mockRestore();
  }

  return warnings;
};

describe("warnIfRowLevelSecurityIsBypassed", () => {
  test("warns when the connection role is a superuser", async () => {
    const warnings = await captureWarnings(() =>
      warnIfRowLevelSecurityIsBypassed(async () => ({
        rows: [{ current_user: "postgres", is_superuser: true }],
      })),
    );

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("postgres");
    expect(warnings[0]).toContain("row-level security is bypassed");
  });

  test("stays silent for a non-superuser role", async () => {
    const warnings = await captureWarnings(() =>
      warnIfRowLevelSecurityIsBypassed(async () => ({
        rows: [{ current_user: "arbor_app", is_superuser: false }],
      })),
    );

    expect(warnings).toEqual([]);
  });

  test("stays silent when the role is unknown to pg_roles", async () => {
    const warnings = await captureWarnings(() =>
      warnIfRowLevelSecurityIsBypassed(async () => ({
        rows: [{ current_user: "arbor_app", is_superuser: null }],
      })),
    );

    expect(warnings).toEqual([]);
  });

  test("does not throw when the database is unreachable", async () => {
    const warnings = await captureWarnings(() =>
      warnIfRowLevelSecurityIsBypassed(async () => {
        throw new Error("connection refused");
      }),
    );

    // a diagnostic must never take the boot path down
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("connection refused");
  });

  test("does not throw when the query returns no rows", async () => {
    const warnings = await captureWarnings(() =>
      warnIfRowLevelSecurityIsBypassed(async () => ({ rows: [] })),
    );

    expect(warnings).toEqual([]);
  });
});
