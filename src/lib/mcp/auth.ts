import {
  hashPersonalAccessToken,
  isPersonalAccessToken,
} from "lib/auth/personalAccessToken";
import { dbPool } from "lib/db/db";
import { authenticateGitRequest } from "lib/git";

import type { OrganizationClaim } from "@omnidotdev/providers";
import type { TokenScope } from "lib/auth/tokenScope";
import type { SelectAgent, SelectUser } from "lib/db/schema";

/**
 * Authenticated MCP caller.
 *
 * The `user` is the authority every tool scopes against (the same identity the
 * Smart-HTTP git routes authenticate). `agent` is set only when the credential
 * is an agent access token (a personal access token with a non-null agentId),
 * and records which non-human actor is driving the forge for attribution. Tool
 * authorization always keys off `user`, never `agent`.
 */
export interface McpCaller {
  user: SelectUser;
  agent: SelectAgent | null;
  /**
   * Limits of the credential that was presented. A tool must gate on this as
   * well as on `user`, because an agent token is typically narrower than the
   * user it authenticates as.
   */
  scope: TokenScope;
  /** Organizations the caller acts under, used for membership decisions */
  organizations: OrganizationClaim[];
}

/**
 * Extract a raw bearer token from a request's Authorization header.
 *
 * MCP clients authenticate with `Authorization: Bearer <token>`. Anything else
 * (missing header, non-bearer scheme, empty value) yields null.
 */
const extractBearerToken = (request: Request): string | null => {
  const header = request.headers.get("authorization");
  if (!header) return null;

  const [scheme, ...rest] = header.split(" ");
  const value = rest.join(" ").trim();
  if (!scheme || !value) return null;

  if (scheme.toLowerCase() !== "bearer") return null;

  return value || null;
};

/**
 * Resolve the acting agent for a personal access token, if any.
 *
 * Agent-context is attribution only (never used for authorization), so a lookup
 * failure degrades to a null agent rather than rejecting the caller.
 */
const resolveAgentForToken = async (
  token: string,
): Promise<SelectAgent | null> => {
  if (!isPersonalAccessToken(token)) return null;

  try {
    const row = await dbPool.query.personalAccessTokenTable.findFirst({
      where: (table, { eq }) =>
        eq(table.tokenHash, hashPersonalAccessToken(token)),
      with: { agent: true },
    });

    return row?.agent ?? null;
  } catch (err) {
    console.warn("[MCP] Agent resolution failed:", err);
    return null;
  }
};

/**
 * Resolve the authenticated MCP caller from a request's Authorization header.
 *
 * Reuses the Smart-HTTP git authenticator so bearer access tokens and personal
 * access tokens resolve identically to the rest of the forge (and so the
 * request-scoped organization claims used by `canReadRepository` are populated).
 * Returns null when no valid credential is present, so the transport layer can
 * reject the request before any tool runs.
 */
export const resolveMcpCaller = async (
  request: Request,
): Promise<McpCaller | null> => {
  const caller = await authenticateGitRequest(request);
  if (!caller) return null;

  const token = extractBearerToken(request);
  const agent = token ? await resolveAgentForToken(token) : null;

  return {
    user: caller.user,
    agent,
    scope: caller.scope,
    organizations: caller.organizations,
  };
};
