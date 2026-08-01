import { beforeEach, describe, expect, mock, test } from "bun:test";

/**
 * Access gates for the MCP tool surface.
 *
 * Every tool reaches a repository through one of these three gates, so they are
 * where a token's scope is enforced. The repository lookup and the user-level
 * read/write checks are stubbed at the `lib/git` boundary; what is under test is
 * that a confined or read-only credential is refused even when its owning user
 * would be allowed.
 */

const state: {
  repo: {
    id: string;
    visibility: "public" | "private";
    ownerId: string;
    organizationId: string | null;
  } | null;
  canRead: boolean;
  canWrite: boolean;
} = { repo: null, canRead: true, canWrite: true };

mock.module("lib/git", () => ({
  resolveRepositorySummary: async () => state.repo,
  canReadRepository: async () => state.canRead,
  canWriteRepository: async () => state.canWrite,
}));

mock.module("lib/db/db", () => ({
  dbPool: {
    query: {
      repositoryTable: {
        findFirst: async () => state.repo,
      },
    },
  },
}));

const {
  callerMayRead,
  gateCreate,
  gateRead,
  gateRefWrite,
  gateWrite,
  gateWriteByRepositoryId,
} = await import("./gates");

import type { McpCaller } from "./auth";

/** Build a caller with the given scope; repository ids carry no ref/path limits */
const makeCaller = (
  permission: "read" | "write",
  repositoryIds: string[] | null,
): McpCaller =>
  ({
    user: { id: "user-1" },
    agent: null,
    scope: {
      permission,
      repositories:
        repositoryIds === null
          ? null
          : repositoryIds.map((repositoryId) => ({
              repositoryId,
              refPatterns: null,
              pathPatterns: null,
            })),
    },
  }) as unknown as McpCaller;

/** Build a write caller confined to a ref pattern in a repository */
const makeRefCaller = (
  repositoryId: string,
  refPatterns: string[],
): McpCaller =>
  ({
    user: { id: "user-1" },
    agent: null,
    scope: {
      permission: "write",
      repositories: [{ repositoryId, refPatterns, pathPatterns: null }],
    },
  }) as unknown as McpCaller;

beforeEach(() => {
  state.repo = {
    id: "repo-1",
    visibility: "private",
    ownerId: "user-1",
    organizationId: null,
  };
  state.canRead = true;
  state.canWrite = true;
});

describe("gateRead", () => {
  test("allows an unconfined credential", async () => {
    const gate = await gateRead(makeCaller("write", null), "alice", "repo");
    expect(gate?.id).toBe("repo-1");
  });

  test("allows a credential confined to this repository", async () => {
    const gate = await gateRead(
      makeCaller("read", ["repo-1"]),
      "alice",
      "repo",
    );
    expect(gate?.id).toBe("repo-1");
  });

  test("refuses a credential confined to another repository", async () => {
    const gate = await gateRead(
      makeCaller("write", ["other-repo"]),
      "alice",
      "repo",
    );
    expect(gate).toBeNull();
  });
});

describe("callerMayRead", () => {
  const summary = {
    id: "repo-1",
    visibility: "private" as const,
    ownerId: "user-1",
    organizationId: null,
  };

  test("allows an unconfined credential the user may read", async () => {
    expect(await callerMayRead(makeCaller("write", null), summary)).toBe(true);
  });

  test("hides a repository outside the credential's whitelist from listings", async () => {
    // The user may read it, but this token was not issued for it, so it must
    // not appear in an enumeration either
    state.canRead = true;
    expect(
      await callerMayRead(makeCaller("write", ["other-repo"]), summary),
    ).toBe(false);
  });

  test("still defers to the user's own read permission", async () => {
    state.canRead = false;
    expect(await callerMayRead(makeCaller("write", null), summary)).toBe(false);
  });
});

describe("gateWrite", () => {
  test("allows a write credential", async () => {
    const gate = await gateWrite(makeCaller("write", null), "alice", "repo");
    expect(gate?.id).toBe("repo-1");
  });

  test("refuses a read-only credential even when the user may write", async () => {
    state.canWrite = true;
    const gate = await gateWrite(makeCaller("read", null), "alice", "repo");
    expect(gate).toBeNull();
  });

  test("refuses a credential confined to another repository", async () => {
    const gate = await gateWrite(
      makeCaller("write", ["other-repo"]),
      "alice",
      "repo",
    );
    expect(gate).toBeNull();
  });
});

describe("gateWriteByRepositoryId", () => {
  test("allows a write credential", async () => {
    const gate = await gateWriteByRepositoryId(
      makeCaller("write", null),
      "repo-1",
    );
    expect(gate?.id).toBe("repo-1");
  });

  test("refuses a read-only credential", async () => {
    const gate = await gateWriteByRepositoryId(
      makeCaller("read", null),
      "repo-1",
    );
    expect(gate).toBeNull();
  });

  test("refuses a credential confined to another repository", async () => {
    const gate = await gateWriteByRepositoryId(
      makeCaller("write", ["other-repo"]),
      "repo-1",
    );
    expect(gate).toBeNull();
  });
});

describe("gateCreate", () => {
  test("allows an unconfined write credential", () => {
    expect(gateCreate(makeCaller("write", null))).toBe(true);
  });

  test("refuses a read-only credential", () => {
    expect(gateCreate(makeCaller("read", null))).toBe(false);
  });

  test("refuses a credential confined to specific repositories", () => {
    // a token issued for a fixed set of repositories has no business minting
    // new ones: the new repository could never be in its whitelist
    expect(gateCreate(makeCaller("write", ["repo-1"]))).toBe(false);
  });
});

describe("gateRefWrite", () => {
  test("allows an unconfined credential to move any ref", async () => {
    const gate = await gateRefWrite(
      makeCaller("write", null),
      "repo-1",
      "refs/heads/master",
    );
    expect(gate?.id).toBe("repo-1");
  });

  test("allows a credential whose ref patterns match the target ref", async () => {
    const gate = await gateRefWrite(
      makeRefCaller("repo-1", ["refs/heads/agent/*"]),
      "repo-1",
      "refs/heads/agent/task-1",
    );
    expect(gate?.id).toBe("repo-1");
  });

  test("refuses a credential whose ref patterns exclude the target ref", async () => {
    const gate = await gateRefWrite(
      makeRefCaller("repo-1", ["refs/heads/agent/*"]),
      "repo-1",
      "refs/heads/master",
    );
    expect(gate).toBeNull();
  });

  test("refuses a read-only credential before the ref is considered", async () => {
    const gate = await gateRefWrite(
      makeCaller("read", null),
      "repo-1",
      "refs/heads/agent/task-1",
    );
    expect(gate).toBeNull();
  });
});
