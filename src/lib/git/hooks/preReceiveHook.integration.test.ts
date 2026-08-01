import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { buildReceivePackHookEnv } from "../smart-http.service";

import type { ScopeBounds } from "../receivePackGuard";

/**
 * End-to-end proof of the git push credential boundary: a real `git push` into a
 * bare repo whose `core.hooksPath` is this project's pre-receive hook, with the
 * token's ref/path bounds passed in the environment exactly as `git.routes.ts`
 * injects them. Exercises the parts the pure guard test cannot: stdin parsing,
 * the `git rev-list`/`diff-tree` path resolution, and the non-zero exit that
 * makes git reject the push atomically.
 */

const HOOKS_DIR = dirname(new URL(import.meta.url).pathname);

/** Whether the git binary is available; the boundary is git-native */
const hasGit = spawnSync("git", ["--version"]).status === 0;

const git = (cwd: string, args: string[], env?: Record<string, string>) =>
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });

/**
 * Push origin HEAD to a ref, running the server-side receive-pack exactly as the
 * arbor-api edge does when confined: `git -c core.hooksPath=<dir> receive-pack`
 * (via `--receive-pack`) plus the `ARBOR_*` pattern env from the production
 * `buildReceivePackHookEnv`. An unconfined push (null bounds) uses neither, so it
 * runs the plumbing directly like production. This exercises the real hook-firing
 * mechanism, not just the hook script.
 */
const push = (
  workDir: string,
  ref: string,
  bounds: ScopeBounds | null,
): { ok: boolean; stderr: string } => {
  const args = ["push", "origin", `HEAD:${ref}`];
  if (bounds !== null)
    args.push(`--receive-pack=git -c core.hooksPath=${HOOKS_DIR} receive-pack`);

  const result = spawnSync("git", args, {
    cwd: workDir,
    encoding: "utf8",
    env: { ...process.env, ...buildReceivePackHookEnv(bounds) },
  });
  return { ok: result.status === 0, stderr: result.stderr ?? "" };
};

let root: string;
let bare: string;
let work: string;

const setupWorkAt = (name: string, files: Record<string, string>) => {
  const dir = join(root, name);
  execFileSync("git", ["init", "-q", "-b", "master", dir]);
  git(dir, ["config", "user.email", "t@t.dev"]);
  git(dir, ["config", "user.name", "t"]);
  for (const [path, content] of Object.entries(files)) {
    const abs = join(dir, path);
    execFileSync("mkdir", ["-p", dirname(abs)]);
    writeFileSync(abs, content);
  }
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-q", "-m", "seed"]);
  git(dir, ["remote", "add", "origin", bare]);
  return dir;
};

beforeAll(async () => {
  if (!hasGit) return;
  root = mkdtempSync(join(tmpdir(), "arbor-boundary-"));
  bare = join(root, "remote.git");
  await mkdir(bare, { recursive: true });
  execFileSync("git", ["init", "-q", "--bare", bare]);
  // the hook is pointed at per-push via GIT_CONFIG_* env (see push), exactly as
  // the edge injects it; nothing is persisted into the bare repo config
  work = setupWorkAt("work", { "src/a.ts": "export const a = 1;\n" });
});

afterAll(() => {
  if (root) rmSync(root, { recursive: true, force: true });
});

describe.if(hasGit)("pre-receive hook boundary", () => {
  test("rejects a push to a ref outside the token's ref patterns", () => {
    const { ok, stderr } = push(work, "refs/heads/master", {
      refPatterns: ["refs/heads/agent/*"],
      pathPatterns: null,
    });
    expect(ok).toBe(false);
    expect(stderr).toContain("outside this token's scope");
  });

  test("allows a push to a ref inside the token's ref patterns", () => {
    const { ok } = push(work, "refs/heads/agent/task-1", {
      refPatterns: ["refs/heads/agent/*"],
      pathPatterns: null,
    });
    expect(ok).toBe(true);
  });

  test("rejects a push whose new commit touches a path outside the path patterns", () => {
    const dir = setupWorkAt("work-infra", { "infra/prod.tf": "resource {}\n" });
    const { ok, stderr } = push(dir, "refs/heads/feature", {
      refPatterns: null,
      pathPatterns: ["src/**"],
    });
    expect(ok).toBe(false);
    expect(stderr).toContain("infra/prod.tf");
  });

  test("allows a push whose new commits stay within the path patterns", () => {
    const dir = setupWorkAt("work-src", {
      "src/b.ts": "export const b = 2;\n",
    });
    const { ok } = push(dir, "refs/heads/feature-src", {
      refPatterns: null,
      pathPatterns: ["src/**"],
    });
    expect(ok).toBe(true);
  });

  test("an unconfined push (null bounds) is unaffected", () => {
    const dir = setupWorkAt("work-open", { "anywhere/x": "x\n" });
    const { ok } = push(dir, "refs/heads/open", null);
    expect(ok).toBe(true);
  });
});
