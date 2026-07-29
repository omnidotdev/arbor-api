/**
 * Access-token scope.
 *
 * A credential answers two questions before it may act: how far it may go
 * (read or write) and which repositories it may touch. Session tokens from the
 * IDP carry the user's full authority, but an agent access token is deliberately
 * narrower, so an agent that is compromised or simply wrong cannot reach beyond
 * the repositories it was issued for.
 */
export interface TokenScope {
  /** Furthest operation the token may perform */
  permission: "read" | "write";
  /**
   * Repositories the token is confined to. `null` means the token is not
   * confined and reaches everything its owning user can reach; an empty array
   * reaches nothing.
   */
  repositoryIds: string[] | null;
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
  repositoryIds: null,
};

/** Whether the scope permits a mutating operation */
export const scopeAllowsWrite = (scope: TokenScope): boolean =>
  scope.permission === "write";

/**
 * Whether the scope permits touching a repository.
 *
 * An unconfined scope (`repositoryIds: null`) allows any repository; otherwise
 * the repository must be named explicitly, so an empty whitelist fails closed.
 */
export const scopeAllowsRepository = (
  scope: TokenScope,
  repositoryId: string,
): boolean =>
  scope.repositoryIds === null || scope.repositoryIds.includes(repositoryId);
