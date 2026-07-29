import { scopeAllowsRepository, scopeAllowsWrite } from "lib/auth/tokenScope";
import { dbPool } from "lib/db/db";
import {
  canReadRepository,
  canWriteRepository,
  resolveRepositorySummary,
} from "lib/git";

import type { RepositorySummary } from "lib/git";
import type { McpCaller } from "./auth";

/**
 * Repository access gates for the MCP tool surface.
 *
 * Every tool reaches a repository through one of these, which makes them the
 * single place a credential's scope is enforced. Two checks run in order: the
 * limits of the presented credential, then the permissions of the user it
 * authenticates as. An agent token confined to one repository is therefore
 * refused elsewhere even though its owner has access, which is what makes
 * "did the agent stay in bounds" answerable.
 *
 * All gates FAIL CLOSED and report missing and forbidden identically, so a tool
 * never reveals the existence of a repository the caller may not see.
 */

/**
 * Whether the caller may read a repository they already hold a summary for.
 *
 * Used by the listing tools, which filter a candidate set rather than resolving
 * one repository. A repository outside the credential's whitelist is filtered
 * out even when its owner may read it, so an enumeration cannot be used to
 * discover what lies outside a confined token's bounds.
 */
export const callerMayRead = async (
  caller: McpCaller,
  repository: RepositorySummary,
): Promise<boolean> => {
  if (!scopeAllowsRepository(caller.scope, repository.id)) return false;

  return await canReadRepository(caller.user, repository);
};

/**
 * Resolve a repository and enforce read access for the caller.
 *
 * Returns the repository summary when the caller may read it, or null (with no
 * distinction between missing and forbidden) otherwise.
 */
export const gateRead = async (
  caller: McpCaller,
  owner: string,
  repo: string,
): Promise<RepositorySummary | null> => {
  const repository = await resolveRepositorySummary(owner, repo);
  if (!repository) return null;

  if (!(await callerMayRead(caller, repository))) return null;

  return repository;
};

/**
 * Resolve a repository and enforce write access for the caller.
 *
 * Returns the repository summary when the caller may write to it, or null (with
 * no distinction between missing and forbidden) otherwise. Reuses the same
 * write gate as the Smart-HTTP git routes and the GraphQL mutations.
 */
export const gateWrite = async (
  caller: McpCaller,
  owner: string,
  repo: string,
): Promise<RepositorySummary | null> => {
  const repository = await resolveRepositorySummary(owner, repo);
  if (!repository) return null;

  if (!scopeAllowsWrite(caller.scope)) return null;
  if (!scopeAllowsRepository(caller.scope, repository.id)) return null;

  if (!(await canWriteRepository(caller.user, repository))) return null;

  return repository;
};

/**
 * Enforce write access for the caller against a repository resolved by id.
 *
 * Used by the stack and change tools, which reach the repository through a stack
 * or change row rather than an owner/slug pair. Returns the summary when the
 * caller may write, or null otherwise (missing and forbidden are indistinguishable).
 */
export const gateWriteByRepositoryId = async (
  caller: McpCaller,
  repositoryId: string,
): Promise<RepositorySummary | null> => {
  const row = await dbPool.query.repositoryTable.findFirst({
    where: (table, { eq: eqOp }) => eqOp(table.id, repositoryId),
    columns: {
      id: true,
      visibility: true,
      ownerId: true,
      organizationId: true,
    },
  });
  if (!row) return null;

  const summary: RepositorySummary = {
    id: row.id,
    visibility: row.visibility,
    ownerId: row.ownerId,
    organizationId: row.organizationId,
  };

  if (!scopeAllowsWrite(caller.scope)) return null;
  if (!scopeAllowsRepository(caller.scope, summary.id)) return null;

  if (!(await canWriteRepository(caller.user, summary))) return null;

  return summary;
};
