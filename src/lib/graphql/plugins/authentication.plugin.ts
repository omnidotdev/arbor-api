import { useExtendContext } from "@envelop/core";
import { useGenericAuth } from "@envelop/generic-auth";
import { GraphQLError, getOperationAST } from "graphql";

import {
  isPersonalAccessToken,
  resolveUserFromPat,
} from "lib/auth/personalAccessToken";
import { resolveUserFromToken } from "lib/auth/resolveUserFromToken";
import { scopeAllowsWrite } from "lib/auth/tokenScope";
import { ensureStaffEnrollment } from "lib/beta/staffEnrollment";
import { protectRoutes } from "lib/config/env.config";
import events from "lib/providers";

import type { Plugin } from "@envelop/core";
import type { ResolveUserFn } from "@envelop/generic-auth";
import type { OrganizationClaim } from "@omnidotdev/providers";
import type { TokenScope } from "lib/auth/tokenScope";
import type { SelectUser } from "lib/db/schema";
import type { GraphQLContext } from "lib/graphql/createGraphqlContext";

/**
 * Request-scoped cache for organization claims.
 * Used to pass organizations from resolveUser to context extension.
 */
const requestOrganizationsCache = new WeakMap<Request, OrganizationClaim[]>();

/**
 * Request-scoped cache for the resolved observer id.
 * Used to pass the caller's identity from resolveUser to the Postgres session.
 */
const requestObserverIdCache = new WeakMap<Request, string>();

/**
 * Request-scoped cache for the presented credential's scope.
 *
 * A personal access token may be narrower than its owning user (read-only, for
 * instance), so the scope must travel to the operation guard rather than being
 * inferred from the user. An IDP session token caches UNRESTRICTED_SCOPE, so the
 * guard only ever acts on a read-only PAT.
 */
const requestScopeCache = new WeakMap<Request, TokenScope>();

/**
 * Whether a resolved scope forbids an operation of the given type.
 *
 * The GraphQL analogue of the git push check: a read-only credential may run
 * queries and subscriptions but not mutations. A write scope (every IDP session
 * token, and a write PAT) permits everything, and an absent scope (no resolved
 * credential) is left to the other authorization layers.
 */
export const operationExceedsScope = (
  scope: TokenScope | undefined,
  operationType: string | undefined,
): boolean => {
  if (!scope || scopeAllowsWrite(scope)) return false;
  return operationType === "mutation";
};

/**
 * Session variable carrying the caller's identity into Postgres.
 *
 * Row-level security policies read this to decide what the GraphQL connection
 * may see. Kept in one place so a policy and the value it reads cannot drift.
 */
export const OBSERVER_SETTING = "app.user_id";

/**
 * Build the Postgres settings for a request.
 *
 * Empty string for an anonymous caller rather than an omitted key, so the value
 * is always explicit. A policy must therefore read it as
 * `nullif(current_setting('app.user_id', true), '')::uuid`, which is null when
 * anonymous and fails closed. Casting the empty string directly would raise
 * instead of denying.
 *
 * The adaptor applies these with `set_config(..., true)`, so they are
 * transaction-local and cannot leak into the next checkout of the same pooled
 * connection.
 */
export const buildPgSettings = (
  observerId: string | undefined,
): Record<string, string> => ({ [OBSERVER_SETTING]: observerId ?? "" });

/**
 * Validate user session and resolve user if successful.
 *
 * Delegates token validation and user upsert to the shared
 * `resolveUserFromToken` core so the GraphQL pipeline and the Smart-HTTP
 * git access layer share identical semantics.
 * @see https://the-guild.dev/graphql/envelop/plugins/use-generic-auth#getting-started
 */
const resolveUser: ResolveUserFn<SelectUser, GraphQLContext> = async (ctx) => {
  const accessToken = ctx.request.headers
    .get("authorization")
    ?.split("Bearer ")[1]
    ?.trim();

  // Check for missing or empty token
  if (!accessToken) {
    if (!protectRoutes) return null;
    return null;
  }

  // A personal access token authenticates as its owning user; anything else is
  // treated as an IDP session access token (JWT via the userinfo endpoint).
  // Mirrors the Smart-HTTP git access layer (lib/git/gitAccess) so the two auth
  // paths cannot drift.
  const resolved = isPersonalAccessToken(accessToken)
    ? await resolveUserFromPat(accessToken, ctx.db)
    : await resolveUserFromToken(accessToken, ctx.db);

  if (!resolved) return null;

  // Store organizations in request-scoped cache for context extension
  requestOrganizationsCache.set(ctx.request, resolved.organizations);
  // and the identity the Postgres session runs under
  requestObserverIdCache.set(ctx.request, resolved.user.id);
  // and the credential's scope, so the operation guard can refuse a mutation
  // from a read-only token
  requestScopeCache.set(ctx.request, resolved.scope);

  // Auto-approve Omni staff into the closed beta on first sight, so they reach
  // the app without hand-filling the apply form. Best-effort and self-guarding
  // (never throws), a cheap existence check per request and a single write when
  // absent, so it can never fail authentication
  await ensureStaffEnrollment({
    observer: resolved.user,
    db: ctx.db,
    emit: (event) => events.emit(event),
  });

  return resolved.user;
};

/**
 * Context extension plugin to add organizations from IDP claims.
 * Must be used after useGenericAuth to have access to the request.
 */
const organizationsContextPlugin = useExtendContext(
  ({ request }: { request: Request }) => ({
    organizations: requestOrganizationsCache.get(request) ?? [],
  }),
);

/**
 * Context extension plugin carrying the caller's identity into Postgres.
 *
 * Grafast passes `context.pgSettings` to `withPgClient` on every checkout, so
 * this is what puts the observer id on the GraphQL connection's session. It runs
 * after useGenericAuth, which is why the id comes from the request-scoped cache
 * rather than the context.
 *
 * Note this makes every GraphQL query run inside a transaction: the adaptor only
 * opens one when there are settings to apply.
 */
const pgSettingsContextPlugin = useExtendContext(
  ({ request }: { request: Request }) => ({
    pgSettings: buildPgSettings(requestObserverIdCache.get(request)),
  }),
);

/**
 * Operation guard enforcing a credential's write scope.
 *
 * Runs after useGenericAuth, so the scope resolved for the request is in the
 * cache. A read-only personal access token may read but not mutate; a session
 * token and a write PAT carry UNRESTRICTED_SCOPE and pass. An operation that
 * cannot be resolved from the document is left to the executor.
 */
const tokenScopeGuardPlugin: Plugin<GraphQLContext> = {
  onExecute({ args }) {
    const scope = requestScopeCache.get(args.contextValue.request);
    if (!scope || scopeAllowsWrite(scope)) return;

    const operation = getOperationAST(
      args.document,
      args.operationName ?? undefined,
    );
    if (operationExceedsScope(scope, operation?.operation))
      throw new GraphQLError("This token is read-only", {
        extensions: { code: "FORBIDDEN" },
      });
  },
};

/**
 * Authentication plugin.
 * @see https://the-guild.dev/graphql/envelop/plugins/use-generic-auth
 */
const authenticationPlugin = [
  useGenericAuth({
    contextFieldName: "observer",
    resolveUserFn: resolveUser,
    mode: protectRoutes ? "protect-all" : "resolve-only",
  }),
  organizationsContextPlugin,
  pgSettingsContextPlugin,
  tokenScopeGuardPlugin,
];

export default authenticationPlugin;
