import { beforeEach, describe, expect, mock, test } from "bun:test";
import { join } from "node:path";

/**
 * Repository storage lifecycle tests.
 *
 * These verify that deleting a repository removes its bare git storage from
 * disk (the mirror of storage initialization on create). The filesystem is
 * stubbed at the `node:fs/promises` boundary so no real disk writes happen.
 */

type RmCall = { path: string; options: unknown };
type RenameCall = { oldPath: string; newPath: string };

const rmCalls: RmCall[] = [];
let rmImpl: (path: string, options: unknown) => Promise<void> = async () => {};

const renameCalls: RenameCall[] = [];
let renameImpl: (oldPath: string, newPath: string) => Promise<void> =
  async () => {};

// Paths that access() should report as existing (target-collision checks)
const existingPaths = new Set<string>();

const REPOS_PATH = "/var/lib/arbor/repos";
const getRepositoryPath = (owner: string, repo: string): string =>
  join(REPOS_PATH, owner, `${repo}.git`);

mock.module("node:fs/promises", () => ({
  rm: (path: string, options: unknown) => {
    rmCalls.push({ path, options });
    return rmImpl(path, options);
  },
  rename: (oldPath: string, newPath: string) => {
    renameCalls.push({ oldPath, newPath });
    return renameImpl(oldPath, newPath);
  },
  access: async (path: string) => {
    if (!existingPaths.has(path)) throw new Error("ENOENT");
  },
  // storage.config imports these; they are unused by these tests
  mkdir: async () => {},
  readdir: async () => [],
  stat: async () => ({ size: 0 }),
}));

// storage.config is also mocked by other test files (a global mock.module
// registration leaks across files); register a complete stub here so the real
// repository.service links regardless of test execution order
mock.module("lib/git/storage.config", () => ({
  gitStorageConfig: {
    repositoriesPath: REPOS_PATH,
    maxRepoSize: 0,
    defaultBranch: "master",
  },
  getRepositoryPath,
  ensureReposDirectory: async () => {},
  ensureOwnerDirectory: async () => {},
  getRepositorySize: async () => 0,
  getOrganizationStorageBytes: async () => 0,
  invalidateRepositorySizeCache: () => {},
}));

// Import AFTER mocks are registered
const { deleteRepositoryStorageById, repositoryService } = await import(
  "./repository.service"
);

type RepoRow = {
  slug: string;
  owner: { username: string } | null;
} | null;

const makeDb = (repo: RepoRow) =>
  ({
    query: {
      repositoryTable: {
        findFirst: async () => repo,
      },
    },
  }) as never;

const reset = () => {
  rmCalls.length = 0;
  rmImpl = async () => {};
  renameCalls.length = 0;
  renameImpl = async () => {};
  existingPaths.clear();
};

beforeEach(reset);

describe("repositoryService.delete", () => {
  test("removes the repository at its on-disk path", async () => {
    const ok = await repositoryService.delete("alice", "repo");

    expect(ok).toBe(true);
    expect(rmCalls).toHaveLength(1);
    expect(rmCalls[0]?.path).toBe(getRepositoryPath("alice", "repo"));
    expect(rmCalls[0]?.options).toEqual({ recursive: true, force: true });
  });

  test("reports success when the storage is already gone (force removal)", async () => {
    rmImpl = async () => {
      throw new Error("ENOENT");
    };

    // rm with { force: true } would not throw for a missing path, but even a
    // hard failure must be swallowed so the caller treats it as success
    const ok = await repositoryService.delete("alice", "repo");

    expect(ok).toBe(false);
    expect(rmCalls).toHaveLength(1);
  });
});

describe("repositoryService.rename", () => {
  test("moves the bare directory from the old slug to the new slug", async () => {
    const ok = await repositoryService.rename("alice", "old", "new");

    expect(ok).toBe(true);
    expect(renameCalls).toHaveLength(1);
    expect(renameCalls[0]?.oldPath).toBe(getRepositoryPath("alice", "old"));
    expect(renameCalls[0]?.newPath).toBe(getRepositoryPath("alice", "new"));
  });

  test("is a no-op that succeeds when the slug is unchanged", async () => {
    const ok = await repositoryService.rename("alice", "same", "same");

    expect(ok).toBe(true);
    expect(renameCalls).toHaveLength(0);
  });

  test("refuses to move onto an existing target and does not rename", async () => {
    existingPaths.add(getRepositoryPath("alice", "taken"));

    const ok = await repositoryService.rename("alice", "old", "taken");

    expect(ok).toBe(false);
    expect(renameCalls).toHaveLength(0);
  });

  test("reports failure when the source storage is missing", async () => {
    renameImpl = async () => {
      throw new Error("ENOENT");
    };

    const ok = await repositoryService.rename("alice", "missing", "new");

    expect(ok).toBe(false);
    expect(renameCalls).toHaveLength(1);
  });
});

describe("deleteRepositoryStorageById", () => {
  test("removes storage under the owning user's username", async () => {
    const db = makeDb({ slug: "repo", owner: { username: "alice" } });

    await deleteRepositoryStorageById("r1", db);

    expect(rmCalls).toHaveLength(1);
    expect(rmCalls[0]?.path).toBe(getRepositoryPath("alice", "repo"));
  });

  test("removes org-owned storage under the owner username, not the org", async () => {
    // Organization identity lives in the IDP; org repos are still stored on
    // disk under the owning user's username
    const db = makeDb({ slug: "api", owner: { username: "alice" } });

    await deleteRepositoryStorageById("r2", db);

    expect(rmCalls).toHaveLength(1);
    expect(rmCalls[0]?.path).toBe(getRepositoryPath("alice", "api"));
  });

  test("is a no-op when the repository row cannot be resolved", async () => {
    const db = makeDb(null);

    await deleteRepositoryStorageById("missing", db);

    expect(rmCalls).toHaveLength(0);
  });

  test("does not throw when storage removal fails", async () => {
    rmImpl = async () => {
      throw new Error("EACCES");
    };
    const db = makeDb({ slug: "repo", owner: { username: "alice" } });

    await expect(
      deleteRepositoryStorageById("r1", db),
    ).resolves.toBeUndefined();
    expect(rmCalls).toHaveLength(1);
  });

  test("is a no-op for a blank row id", async () => {
    const db = makeDb({ slug: "repo", owner: { username: "alice" } });

    await deleteRepositoryStorageById("", db);

    expect(rmCalls).toHaveLength(0);
  });
});
