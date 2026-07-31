import { describe, expect, spyOn, test } from "bun:test";

import { warnIfRowLevelSecurityIsBypassed } from "./rowLevelSecurity";

/** A row shaped like the role-status query's result */
const role = (overrides: Record<string, unknown> = {}) => ({
  current_user: "arbor_app",
  is_superuser: false,
  can_bypass_rls: false,
  owned_unforced_tables: 0,
  ...overrides,
});

/** Capture console.warn for the duration of one call */
const captureWarnings = async (rows: unknown[]) => {
  const warnings: string[] = [];
  const spy = spyOn(console, "warn").mockImplementation(
    (...args: unknown[]) => {
      warnings.push(args.map(String).join(" "));
    },
  );

  try {
    await warnIfRowLevelSecurityIsBypassed(
      async () =>
        ({ rows }) as Awaited<
          ReturnType<Parameters<typeof warnIfRowLevelSecurityIsBypassed>[0]>
        >,
    );
  } finally {
    spy.mockRestore();
  }

  return warnings;
};

describe("warnIfRowLevelSecurityIsBypassed", () => {
  test("warns when the connection role is a superuser", async () => {
    const warnings = await captureWarnings([
      role({ current_user: "postgres", is_superuser: true }),
    ]);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("postgres");
    expect(warnings[0]).toContain("is a superuser");
  });

  test("warns when the role has BYPASSRLS", async () => {
    const warnings = await captureWarnings([role({ can_bypass_rls: true })]);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("has BYPASSRLS");
  });

  test("warns when the role owns unforced tables", async () => {
    // production: `arbor` is not a superuser, but owns every table, so it
    // bypasses its own policies. Checking rolsuper alone missed this entirely
    const warnings = await captureWarnings([
      role({ current_user: "arbor", owned_unforced_tables: 22 }),
    ]);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("arbor");
    expect(warnings[0]).toContain("owns 22 table(s)");
  });

  test("treats a bigint count returned as a string as a number", async () => {
    // node-postgres returns count() as a string, so a truthiness check would
    // also fire on "0"
    expect(
      await captureWarnings([role({ owned_unforced_tables: "0" })]),
    ).toEqual([]);
  });

  test("warns when the count arrives as a non-zero string", async () => {
    const warnings = await captureWarnings([
      role({ owned_unforced_tables: "9" }),
    ]);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("owns 9 table(s)");
  });

  test("stays silent for a role that is genuinely constrained", async () => {
    expect(await captureWarnings([role()])).toEqual([]);
  });

  test("stays silent when the tables it owns are forced", async () => {
    // a forced table does not grant its owner a bypass, so it is not counted
    expect(
      await captureWarnings([
        role({ current_user: "arbor", owned_unforced_tables: 0 }),
      ]),
    ).toEqual([]);
  });

  test("does not throw when the query returns no rows", async () => {
    expect(await captureWarnings([])).toEqual([]);
  });

  test("throws instead of warning when enforcing", async () => {
    await expect(
      warnIfRowLevelSecurityIsBypassed(
        async () =>
          ({
            rows: [role({ current_user: "arbor", is_superuser: true })],
          }) as Awaited<
            ReturnType<Parameters<typeof warnIfRowLevelSecurityIsBypassed>[0]>
          >,
        { enforce: true },
      ),
    ).rejects.toThrow("is a superuser");
  });

  test("does not throw when enforcing and the role is constrained", async () => {
    await expect(
      warnIfRowLevelSecurityIsBypassed(
        async () =>
          ({ rows: [role()] }) as Awaited<
            ReturnType<Parameters<typeof warnIfRowLevelSecurityIsBypassed>[0]>
          >,
        { enforce: true },
      ),
    ).resolves.toBeUndefined();
  });

  test("a database failure never throws, even when enforcing", async () => {
    // the enforcement must not turn a transient connectivity blip into a boot
    // failure, and the connectivity catch must not swallow an enforcement throw.
    // Those pull in opposite directions, so both are pinned
    await expect(
      warnIfRowLevelSecurityIsBypassed(
        async () => {
          throw new Error("connection refused");
        },
        { enforce: true },
      ),
    ).resolves.toBeUndefined();
  });

  test("does not throw when the database is unreachable", async () => {
    const warnings: string[] = [];
    const spy = spyOn(console, "warn").mockImplementation(
      (...args: unknown[]) => {
        warnings.push(args.map(String).join(" "));
      },
    );

    try {
      await warnIfRowLevelSecurityIsBypassed(async () => {
        throw new Error("connection refused");
      });
    } finally {
      spy.mockRestore();
    }

    // a diagnostic must never take the boot path down
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("connection refused");
  });
});
