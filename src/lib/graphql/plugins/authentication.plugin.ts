import { useExtendContext } from "@envelop/core";
import { useGenericAuth } from "@envelop/generic-auth";

import { resolveUserFromToken } from "lib/auth/resolveUserFromToken";
import { protectRoutes } from "lib/config/env.config";

import type { ResolveUserFn } from "@envelop/generic-auth";
import type { OrganizationClaim } from "@omnidotdev/providers";
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

  const resolved = await resolveUserFromToken(accessToken, ctx.db);

  if (!resolved) return null;

  // Store organizations in request-scoped cache for context extension
  requestOrganizationsCache.set(ctx.request, resolved.organizations);
  // and the identity the Postgres session runs under
  requestObserverIdCache.set(ctx.request, resolved.user.id);

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
];

export default authenticationPlugin;
