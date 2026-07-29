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

const { callerMayRead, gateRead, gateWrite, gateWriteByRepositoryId } =
  await import("./gates");

import type { McpCaller } from "./auth";

/** Build a caller with the given scope */
const makeCaller = (
  permission: "read" | "write",
  repositoryIds: string[] | null,
): McpCaller =>
  ({
    user: { id: "user-1" },
    agent: null,
    scope: { permission, repositoryIds },
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
