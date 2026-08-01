import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { evaluateReceivePack, parseUpdateLines } from "../receivePackGuard";

import type { RefUpdate, ScopeBounds } from "../receivePackGuard";

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

  // Unconfined in both dimensions: nothing for the boundary to enforce
  if (bounds.refPatterns === null && bounds.pathPatterns === null) return 0;

  // Changed paths are only needed when paths are confined; skip the walk for the
  // common ref-only case (e.g. an agent confined to refs/heads/agent/*)
  const needPaths = bounds.pathPatterns !== null;

  const updates: RefUpdate[] = parseUpdateLines(readFileSync(0, "utf8")).map(
    (update) => ({
      ...update,
      changedPaths:
        needPaths && !isZeroOid(update.newOid)
          ? changedPathsFor(update.newOid)
          : [],
    }),
  );

  const rejections = evaluateReceivePack(bounds, updates);
  if (rejections.length === 0) return 0;

  for (const rejection of rejections) {
    process.stderr.write(
      `arbor: rejected ${rejection.ref}: ${rejection.reason}\n`,
    );
  }
  return 1;
};

process.exit(run());
