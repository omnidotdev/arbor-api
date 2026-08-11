import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawn as spawnProcess, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  checkArborGitHealth,
  createGitServiceClient,
  deleteRepositoryViaBackend,
  getBlobViaBackend,
  getCommitLogViaBackend,
  getCommitViaBackend,
  getRepositoryInfoViaBackend,
  getTreeViaBackend,
  initRepositoryViaBackend,
  listRefsViaBackend,
  receivePackViaBackend,
  renameRepositoryViaBackend,
  repositoryExistsViaBackend,
  resolveRefViaBackend,
  setDefaultBranchViaBackend,
  uploadPackViaBackend,
} from "./grpcClient";

import type { Client } from "@grpc/grpc-js";

/**
 * End-to-end: arbor-api's gRPC client fetches from the real arbor-git daemon.
 * Skips when the arbor-git binary is not built (e.g. CI), so it only runs where
 * the backend is available; where it runs, it exercises the whole Phase 2 read
 * path (client -> gRPC -> arbor-git -> git upload-pack -> packfile).
 */

const BINARY = join(
  import.meta.dir,
  "..",
  "..",
  "..",
  "..",
  "arbor-git",
  "target",
  "debug",
  "arbor-git",
);
const PORT = 53_517;
const OWNER = "owner";
const REPO = "repo";

const git = (args: string[], cwd?: string) =>
  spawnSync("git", args, {
    cwd,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "t",
      GIT_AUTHOR_EMAIL: "t@t",
      GIT_COMMITTER_NAME: "t",
      GIT_COMMITTER_EMAIL: "t@t",
    },
  });

const pktLine = (line: string) =>
  Buffer.from(`${(line.length + 4).toString(16).padStart(4, "0")}${line}`);

const available = existsSync(BINARY);
const maybe = available ? describe : describe.skip;

let server: ReturnType<typeof spawnProcess> | undefined;
let client: Client | undefined;
let oid = "";

maybe("uploadPackViaBackend against a live arbor-git", () => {
  beforeAll(async () => {
    const storage = mkdtempSync(join(tmpdir(), "arbor-git-it-"));

    // Seed a bare repository with one commit at the path arbor-git expects
    const bare = join(storage, OWNER, `${REPO}.git`);
    git(["init", "--bare", "-b", "main", bare]);
    const work = mkdtempSync(join(tmpdir(), "arbor-git-work-"));
    git(["init", "-q", "-b", "main", work]);
    Bun.write(join(work, "f.txt"), "hi");
    git(["add", "."], work);
    git(["commit", "-q", "-m", "c"], work);
    git(["push", "-q", bare, "main:main"], work);
    oid = git(["--git-dir", bare, "rev-parse", "refs/heads/main"])
      .stdout.toString()
      .trim();

    server = spawnProcess(BINARY, {
      env: {
        ...process.env,
        STORAGE_PATH: storage,
        GRPC_PORT: String(PORT),
        HTTP_PORT: String(PORT + 1),
      },
      stdio: "ignore",
    });

    client = createGitServiceClient(`127.0.0.1:${PORT}`);
    // wait for the daemon to accept connections
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (await checkArborGitHealth(client, 500)) break;
    }
  });

  afterAll(() => {
    client?.close();
    server?.kill();
  });

  test("fetches a packfile through the backend", async () => {
    const request = Buffer.concat([
      pktLine(`want ${oid} multi_ack ofs-delta agent=arbor-api-test\n`),
      Buffer.from("0000"),
      pktLine("done\n"),
    ]);

    const result = await uploadPackViaBackend(client!, OWNER, REPO, request);

    expect(result.success).toBe(true);
    expect(result.data.includes(Buffer.from("PACK"))).toBe(true);
  });

  test("lists the repository's branches through the backend", async () => {
    const refs = await listRefsViaBackend(client!, OWNER, REPO);
    const main = refs
      .filter((ref) => ref.type === "REF_TYPE_BRANCH")
      .find((ref) => ref.shortName === "main");

    expect(main).toBeDefined();
    expect(main?.oid).toBe(oid);
    expect(main?.isDefault).toBe(true);
  });

  test("resolves a ref and reads a commit through the backend", async () => {
    const resolved = await resolveRefViaBackend(client!, OWNER, REPO, "main");
    expect(resolved).toBe(oid);

    const head = await resolveRefViaBackend(client!, OWNER, REPO, "HEAD");
    expect(head).toBe(oid);

    const commit = await getCommitViaBackend(client!, OWNER, REPO, oid);
    expect(commit?.oid).toBe(oid);
    expect(commit?.author?.name).toBe("t");
  });

  test("reads commit history through the backend", async () => {
    const commits = await getCommitLogViaBackend(
      client!,
      OWNER,
      REPO,
      "main",
      20,
      0,
    );

    expect(commits.length).toBe(1);
    expect(commits[0]?.oid).toBe(oid);
    expect(commits[0]?.author?.name).toBe("t");
  });

  test("reads the root tree through the backend", async () => {
    const entries = await getTreeViaBackend(client!, OWNER, REPO, "main", "");
    const file = entries.find((entry) => entry.name === "f.txt");

    expect(file).toBeDefined();
    expect(file?.type).toBe("TREE_ENTRY_TYPE_BLOB");
  });

  test("reads a blob's bytes through the backend", async () => {
    const entries = await getTreeViaBackend(client!, OWNER, REPO, "main", "");
    const file = entries.find((entry) => entry.name === "f.txt");
    const bytes = await getBlobViaBackend(client!, OWNER, REPO, file!.oid);

    expect(bytes.toString("utf8")).toBe("hi");
  });

  test("reads repository info through the backend", async () => {
    const info = await getRepositoryInfoViaBackend(client!, OWNER, REPO);
    expect(info?.defaultBranch).toBe("main");
    expect(info?.branchCount).toBe(1);
    expect(info?.tagCount).toBe(0);
  });

  test("sets the default branch through the backend", async () => {
    expect(await setDefaultBranchViaBackend(client!, OWNER, REPO, "main")).toBe(
      true,
    );
    // a nonexistent branch is refused (RefNotFound -> false)
    expect(
      await setDefaultBranchViaBackend(client!, OWNER, REPO, "ghost"),
    ).toBe(false);
  });

  test("creates, checks, and deletes a repository through the backend", async () => {
    expect(await repositoryExistsViaBackend(client!, OWNER, "lifecycle")).toBe(
      false,
    );
    expect(
      await initRepositoryViaBackend(client!, OWNER, "lifecycle", "main"),
    ).toBe(true);
    expect(await repositoryExistsViaBackend(client!, OWNER, "lifecycle")).toBe(
      true,
    );
    expect(await deleteRepositoryViaBackend(client!, OWNER, "lifecycle")).toBe(
      true,
    );
    expect(await repositoryExistsViaBackend(client!, OWNER, "lifecycle")).toBe(
      false,
    );
  });

  test("renames a repository through the backend", async () => {
    expect(
      await initRepositoryViaBackend(client!, OWNER, "before", "main"),
    ).toBe(true);
    expect(
      await renameRepositoryViaBackend(client!, OWNER, "before", "after"),
    ).toBe(true);
    expect(await repositoryExistsViaBackend(client!, OWNER, "before")).toBe(
      false,
    );
    expect(await repositoryExistsViaBackend(client!, OWNER, "after")).toBe(
      true,
    );
    await deleteRepositoryViaBackend(client!, OWNER, "after");
  });

  test("receive-pack round-trips through the backend", async () => {
    // an empty push (just a flush) exercises the ReceivePack transport without
    // needing a hand-built packfile; the upload-pack test already proves data flow
    const result = await receivePackViaBackend(
      client!,
      OWNER,
      REPO,
      "user-1",
      Buffer.from("0000"),
    );

    expect(result.success).toBe(true);
  });
});
