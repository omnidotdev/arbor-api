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
];

export default authenticationPlugin;
