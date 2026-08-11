import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Relative (not the `lib/` alias) so the hook resolves this chain when bun runs
// it with a cwd inside the bare repo, away from the project tsconfig
import { matchesAnyGlob } from "../../auth/refPathMatch";
import { evaluateReceivePack, parseUpdateLines } from "../receivePackGuard";

import type { RefUpdate, ScopeBounds } from "../receivePackGuard";

/**
 * Whether a ref names a protected branch: only `refs/heads/*` refs are subject to
 * branch protection, matched against the rule globs by branch name.
 */
const isProtectedBranch = (patterns: string[], ref: string): boolean => {
  if (!ref.startsWith("refs/heads/")) return false;
  return matchesAnyGlob(patterns, ref.slice("refs/heads/".length));
};

/**
 * Whether advancing `oldOid` to `newOid` rewrites history (a force / non-fast-
 * forward push): true when `oldOid` is NOT an ancestor of `newOid`. Fails closed
 * (treats an unexpected exit as a force-push) so a protected branch is never
 * advanced past an ambiguous check.
 */
const isForcePush = (oldOid: string, newOid: string): boolean => {
  const result = spawnSync("git", [
    "merge-base",
    "--is-ancestor",
    oldOid,
    newOid,
  ]);
  return result.status !== 0;
};

/**
 * Git pre-receive hook enforcing a credential's ref/path bounds against the
 * ACTUAL pushed objects.
 *
 * This is the hard credential boundary for push: it runs server-side inside the
 * bare repo after the pack is quarantined but before any ref updates, so it sees
 * the real ref tuples and can diff the incoming objects rather than trusting the
 * client. A non-zero exit makes git reject the whole push atomically, and this
 * hook's stderr is relayed to the client, so the agent sees why.
 *
 * `git.routes.ts` injects the bounds for the repository being pushed to via
 * `ARBOR_REF_PATTERNS` / `ARBOR_PATH_PATTERNS` (JSON arrays; absent = that
 * dimension is unconfined) and points `core.hooksPath` here, only for confined
 * credentials. An unconfined credential injects nothing and this hook exits 0.
 */

/** A ref update whose target OID is all zeroes is a deletion (nothing to diff) */
const isZeroOid = (oid: string): boolean => /^0+$/.test(oid);

/** Parse an injected pattern env var: JSON array, or null when absent/blank */
const parsePatterns = (raw: string | undefined): string[] | null => {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? (value as string[]) : null;
  } catch {
    return null;
  }
};

/**
 * The repo-relative paths a push introduces: the union of file changes across
 * every commit reachable from the new tip but not already present on any ref
 * (`--not --all`), so intermediate commits count even on a force-push, and a
 * brand-new repository counts its whole history. `--root` includes the initial
 * commit's files.
 */
const changedPathsFor = (newOid: string): string[] => {
  const commits = execFileSync("git", ["rev-list", newOid, "--not", "--all"], {
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);

  const paths = new Set<string>();
  for (const commit of commits) {
    const out = execFileSync(
      "git",
      ["diff-tree", "--no-commit-id", "--name-only", "-r", "--root", commit],
      { encoding: "utf8" },
    );
    for (const path of out.split("\n")) if (path) paths.add(path);
  }
  return [...paths];
};

const run = (): number => {
  const bounds: ScopeBounds = {
    refPatterns: parsePatterns(process.env.ARBOR_REF_PATTERNS),
    pathPatterns: parsePatterns(process.env.ARBOR_PATH_PATTERNS),
  };
  const protectedPatterns =
    parsePatterns(process.env.ARBOR_PROTECTED_REF_PATTERNS) ?? [];

  const confined = bounds.refPatterns !== null || bounds.pathPatterns !== null;

  // Nothing to enforce: no token confinement and no protected branches
  if (!confined && protectedPatterns.length === 0) return 0;

  // Changed paths are only needed when paths are confined; skip the walk for the
  // common ref-only case (e.g. an agent confined to refs/heads/agent/*)
  const needPaths = bounds.pathPatterns !== null;

  const parsed = parseUpdateLines(readFileSync(0, "utf8"));
  const reasons: string[] = [];

  // Branch protection applies to every pusher: a protected branch cannot be
  // deleted or force-pushed
  for (const update of parsed) {
    if (!isProtectedBranch(protectedPatterns, update.ref)) continue;
    if (isZeroOid(update.newOid)) {
      reasons.push(`${update.ref} is a protected branch and cannot be deleted`);
    } else if (
      !isZeroOid(update.oldOid) &&
      isForcePush(update.oldOid, update.newOid)
    ) {
      reasons.push(
        `${update.ref} is a protected branch and cannot be force-pushed`,
      );
    }
  }

  const updates: RefUpdate[] = parsed.map((update) => ({
    ...update,
    changedPaths:
      needPaths && !isZeroOid(update.newOid)
        ? changedPathsFor(update.newOid)
        : [],
  }));

  for (const rejection of evaluateReceivePack(bounds, updates)) {
    reasons.push(rejection.reason);
  }

  if (reasons.length === 0) return 0;
  for (const reason of reasons) {
    process.stderr.write(`arbor: ${reason}\n`);
  }
  return 1;
};

process.exit(run());
