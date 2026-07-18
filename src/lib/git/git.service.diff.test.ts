import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import * as fs from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import git from "isomorphic-git";

// NB: use fs.promises rather than importing from node:fs/promises directly:
// repository.service.test registers a partial mock of node:fs/promises that
// leaks across the suite (mkdtemp/writeFile would be missing), whereas node:fs
// is never mocked
const { mkdtemp, rm, writeFile } = fs.promises;

/**
 * Diff computation tests for gitService.
 *
 * These build real git history with isomorphic-git (in throwaway working
 * repositories) and assert the derived changed-file lists and per-file
 * old/new content. storage.config is stubbed so getRepositoryPath points at
 * the temp fixtures; the stub is registered before importing git.service so
 * this file always links against it (mirroring repository.service.test).
 */

const REPOS = await mkdtemp(join(tmpdir(), "arbor-diff-"));

mock.module("lib/git/storage.config", () => ({
  gitStorageConfig: {
    repositoriesPath: REPOS,
    maxRepoSize: 0,
    defaultBranch: "master",
  },
  // Fixtures are ordinary (non-bare) repos, so the gitdir is the .git subdir
  getRepositoryPath: (owner: string, repo: string) =>
    join(REPOS, owner, repo, ".git"),
  ensureReposDirectory: async () => {},
  ensureOwnerDirectory: async () => {},
  getRepositorySize: async () => 0,
  getOrganizationStorageBytes: async () => 0,
  invalidateRepositorySizeCache: () => {},
}));

// Import AFTER the mock is registered
const { gitService } = await import("./git.service");

const author = { name: "Test", email: "test@arbor.dev" };

// A tiny PNG-like binary blob (PNG magic header + a NUL byte)
const PNG_BYTES = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 1, 2, 3]);

/** Commit shas produced by the fixture, keyed for readability */
const shas: {
  c1: string;
  c2: string;
  c3: string;
} = { c1: "", c2: "", c3: "" };

const OWNER = "alice";
const REPO = "repo";

beforeAll(async () => {
  const dir = join(REPOS, OWNER, REPO);
  await fs.promises.mkdir(dir, { recursive: true });
  await git.init({ fs, dir, defaultBranch: "master" });

  const commit = (message: string) => git.commit({ fs, dir, message, author });
  const write = (name: string, content: string | Uint8Array) =>
    writeFile(join(dir, name), content);
  const add = (filepath: string) => git.add({ fs, dir, filepath });

  // commit 1 (master): a.txt + b.txt
  await write("a.txt", "l1\nl2\n");
  await add("a.txt");
  await write("b.txt", "bbb\n");
  await add("b.txt");
  shas.c1 = await commit("init");

  // branch feature at c1
  await git.branch({ fs, dir, ref: "feature" });

  // advance master with commit 2 (modifies a.txt on master)
  await write("a.txt", "l1\nl2\nmaster\n");
  await add("a.txt");
  shas.c2 = await commit("master advance");

  // switch to feature and make the PR changes as commit 3
  await git.checkout({ fs, dir, ref: "feature" });
  await write("a.txt", "l1\nl2\nl3\n");
  await add("a.txt");
  await fs.promises.rm(join(dir, "b.txt"));
  await git.remove({ fs, dir, filepath: "b.txt" });
  await write("new.txt", "new\n");
  await add("new.txt");
  await write("logo.png", PNG_BYTES);
  await add("logo.png");
  shas.c3 = await commit("feature work");
});

afterAll(async () => {
  await rm(REPOS, { recursive: true, force: true });
});

describe("gitService.getMergeBase", () => {
  test("returns the common ancestor of two branches", async () => {
    const base = await gitService.getMergeBase(
      OWNER,
      REPO,
      "master",
      "feature",
    );
    expect(base).toBe(shas.c1);
  });

  test("returns null for an unknown ref", async () => {
    const base = await gitService.getMergeBase(
      OWNER,
      REPO,
      "master",
      "does-not-exist",
    );
    expect(base).toBeNull();
  });
});

describe("gitService.getChangedFiles", () => {
  test("derives added, modified, deleted and binary/image files", async () => {
    const files = await gitService.getChangedFiles(
      OWNER,
      REPO,
      shas.c1,
      shas.c3,
    );
    const byPath = new Map(files.map((f) => [f.path, f]));

    expect([...byPath.keys()].sort()).toEqual([
      "a.txt",
      "b.txt",
      "logo.png",
      "new.txt",
    ]);

    const a = byPath.get("a.txt");
    expect(a?.status).toBe("MODIFIED");
    expect(a?.additions).toBe(1);
    expect(a?.deletions).toBe(0);
    expect(a?.isBinary).toBe(false);
    expect(a?.isImage).toBe(false);
    expect(a?.oldOid).toBeTruthy();
    expect(a?.newOid).toBeTruthy();

    const b = byPath.get("b.txt");
    expect(b?.status).toBe("DELETED");
    expect(b?.deletions).toBe(1);
    expect(b?.additions).toBe(0);
    expect(b?.newOid).toBeNull();

    const n = byPath.get("new.txt");
    expect(n?.status).toBe("ADDED");
    expect(n?.additions).toBe(1);
    expect(n?.oldOid).toBeNull();

    const png = byPath.get("logo.png");
    expect(png?.status).toBe("ADDED");
    expect(png?.isBinary).toBe(true);
    expect(png?.isImage).toBe(true);
    expect(png?.additions).toBe(0);
    expect(png?.deletions).toBe(0);
  });

  test("treats a null base ref as an empty tree (all added)", async () => {
    const files = await gitService.getChangedFiles(OWNER, REPO, null, shas.c1);
    const statuses = new Set(files.map((f) => f.status));
    expect([...files.map((f) => f.path)].sort()).toEqual(["a.txt", "b.txt"]);
    expect([...statuses]).toEqual(["ADDED"]);
  });

  test("returns an empty list when nothing changed", async () => {
    const files = await gitService.getChangedFiles(
      OWNER,
      REPO,
      shas.c1,
      shas.c1,
    );
    expect(files).toEqual([]);
  });
});

describe("gitService.setDefaultBranch", () => {
  test("points HEAD at an existing branch", async () => {
    const ok = await gitService.setDefaultBranch(OWNER, REPO, "master");
    expect(ok).toBe(true);

    const current = await git.currentBranch({
      fs,
      gitdir: join(REPOS, OWNER, REPO, ".git"),
    });
    expect(current).toBe("master");

    const head = await gitService.getHead(OWNER, REPO);
    expect(head).toBe(shas.c2);
  });

  test("refuses a nonexistent branch and leaves HEAD unchanged", async () => {
    // Anchor HEAD to a known branch first
    await gitService.setDefaultBranch(OWNER, REPO, "master");

    const ok = await gitService.setDefaultBranch(OWNER, REPO, "does-not-exist");
    expect(ok).toBe(false);

    const current = await git.currentBranch({
      fs,
      gitdir: join(REPOS, OWNER, REPO, ".git"),
    });
    expect(current).toBe("master");
  });
});

describe("gitService.getFileDiffContent", () => {
  test("returns old and new text for a modified file", async () => {
    const diff = await gitService.getFileDiffContent(
      OWNER,
      REPO,
      shas.c1,
      shas.c3,
      "a.txt",
    );
    expect(diff?.status).toBe("MODIFIED");
    expect(diff?.isBinary).toBe(false);
    expect(diff?.oldText).toBe("l1\nl2\n");
    expect(diff?.newText).toBe("l1\nl2\nl3\n");
  });

  test("null old text for an added file", async () => {
    const diff = await gitService.getFileDiffContent(
      OWNER,
      REPO,
      shas.c1,
      shas.c3,
      "new.txt",
    );
    expect(diff?.status).toBe("ADDED");
    expect(diff?.oldText).toBeNull();
    expect(diff?.newText).toBe("new\n");
  });

  test("null new text for a deleted file", async () => {
    const diff = await gitService.getFileDiffContent(
      OWNER,
      REPO,
      shas.c1,
      shas.c3,
      "b.txt",
    );
    expect(diff?.status).toBe("DELETED");
    expect(diff?.oldText).toBe("bbb\n");
    expect(diff?.newText).toBeNull();
  });

  test("null text on both sides for a binary file", async () => {
    const diff = await gitService.getFileDiffContent(
      OWNER,
      REPO,
      shas.c1,
      shas.c3,
      "logo.png",
    );
    expect(diff?.isBinary).toBe(true);
    expect(diff?.oldText).toBeNull();
    expect(diff?.newText).toBeNull();
  });

  test("returns null for a path that is absent on both sides", async () => {
    const diff = await gitService.getFileDiffContent(
      OWNER,
      REPO,
      shas.c1,
      shas.c3,
      "missing.txt",
    );
    expect(diff).toBeNull();
  });
});
