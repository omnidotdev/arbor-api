// Relative (not the `lib/` alias) so the pre-receive hook resolves this chain
// when bun runs it with a cwd inside the bare repo, away from the project tsconfig
import { matchesAnyGlob } from "../auth/refPathMatch";

/**
 * Pure decision logic for the git push credential boundary.
 *
 * The pre-receive hook (see `hooks/pre-receive`) resolves the raw side of a push
 * - the ref update tuples on stdin and the paths the new objects change - and
 * hands them here. Keeping the decision pure means it is unit-tested exhaustively
 * and shares the exact glob semantics used everywhere else (`refPathMatch`), so a
 * confined credential means the same thing at the push boundary as it does in the
 * GraphQL and MCP gates.
 */

/** A ref update and the repo-relative paths its new objects change */
export interface RefUpdate {
  oldOid: string;
  newOid: string;
  ref: string;
  /** Paths the update introduces; empty for a deletion */
  changedPaths: string[];
}

/** The confinement for the repository being pushed to (`null` = unconfined) */
export interface ScopeBounds {
  refPatterns: string[] | null;
  pathPatterns: string[] | null;
}

/** A single ref update the boundary refuses, with a client-facing reason */
export interface UpdateRejection {
  ref: string;
  reason: string;
}

/** A parsed pre-receive line, before its changed paths are resolved */
export interface ParsedUpdate {
  oldOid: string;
  newOid: string;
  ref: string;
}

/**
 * Parse the pre-receive hook's stdin: one `<old-oid> <new-oid> <ref>` per line.
 * Blank lines are ignored so a trailing newline does not produce an empty update.
 */
export const parseUpdateLines = (input: string): ParsedUpdate[] =>
  input
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const [oldOid, newOid, ref] = line.split(" ");
      return { oldOid: oldOid ?? "", newOid: newOid ?? "", ref: ref ?? "" };
    });

/** Whether a ref is within the bounds (`null` patterns = every ref) */
const refAllowed = (bounds: ScopeBounds, ref: string): boolean =>
  bounds.refPatterns === null || matchesAnyGlob(bounds.refPatterns, ref);

/** The first changed path outside the bounds, or null when all are allowed */
const firstForbiddenPath = (
  bounds: ScopeBounds,
  changedPaths: string[],
): string | null => {
  if (bounds.pathPatterns === null) return null;
  return (
    changedPaths.find(
      (path) => !matchesAnyGlob(bounds.pathPatterns ?? [], path),
    ) ?? null
  );
};

/**
 * Decide which ref updates a confined credential may not make.
 *
 * Each update is judged independently: its ref must be in bounds, and every path
 * its new objects change must be in bounds. A deletion carries no changed paths,
 * so it is judged on its ref alone. Returns one rejection per refused update
 * (empty means the whole push is allowed).
 */
export const evaluateReceivePack = (
  bounds: ScopeBounds,
  updates: RefUpdate[],
): UpdateRejection[] => {
  const rejections: UpdateRejection[] = [];

  for (const update of updates) {
    if (!refAllowed(bounds, update.ref)) {
      rejections.push({
        ref: update.ref,
        reason: `ref ${update.ref} is outside this token's scope`,
      });
      continue;
    }

    const forbidden = firstForbiddenPath(bounds, update.changedPaths);
    if (forbidden !== null) {
      rejections.push({
        ref: update.ref,
        reason: `path ${forbidden} is outside this token's scope`,
      });
    }
  }

  return rejections;
};
