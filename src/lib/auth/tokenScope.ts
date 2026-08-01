import { matchesAnyGlob } from "./refPathMatch";

/**
 * Access-token scope.
 *
 * A credential answers three questions before it may act: how far it may go
 * (read or write), which repositories it may touch, and - within each of those
 * repositories - which refs and paths. Session tokens from the IDP carry the
 * user's full authority, but an agent access token is deliberately narrower, so
 * an agent that is compromised or simply wrong cannot reach beyond the refs and
 * paths it was issued for.
 */

/**
 * A repository the token is confined to, with the refs and paths it may touch
 * inside it.
 *
 * `refPatterns` / `pathPatterns` are glob patterns (see `refPathMatch`). `null`
 * means the dimension is unconfined (every ref, every path); an empty array
 * matches nothing, so it fails closed. Confinement is expressed per named
 * repository: a token confined to `refs/heads/agent/*` in one repository says
 * nothing about any other.
 */
export interface RepositoryScope {
  repositoryId: string;
  /** Refs the token may touch in this repository, in full form; null = all */
  refPatterns: string[] | null;
  /** Repo-relative paths the token may modify here; null = all */
  pathPatterns: string[] | null;
}

export interface TokenScope {
  /** Furthest operation the token may perform */
  permission: "read" | "write";
  /**
   * Repositories the token is confined to. `null` means the token is not
   * confined and reaches everything its owning user can reach; an empty array
   * reaches nothing.
   */
  repositories: RepositoryScope[] | null;
}

/**
 * Scope carrying the owner's full authority.
 *
 * This is what an IDP session token gets, and what a token created before
 * scoping existed falls back to, so adding scopes never silently narrows an
 * existing credential.
 */
export const UNRESTRICTED_SCOPE: TokenScope = {
  permission: "write",
  repositories: null,
};

/** Whether the scope permits a mutating operation */
export const scopeAllowsWrite = (scope: TokenScope): boolean =>
  scope.permission === "write";

/**
 * The scope's confinement for a repository, or null when the scope does not
 * confine it (either unrestricted, or the repository is outside the whitelist).
 * Distinguishes "unrestricted" from "not listed" via the second return value so
 * callers can fail closed on the latter.
 */
const repositoryBound = (
  scope: TokenScope,
  repositoryId: string,
): { unrestricted: boolean; bound: RepositoryScope | null } => {
  if (scope.repositories === null) return { unrestricted: true, bound: null };
  const bound =
    scope.repositories.find((r) => r.repositoryId === repositoryId) ?? null;
  return { unrestricted: false, bound };
};

/**
 * Whether the scope permits touching a repository.
 *
 * An unconfined scope (`repositories: null`) allows any repository; otherwise
 * the repository must be named explicitly, so an empty whitelist fails closed.
 */
export const scopeAllowsRepository = (
  scope: TokenScope,
  repositoryId: string,
): boolean => {
  const { unrestricted, bound } = repositoryBound(scope, repositoryId);
  return unrestricted || bound !== null;
};

/**
 * The ref/path confinement the push boundary must enforce for a repository, or
 * null when there is nothing to enforce (an unrestricted scope, a repository the
 * scope does not list, or one confined only at the repository level with no
 * ref/path limits). `git.routes.ts` injects the returned bounds into the
 * pre-receive hook only when this is non-null, so an unconfined push keeps its
 * current zero-overhead path.
 */
export const scopeBoundsForRepository = (
  scope: TokenScope,
  repositoryId: string,
): { refPatterns: string[] | null; pathPatterns: string[] | null } | null => {
  const { unrestricted, bound } = repositoryBound(scope, repositoryId);
  if (unrestricted || !bound) return null;
  if (bound.refPatterns === null && bound.pathPatterns === null) return null;
  return { refPatterns: bound.refPatterns, pathPatterns: bound.pathPatterns };
};

/**
 * Whether the scope permits touching a ref in a repository.
 *
 * Unrestricted scope allows any ref. Otherwise the repository must be listed
 * (fail closed if not), and either its ref patterns are `null` (all refs) or the
 * ref matches one. `refName` is the full ref (`refs/heads/agent/task-1`).
 */
export const scopeAllowsRef = (
  scope: TokenScope,
  repositoryId: string,
  refName: string,
): boolean => {
  const { unrestricted, bound } = repositoryBound(scope, repositoryId);
  if (unrestricted) return true;
  if (!bound) return false;
  if (bound.refPatterns === null) return true;
  return matchesAnyGlob(bound.refPatterns, refName);
};

/**
 * Whether the scope permits modifying a path in a repository.
 *
 * Unrestricted scope allows any path. Otherwise the repository must be listed
 * (fail closed if not), and either its path patterns are `null` (all paths) or
 * the path matches one. `path` is repo-relative POSIX (`src/lib/git/hook.ts`).
 */
export const scopeAllowsPath = (
  scope: TokenScope,
  repositoryId: string,
  path: string,
): boolean => {
  const { unrestricted, bound } = repositoryBound(scope, repositoryId);
  if (unrestricted) return true;
  if (!bound) return false;
  if (bound.pathPatterns === null) return true;
  return matchesAnyGlob(bound.pathPatterns, path);
};
