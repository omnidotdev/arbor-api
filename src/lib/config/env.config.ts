/**
 * Environment variables.
 */
export const {
  NODE_ENV,
  PORT = 4000,
  HOST = "0.0.0.0",
  DATABASE_URL,
  // Optional. Connection used only for GraphQL query execution, so it can be
  // pointed at a constrained role while internal callers (authentication, git
  // access, the merge queue, webhooks) keep DATABASE_URL. Defaults to
  // DATABASE_URL, which is the current single-role behaviour
  GRAPHQL_DATABASE_URL,
  AUTH_BASE_URL,
  GRAPHQL_MAX_COMPLEXITY_COST,
  CORS_ALLOWED_ORIGINS,
  PROTECT_ROUTES,
  AUTH_DEBUG,
  STRIPE_API_KEY,
  STRIPE_WEBHOOK_SECRET,
  // Billing entitlements
  BILLING_BASE_URL,
  BILLING_WEBHOOK_SECRET,
  BILLING_SERVICE_API_KEY,
  // PDP authorization

  AUTHZ_API_URL,
  // IDP webhooks
  IDP_WEBHOOK_SECRET,
  // Vortex event emission
  VORTEX_API_URL,
  VORTEX_API_KEY,
  // Billing bypass (org IDs that skip billing checks)
  BILLING_BYPASS_ORG_IDS,
  // Closed-beta gate: default-denied whitelist enforced across the app. Off by
  // default (unset) so the gate is inert until explicitly enabled at rollout
  ARBOR_BETA_GATE_ENABLED,
  // Comma-separated user IDs allowed through the closed-beta gate without an
  // approved application (env bypass alongside the billing-bypass admins)
  ARBOR_BETA_WHITELIST_USER_IDS,
  // Meilisearch (unified search)
  MEILISEARCH_URL,
  MEILISEARCH_MASTER_KEY,
  // Escape hatch for the boot-time row-level security check. Set to "true" only
  // to roll GRAPHQL_DATABASE_URL back to the privileged role, which the check
  // would otherwise refuse to start under
  ALLOW_RLS_BYPASS,
  // arbor-git backend (Rust/gitoxide gRPC daemon). Off by default: when
  // USE_ARBOR_GIT is "true" and GIT_SERVICE_URL is set and reachable, git
  // operations are delegated to arbor-git; otherwise the in-process path is used
  USE_ARBOR_GIT,
  GIT_SERVICE_URL,
} = process.env;

export const isDevEnv = NODE_ENV === "development",
  isProdEnv = NODE_ENV === "production",
  protectRoutes = isProdEnv || PROTECT_ROUTES === "true",
  isAuthzEnabled = !!AUTHZ_API_URL,
  /** Whether the closed-beta whitelist gate is active */
  betaGateEnabled = ARBOR_BETA_GATE_ENABLED === "true";

/**
 * User IDs allowed through the closed-beta gate without an approved application,
 * derived once from the comma-separated ARBOR_BETA_WHITELIST_USER_IDS env var
 */
export const betaWhitelistUserIds: string[] =
  ARBOR_BETA_WHITELIST_USER_IDS?.split(",")
    .map((id) => id.trim())
    .filter(Boolean) ?? [];

/** Whether search indexing is enabled */
export const isSearchEnabled = !!MEILISEARCH_URL && !!MEILISEARCH_MASTER_KEY;

/**
 * Whether delegating git to the arbor-git backend is requested. Requires both
 * the flag on and a service URL; actual use is gated further by a boot-time
 * health check (graceful degradation to the in-process path if unreachable).
 */
export const useArborGit = USE_ARBOR_GIT === "true" && !!GIT_SERVICE_URL;

/**
 * Connection string for GraphQL query execution.
 *
 * Falls back to `DATABASE_URL`, so an unset `GRAPHQL_DATABASE_URL` keeps the
 * single-role behaviour exactly. Setting it is what lets row-level security
 * constrain GraphQL without also constraining the authentication path that has
 * to read a user row to discover who the caller is.
 */
export const graphqlDatabaseUrl = GRAPHQL_DATABASE_URL || DATABASE_URL;

// Startup warnings for optional integrations
if (!STRIPE_API_KEY) console.warn("STRIPE_API_KEY not set, Stripe disabled");
if (!BILLING_BASE_URL)
  console.warn("BILLING_BASE_URL not set, billing disabled");
if (!AUTHZ_API_URL)
  console.warn("AUTHZ_API_URL not set, authorization disabled");
if (!VORTEX_API_URL)
  console.warn("VORTEX_API_URL not set, event streaming disabled");
if (!MEILISEARCH_URL) console.warn("MEILISEARCH_URL not set, search disabled");
