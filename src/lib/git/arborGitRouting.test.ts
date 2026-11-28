import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  Server,
  ServerCredentials,
  loadPackageDefinition,
  status,
} from "@grpc/grpc-js";
import { loadSync } from "@grpc/proto-loader";

import type {
  ServerUnaryCall,
  ServerWritableStream,
  sendUnaryData,
} from "@grpc/grpc-js";

/**
 * With arbor-git configured, the branch, merge, merge-intent, merge-base,
 * file-diff, raw-blob, clone and repository-size operations go to arbor-git
 * and fail closed when it errors, never touching the local `GIT_REPOS_PATH`
 * copy.
 *
 * A fake GitService (a real grpc-js server) records every call and either
 * answers or fails each one. The operations run in a fresh process because the
 * backend gate and storage path are read at import (and other suites mock
 * these modules process-wide). A real local repository sits at
 * `GIT_REPOS_PATH` the whole time, so a fallback would be observable: the
 * control run without the backend shows it would have answered.
 */

const PROTO_PATH = join(import.meta.dir, "proto", "arbor_git.proto");

const SOURCE_TIP = "a".repeat(40);
const LANDED = "b".repeat(40);
const MERGE_BASE = "d".repeat(40);
const NEW_BLOB = "e".repeat(40);
const OLD_BLOB = "f".repeat(40);
const RAW_BLOB = "1".repeat(40);
const MISSING_BLOB = "9".repeat(40);

type Call = { method: string; request: Record<string, unknown> };

/** Start a fake GitService on a free port; `fail` errors every call */
const startFakeBackend = async (fail: boolean) => {
  const definition = loadSync(PROTO_PATH, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const pkg = loadPackageDefinition(definition) as unknown as {
    arbor: { git: { v1: { GitService: { service: never } } } };
  };

  const calls: Call[] = [];
  const unavailable = { code: status.UNAVAILABLE, details: "down" };
  const notFound = { code: status.NOT_FOUND, details: "not found" };

  type Request = Record<string, unknown>;
  const unary =
    (method: string, answer: (request: Request) => unknown) =>
    (
      call: ServerUnaryCall<Request, unknown>,
      callback: sendUnaryData<unknown>,
    ) => {
      calls.push({ method, request: call.request });
      if (fail) return callback(unavailable);
      const response = answer(call.request);
      if (response === notFound) return callback(notFound);
      callback(null, response);
    };

  const name = (request: Request) =>
    (request.repository as { name: string }).name;

  const server = new Server();
  server.addService(pkg.arbor.git.v1.GitService.service, {
    createBranch: unary("createBranch", (request) => ({
      branch: { name: `refs/heads/${request.name}`, oid: SOURCE_TIP },
    })),
    deleteBranch: unary("deleteBranch", () => ({ deleted: true })),
    createTag: unary("createTag", (request) => ({
      tag: { name: `refs/tags/${request.name}`, oid: SOURCE_TIP },
    })),
    deleteTag: unary("deleteTag", () => ({ deleted: true })),
    resolveRef: unary("resolveRef", () => ({ oid: SOURCE_TIP })),
    // Keyed on the target: "done" holds the change already, "diverged" moved
    // on without it, "unrelated" shares no history; "main" can fast-forward
    mergeChange: unary("mergeChange", (request) => {
      switch (request.targetBranch) {
        case "done":
          return { sha: LANDED, mode: "already-merged" };
        case "diverged":
          return request.fastForwardOnly
            ? { sha: "", mode: "out-of-date" }
            : { sha: LANDED, mode: "merge-commit" };
        case "unrelated":
          return { sha: "", mode: "unrelated-histories" };
        default:
          return { sha: LANDED, mode: "fast-forward" };
      }
    }),
    recordMergeIntent: unary("recordMergeIntent", () => ({ recorded: true })),
    getMergeBase: unary("getMergeBase", () => ({
      oid: MERGE_BASE,
      found: true,
    })),
    getRepositorySize: unary("getRepositorySize", (request) =>
      name(request) === "missing" ? notFound : { sizeBytes: "4096" },
    ),
    cloneRepository: unary("cloneRepository", () => ({ cloned: true })),
    // The base ref has no `newdir`, so a file added under it is absent there
    getTree: unary("getTree", (request) =>
      request.ref === "base" && request.path === "newdir"
        ? notFound
        : {
            entries: ["c.txt", "n.txt"].map((entry) => ({
              name: entry,
              oid: request.ref === "head" ? NEW_BLOB : OLD_BLOB,
              mode: "TREE_ENTRY_MODE_FILE",
              type: "TREE_ENTRY_TYPE_BLOB",
            })),
          },
    ),
    getBlob: (call: ServerWritableStream<Request, unknown>) => {
      calls.push({ method: "getBlob", request: call.request });
      if (fail) return call.emit("error", unavailable);
      const oid = call.request.oid;
      if (oid === MISSING_BLOB) return call.emit("error", notFound);
      const text =
        oid === NEW_BLOB ? "new\n" : oid === OLD_BLOB ? "old\n" : "raw-bytes";
      call.write({ data: Buffer.from(text), isLast: true });
      call.end();
    },
  });

  const port = await new Promise<number>((resolve, reject) =>
    server.bindAsync(
      "127.0.0.1:0",
      ServerCredentials.createInsecure(),
      (error, bound) => (error ? reject(error) : resolve(bound)),
    ),
  );

  return { calls, port, stop: () => server.forceShutdown() };
};

/** Every operation under test, run against the gate the env selects */
const SCRIPT = `
  const {
    gitService,
    repositoryService,
    getRepositorySize,
    getOrganizationStorageBytes,
  } = await import(
    ${JSON.stringify(`${import.meta.dir}/index.ts`)}
  );
  const { BASE, HEAD, BLOB } = process.env;
  const text = (v) => (v instanceof Uint8Array ? Buffer.from(v).toString() : v);
  const run = async (fn) => {
    try {
      return { value: text(await fn()) ?? null };
    } catch {
      return { threw: true };
    }
  };
  const author = { name: "t", email: "t@t" };
  const backend = process.env.USE_ARBOR_GIT === "true";
  // An organization repository: its org slug differs from the owning member's
  // username, and storage is keyed by the username
  const orgDb = {
    query: {
      repositoryTable: {
        findMany: async () => [
          {
            slug: "r",
            ownerId: "u1",
            organizationId: "org1",
            owner: { username: "o" },
            organization: { slug: "omni" },
          },
        ],
      },
    },
  };
  const out = {
    getMergeBase: await run(() =>
      gitService.getMergeBase("o", "r", "refs/heads/main", "refs/heads/feature"),
    ),
    getFileDiffContent: await run(() =>
      gitService.getFileDiffContent("o", "r", backend ? "base" : BASE, backend ? "head" : HEAD, "c.txt"),
    ),
    getFileDiffContentAdded: await run(() =>
      gitService.getFileDiffContent("o", "r", "base", "head", "newdir/n.txt"),
    ),
    getBlobRawByOid: await run(() => gitService.getBlobRawByOid("o", "r", BLOB)),
    getBlobRawByOidMissing: await run(() =>
      gitService.getBlobRawByOid("o", "r", "${MISSING_BLOB}"),
    ),
    getRepositorySize: await run(() => getRepositorySize("o", "r")),
    getRepositorySizeMissing: await run(() => getRepositorySize("o", "missing")),
    getOrganizationStorageBytes: await run(() =>
      getOrganizationStorageBytes("org1", orgDb),
    ),
    recordMergeIntent: await run(() =>
      gitService.recordMergeIntent("o", "r", "chg", HEAD),
    ),
    merge: await run(() =>
      gitService.merge("o", "r", "feature", "main", author, "land"),
    ),
    mergeAlreadyMerged: await run(() =>
      gitService.merge("o", "r", "feature", "done", author, "land"),
    ),
    mergeOutOfDate: await run(() =>
      gitService.merge("o", "r", "feature", "diverged", author, "land"),
    ),
    mergeUnrelated: await run(() =>
      gitService.merge("o", "r", "feature", "unrelated", author, "land"),
    ),
    landUnrelated: await run(() =>
      gitService.mergeChangeIntoBranch("o", "r", HEAD, "unrelated", author, "land"),
    ),
    createBranch: await run(() => gitService.createBranch("o", "r", "x", HEAD)),
    clone: await run(() =>
      repositoryService.clone("o", "cloned", "https://example.invalid/r.git"),
    ),
    createTagRef: await run(() =>
      gitService.createRef("o", "r", "refs/tags/v2", HEAD),
    ),
    deleteTagRef: await run(() =>
      gitService.deleteRef("o", "r", "refs/tags/release"),
    ),
    deleteOtherRef: await run(() =>
      gitService.deleteRef("o", "r", "refs/remotes/origin/main"),
    ),
    // Crafted names that would address a ref of the other kind
    deleteTagNamedLikeDefault: await run(() =>
      gitService.deleteRef("o", "r", "refs/tags/refs/heads/main"),
    ),
    deleteBranchNamedLikeTag: await run(() =>
      gitService.deleteRef("o", "r", "refs/heads/refs/tags/v2"),
    ),
    deleteTagShortQualified: await run(() =>
      gitService.deleteTag("o", "r", "refs/heads/main"),
    ),
    deleteBranchShortQualified: await run(() =>
      gitService.deleteBranch("o", "r", "refs/tags/v2"),
    ),
    deleteBranch: await run(() => gitService.deleteBranch("o", "r", "feature")),
  };
  console.log(JSON.stringify(out));
  process.exit(0);
`;

type Result = { value?: unknown; threw?: true };

const runOperations = async (env: Record<string, string>) => {
  const proc = Bun.spawn([process.execPath, "-e", SCRIPT], {
    cwd: `${import.meta.dir}/../../..`,
    env: { ...hostEnv, USE_ARBOR_GIT: "", GIT_SERVICE_URL: "", ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return JSON.parse(out.trim().split("\n").at(-1) ?? "") as Record<
    string,
    Result
  >;
};

// A git hook exports its repository's GIT_* variables; never let them aim the
// fixture at the wrong repository
const { GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE, ...hostEnv } = process.env;

const git = (args: string[], cwd?: string) =>
  execFileSync("git", args, {
    cwd,
    env: {
      ...hostEnv,
      GIT_AUTHOR_NAME: "t",
      GIT_AUTHOR_EMAIL: "t@t",
      GIT_COMMITTER_NAME: "t",
      GIT_COMMITTER_EMAIL: "t@t",
    },
  })
    .toString()
    .trim();

let reposPath = "";
let bare = "";
let localEnv: Record<string, string> = {};

/** Every ref in the local copy, to prove nothing was written there */
const localRefs = () => git(["--git-dir", bare, "for-each-ref"]);

beforeAll(() => {
  reposPath = mkdtempSync(join(tmpdir(), "arbor-routing-"));
  bare = join(reposPath, "o", "r.git");
  git(["init", "-q", "--bare", "-b", "main", bare]);

  const work = mkdtempSync(join(tmpdir(), "arbor-routing-work-"));
  git(["init", "-q", "-b", "main"], work);
  git(["commit", "-q", "--allow-empty", "-m", "a"], work);
  const base = git(["rev-parse", "HEAD"], work);
  git(["push", "-q", bare, "main:main"], work);
  git(["checkout", "-q", "-b", "feature"], work);
  writeFileSync(join(work, "c.txt"), "c\n");
  git(["add", "."], work);
  git(["commit", "-q", "-m", "c"], work);
  const head = git(["rev-parse", "HEAD"], work);
  git(["push", "-q", bare, "feature:feature"], work);
  // A target that moved on without the feature, and one sharing no history
  git(["checkout", "-q", "-b", "diverged", base], work);
  writeFileSync(join(work, "d.txt"), "d\n");
  git(["add", "."], work);
  git(["commit", "-q", "-m", "d"], work);
  const diverged = git(["rev-parse", "HEAD"], work);
  git(["push", "-q", bare, "diverged:diverged"], work);
  git(["checkout", "-q", "--orphan", "unrelated"], work);
  git(["rm", "-rq", "--cached", "."], work);
  git(["commit", "-q", "--allow-empty", "-m", "u"], work);
  const unrelated = git(["rev-parse", "HEAD"], work);
  git(["push", "-q", bare, "unrelated:unrelated"], work);
  git(["checkout", "-q", "-f", "feature"], work);
  // A tag and a branch sharing one name, so deleting the tag can be shown to
  // leave the branch alone
  git(["push", "-q", bare, `${base}:refs/heads/release`], work);
  git(["push", "-q", bare, `${head}:refs/tags/release`], work);
  const blob = git(["rev-parse", "HEAD:c.txt"], work);
  rmSync(work, { recursive: true, force: true });

  localEnv = {
    GIT_REPOS_PATH: reposPath,
    BASE: base,
    HEAD: head,
    BLOB: blob,
    DIVERGED: diverged,
    UNRELATED: unrelated,
  };
});

afterAll(() => {
  rmSync(reposPath, { recursive: true, force: true });
});

describe("git operations with arbor-git configured", () => {
  test("go to arbor-git and never touch the local copy", async () => {
    const backend = await startFakeBackend(false);
    try {
      const before = localRefs();
      const out = await runOperations({
        ...localEnv,
        BLOB: RAW_BLOB,
        USE_ARBOR_GIT: "true",
        GIT_SERVICE_URL: `127.0.0.1:${backend.port}`,
      });

      expect(out.getMergeBase).toEqual({ value: MERGE_BASE });
      expect(out.getFileDiffContent).toEqual({
        value: {
          path: "c.txt",
          status: "MODIFIED",
          isBinary: false,
          oldText: "old\n",
          newText: "new\n",
        },
      });
      // the base side's missing directory reads as absent, not as a failure
      expect(out.getFileDiffContentAdded).toMatchObject({
        value: { status: "ADDED" },
      });
      expect(out.getBlobRawByOid).toEqual({ value: "raw-bytes" });
      expect(out.getBlobRawByOidMissing).toEqual({ value: null });
      expect(out.getRepositorySize).toEqual({ value: 4096 });
      expect(out.getRepositorySizeMissing).toEqual({ value: 0 });
      expect(out.recordMergeIntent).toEqual({ value: true });
      expect(out.merge).toEqual({ value: { sha: LANDED } });
      // a diverged or unrelated target is refused, never rewritten
      expect(out.mergeOutOfDate).toEqual({
        value: {
          sha: null,
          error:
            "The branch is out of date with its target, update it first and try again",
        },
      });
      expect(out.mergeUnrelated).toEqual({
        value: { sha: null, error: "No common ancestor found" },
      });
      expect(out.landUnrelated).toMatchObject({
        value: { sha: null, error: "No common ancestor found" },
      });
      expect(out.mergeAlreadyMerged).toEqual({
        value: { sha: null, error: "Source branch is already merged" },
      });
      expect(out.createBranch).toEqual({ value: true });
      expect(out.clone).toEqual({ value: true });
      expect(out.deleteBranch).toEqual({ value: true });
      expect(out.createTagRef).toEqual({ value: true });
      expect(out.deleteTagRef).toEqual({ value: true });
      expect(out.deleteOtherRef).toEqual({ value: false });
      for (const op of [
        "deleteTagNamedLikeDefault",
        "deleteBranchNamedLikeTag",
        "deleteTagShortQualified",
        "deleteBranchShortQualified",
      ]) {
        expect({ op, ...out[op] }).toEqual({ op, value: false });
      }
      // none of the crafted names reached the backend
      expect(
        backend.calls.filter(
          (call) =>
            (call.method === "deleteTag" || call.method === "deleteBranch") &&
            String(call.request.name).includes("refs/"),
        ),
      ).toEqual([]);
      // the org repository is measured under its owner's username
      expect(out.getOrganizationStorageBytes).toEqual({ value: 4096 });

      const methods = new Set(backend.calls.map((call) => call.method));
      for (const method of [
        "getMergeBase",
        "getTree",
        "getBlob",
        "getRepositorySize",
        "recordMergeIntent",
        "resolveRef",
        "mergeChange",
        "createBranch",
        "cloneRepository",
        "deleteBranch",
      ]) {
        expect(methods.has(method)).toBe(true);
      }

      const find = (method: string) =>
        backend.calls.find((call) => call.method === method)?.request;
      expect(find("createBranch")).toMatchObject({
        repository: { owner: "o", name: "r" },
        name: "x",
        startPoint: localEnv.HEAD,
      });
      // never forced, so the backend also refuses the default branch
      expect(find("deleteBranch")).toMatchObject({
        name: "feature",
        force: false,
      });
      // the PR merge lands the resolved source tip onto the target branch
      expect(find("resolveRef")).toMatchObject({ ref: "refs/heads/feature" });
      // pull request merges are fast-forward only
      expect(find("mergeChange")).toMatchObject({
        commitOid: SOURCE_TIP,
        targetBranch: "main",
        message: "land",
        fastForwardOnly: true,
      });
      expect(find("recordMergeIntent")).toMatchObject({
        changeId: "chg",
        oid: localEnv.HEAD,
      });
      expect(find("getMergeBase")).toMatchObject({
        refA: "refs/heads/main",
        refB: "refs/heads/feature",
      });
      // a refs/tags/* name goes to the tag RPCs and never deletes a branch
      expect(find("createTag")).toMatchObject({
        name: "v2",
        target: localEnv.HEAD,
      });
      expect(find("deleteTag")).toMatchObject({ name: "release" });
      expect(
        backend.calls.filter(
          (call) =>
            call.method === "deleteBranch" && call.request.name !== "feature",
        ),
      ).toEqual([]);
      expect(
        backend.calls
          .filter((call) => call.method === "getRepositorySize")
          .map((call) => call.request.repository),
      ).toContainEqual({ owner: "o", name: "r" });
      expect(
        backend.calls.some(
          (call) =>
            (call.request.repository as { owner?: string })?.owner === "omni",
        ),
      ).toBe(false);
      expect(find("cloneRepository")).toMatchObject({
        repository: { owner: "o", name: "cloned" },
        url: "https://example.invalid/r.git",
      });

      expect(localRefs()).toBe(before);
    } finally {
      backend.stop();
    }
  }, 30_000);

  test("fail closed when arbor-git errors, with no local fallback", async () => {
    const backend = await startFakeBackend(true);
    try {
      const before = localRefs();
      const out = await runOperations({
        ...localEnv,
        USE_ARBOR_GIT: "true",
        GIT_SERVICE_URL: `127.0.0.1:${backend.port}`,
      });

      // reads that have a legitimate "absent" answer reject instead of
      // reporting a guess
      for (const op of [
        "getMergeBase",
        "getFileDiffContent",
        "getFileDiffContentAdded",
        "getBlobRawByOid",
        "getRepositorySize",
      ]) {
        expect({ op, ...out[op] }).toEqual({ op, threw: true });
      }

      // mutations report failure, so the request fails
      expect(out.recordMergeIntent).toEqual({ value: false });
      expect(out.createBranch).toEqual({ value: false });
      expect(out.deleteBranch).toEqual({ value: false });
      expect(out.clone).toEqual({ value: false });
      expect(out.createTagRef).toEqual({ value: false });
      expect(out.deleteTagRef).toEqual({ value: false });
      expect(out.getOrganizationStorageBytes).toEqual({ threw: true });
      expect(out.merge).toMatchObject({ value: { sha: null } });

      // every operation reached the backend, and none wrote the local copy
      expect(backend.calls.length).toBeGreaterThan(0);
      expect(localRefs()).toBe(before);
    } finally {
      backend.stop();
    }
  }, 30_000);

  test("control: without arbor-git the local copy answers", async () => {
    const out = await runOperations(localEnv);

    expect(out.getMergeBase).toEqual({ value: localEnv.BASE });
    expect(out.getBlobRawByOid).toEqual({ value: "c\n" });
    expect(out.getFileDiffContent).toMatchObject({
      value: { status: "ADDED" },
    });
    // deleting refs/tags/release removed only the tag; branch release is intact
    expect(out.deleteTagRef).toEqual({ value: true });
    expect(git(["--git-dir", bare, "tag", "--list", "release"])).toBe("");
    expect(git(["--git-dir", bare, "rev-parse", "refs/heads/release"])).toBe(
      localEnv.BASE ?? "",
    );
    expect(out.createTagRef).toEqual({ value: true });
    expect(git(["--git-dir", bare, "rev-parse", "refs/tags/v2"])).toBe(
      localEnv.HEAD ?? "",
    );
    expect(out.deleteOtherRef).toEqual({ value: false });
    // crafted names are refused and the default branch and tag v2 survive
    for (const op of [
      "deleteTagNamedLikeDefault",
      "deleteBranchNamedLikeTag",
      "deleteTagShortQualified",
      "deleteBranchShortQualified",
    ]) {
      expect({ op, ...out[op] }).toEqual({ op, value: false });
    }
    expect(git(["--git-dir", bare, "rev-parse", "refs/tags/v2"])).toBe(
      localEnv.HEAD ?? "",
    );
    // the in-process merge is fast-forward only too, and leaves a diverged or
    // unrelated target exactly where it was
    expect(out.mergeOutOfDate).toMatchObject({ value: { sha: null } });
    expect(out.mergeUnrelated).toEqual({
      value: { sha: null, error: "No common ancestor found" },
    });
    expect(out.landUnrelated).toMatchObject({
      value: { sha: null, error: "No common ancestor found" },
    });
    expect(git(["--git-dir", bare, "rev-parse", "refs/heads/diverged"])).toBe(
      localEnv.DIVERGED ?? "",
    );
    expect(git(["--git-dir", bare, "rev-parse", "refs/heads/unrelated"])).toBe(
      localEnv.UNRELATED ?? "",
    );
    // the fast-forward merge moved main to the feature tip
    expect(git(["--git-dir", bare, "rev-parse", "refs/heads/main"])).toBe(
      localEnv.HEAD ?? "",
    );
    expect(out.createBranch).toEqual({ value: true });
    expect(git(["--git-dir", bare, "rev-parse", "refs/heads/x"])).toBe(
      localEnv.HEAD ?? "",
    );
  }, 30_000);
});
