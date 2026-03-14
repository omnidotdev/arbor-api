/**
 * Environment variables.
 */
export const {
  NODE_ENV,
  PORT = 4000,
  HOST = "0.0.0.0",
  DATABASE_URL,
  AUTH_BASE_URL,
  GRAPHQL_MAX_COMPLEXITY_COST,
  CORS_ALLOWED_ORIGINS,
  PROTECT_ROUTES,
  AUTH_DEBUG,
  STRIPE_API_KEY,
  STRIPE_WEBHOOK_SECRET,
  // Aether entitlements
  BILLING_BASE_URL,
  BILLING_WEBHOOK_SECRET,
  AETHER_SERVICE_API_KEY,
  // PDP authorization
  AUTHZ_ENABLED,
  AUTHZ_API_URL,
  // IDP webhooks
  IDP_WEBHOOK_SECRET,
  // Vortex event emission
  VORTEX_API_URL,
  VORTEX_API_KEY,
  // Self-hosted mode
  SELF_HOSTED,
  // Billing bypass (org IDs that skip billing checks)
  BILLING_BYPASS_ORG_IDS,
  // Meilisearch (unified search)
  MEILISEARCH_URL,
  MEILISEARCH_MASTER_KEY,
  SEARCH_ENABLED,
} = process.env;

export const isDevEnv = NODE_ENV === "development",
  isProdEnv = NODE_ENV === "production",
  protectRoutes = isProdEnv || PROTECT_ROUTES === "true",
  isAuthzEnabled = AUTHZ_ENABLED === "true",
  isSelfHosted = SELF_HOSTED === "true";

/** Whether search indexing is enabled */
export const isSearchEnabled =
  SEARCH_ENABLED === "true" && !!MEILISEARCH_URL && !!MEILISEARCH_MASTER_KEY;
