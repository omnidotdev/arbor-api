import { describe, expect, test } from "bun:test";

import {
  UNRESTRICTED_SCOPE,
  scopeAllowsPath,
  scopeAllowsRef,
  scopeAllowsRepository,
  scopeAllowsWrite,
  scopeBoundsForRepository,
} from "./tokenScope";

import type { RepositoryScope, TokenScope } from "./tokenScope";

/** A repository bound with no ref/path confinement */
const bound = (
  repositoryId: string,
  extra: Partial<RepositoryScope> = {},
): RepositoryScope => ({
  repositoryId,
  refPatterns: null,
  pathPatterns: null,
  ...extra,
});

describe("scopeAllowsWrite", () => {
  test("allows write for a write-permission token", () => {
    expect(scopeAllowsWrite({ permission: "write", repositories: null })).toBe(
      true,
    );
  });

  test("denies write for a read-only token", () => {
    expect(scopeAllowsWrite({ permission: "read", repositories: null })).toBe(
      false,
    );
  });

  test("an unrestricted scope may write", () => {
    expect(scopeAllowsWrite(UNRESTRICTED_SCOPE)).toBe(true);
  });
});

describe("scopeAllowsRepository", () => {
  test("a null repository list reaches every repository", () => {
    const scope: TokenScope = { permission: "write", repositories: null };
    expect(scopeAllowsRepository(scope, "repo-1")).toBe(true);
    expect(scopeAllowsRepository(scope, "repo-2")).toBe(true);
  });

  test("a listed repository is allowed", () => {
    const scope: TokenScope = {
      permission: "read",
      repositories: [bound("repo-1"), bound("repo-2")],
    };
    expect(scopeAllowsRepository(scope, "repo-2")).toBe(true);
  });

  test("a repository outside the list is denied", () => {
    const scope: TokenScope = {
      permission: "write",
      repositories: [bound("repo-1")],
    };
    expect(scopeAllowsRepository(scope, "repo-9")).toBe(false);
  });

  test("an empty repository list reaches nothing, so it fails closed", () => {
    const scope: TokenScope = { permission: "write", repositories: [] };
    expect(scopeAllowsRepository(scope, "any")).toBe(false);
  });
});

describe("scopeAllowsRef", () => {
  test("an unrestricted scope may touch any ref", () => {
    expect(
      scopeAllowsRef(UNRESTRICTED_SCOPE, "repo-1", "refs/heads/master"),
    ).toBe(true);
  });

  test("a repository with null ref patterns may touch any of its refs", () => {
    const scope: TokenScope = {
      permission: "write",
      repositories: [bound("repo-1")],
    };
    expect(scopeAllowsRef(scope, "repo-1", "refs/heads/master")).toBe(true);
  });

  test("a ref matching a pattern is allowed", () => {
    const scope: TokenScope = {
      permission: "write",
      repositories: [bound("repo-1", { refPatterns: ["refs/heads/agent/*"] })],
    };
    expect(scopeAllowsRef(scope, "repo-1", "refs/heads/agent/task-1")).toBe(
      true,
    );
  });

  test("a ref outside every pattern is denied", () => {
    const scope: TokenScope = {
      permission: "write",
      repositories: [bound("repo-1", { refPatterns: ["refs/heads/agent/*"] })],
    };
    expect(scopeAllowsRef(scope, "repo-1", "refs/heads/master")).toBe(false);
  });

  test("a ref in a repository the scope does not list is denied", () => {
    const scope: TokenScope = {
      permission: "write",
      repositories: [bound("repo-1")],
    };
    expect(scopeAllowsRef(scope, "repo-2", "refs/heads/master")).toBe(false);
  });
});

describe("scopeBoundsForRepository", () => {
  test("an unrestricted scope has nothing for the push hook to enforce", () => {
    expect(scopeBoundsForRepository(UNRESTRICTED_SCOPE, "repo-1")).toBeNull();
  });

  test("a repository confined only at the repository level has nothing to enforce", () => {
    const scope: TokenScope = {
      permission: "write",
      repositories: [bound("repo-1")],
    };
    expect(scopeBoundsForRepository(scope, "repo-1")).toBeNull();
  });

  test("a repository with ref or path patterns returns them for enforcement", () => {
    const scope: TokenScope = {
      permission: "write",
      repositories: [bound("repo-1", { refPatterns: ["refs/heads/agent/*"] })],
    };
    expect(scopeBoundsForRepository(scope, "repo-1")).toEqual({
      refPatterns: ["refs/heads/agent/*"],
      pathPatterns: null,
    });
  });

  test("a repository not in a confined scope has nothing to return", () => {
    const scope: TokenScope = {
      permission: "write",
      repositories: [bound("repo-1", { pathPatterns: ["src/**"] })],
    };
    expect(scopeBoundsForRepository(scope, "repo-2")).toBeNull();
  });
});

describe("scopeAllowsPath", () => {
  test("an unrestricted scope may touch any path", () => {
    expect(scopeAllowsPath(UNRESTRICTED_SCOPE, "repo-1", "src/index.ts")).toBe(
      true,
    );
  });

  test("a repository with null path patterns may touch any of its paths", () => {
    const scope: TokenScope = {
      permission: "write",
      repositories: [bound("repo-1")],
    };
    expect(scopeAllowsPath(scope, "repo-1", "infra/prod.tf")).toBe(true);
  });

  test("a path matching a pattern is allowed", () => {
    const scope: TokenScope = {
      permission: "write",
      repositories: [bound("repo-1", { pathPatterns: ["src/**"] })],
    };
    expect(scopeAllowsPath(scope, "repo-1", "src/lib/git/hook.ts")).toBe(true);
  });

  test("a path outside every pattern is denied", () => {
    const scope: TokenScope = {
      permission: "write",
      repositories: [bound("repo-1", { pathPatterns: ["src/**"] })],
    };
    expect(scopeAllowsPath(scope, "repo-1", "infra/prod.tf")).toBe(false);
  });

  test("a path in a repository the scope does not list is denied", () => {
    const scope: TokenScope = {
      permission: "write",
      repositories: [bound("repo-1", { pathPatterns: ["src/**"] })],
    };
    expect(scopeAllowsPath(scope, "repo-2", "src/index.ts")).toBe(false);
  });
});
