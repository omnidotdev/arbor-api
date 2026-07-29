import { describe, expect, test } from "bun:test";

import {
  UNRESTRICTED_SCOPE,
  scopeAllowsRepository,
  scopeAllowsWrite,
} from "./tokenScope";

describe("scopeAllowsWrite", () => {
  test("allows write for a write-permission token", () => {
    expect(scopeAllowsWrite({ permission: "write", repositoryIds: null })).toBe(
      true,
    );
  });

  test("denies write for a read-only token", () => {
    expect(scopeAllowsWrite({ permission: "read", repositoryIds: null })).toBe(
      false,
    );
  });

  test("an unrestricted scope may write", () => {
    expect(scopeAllowsWrite(UNRESTRICTED_SCOPE)).toBe(true);
  });
});

describe("scopeAllowsRepository", () => {
  test("a null repository whitelist reaches every repository", () => {
    const scope = { permission: "write", repositoryIds: null } as const;
    expect(scopeAllowsRepository(scope, "repo-1")).toBe(true);
    expect(scopeAllowsRepository(scope, "repo-2")).toBe(true);
  });

  test("a whitelisted repository is allowed", () => {
    expect(
      scopeAllowsRepository(
        { permission: "read", repositoryIds: ["repo-1", "repo-2"] },
        "repo-2",
      ),
    ).toBe(true);
  });

  test("a repository outside the whitelist is denied", () => {
    expect(
      scopeAllowsRepository(
        { permission: "write", repositoryIds: ["repo-1"] },
        "repo-9",
      ),
    ).toBe(false);
  });

  test("an empty whitelist reaches nothing, so it fails closed", () => {
    expect(
      scopeAllowsRepository({ permission: "write", repositoryIds: [] }, "any"),
    ).toBe(false);
  });
});
