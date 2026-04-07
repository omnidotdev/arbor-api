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
  // Billing entitlements
  BILLING_BASE_URL,
  BILLING_WEBHOOK_SECRET,
  BILLING_SERVICE_API_KEY,
  // PDP authorization
  AUTHZ_ENABLED,
  AUTHZ_API_URL,
  // IDP webhooks
  IDP_WEBHOOK_SECRET,
  // Vortex event emission
  VORTEX_API_URL,
  VORTEX_API_KEY,
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
  isAuthzEnabled = AUTHZ_ENABLED === "true";

/** Whether search indexing is enabled */
export const isSearchEnabled =
  SEARCH_ENABLED === "true" && !!MEILISEARCH_URL && !!MEILISEARCH_MASTER_KEY;

// Startup warnings for optional integrations
if (!STRIPE_API_KEY) console.warn("STRIPE_API_KEY not set, Stripe disabled");
if (!BILLING_BASE_URL)
  console.warn("BILLING_BASE_URL not set, billing disabled");
if (!AUTHZ_API_URL)
  console.warn("AUTHZ_API_URL not set, authorization disabled");
if (!VORTEX_API_URL)
  console.warn("VORTEX_API_URL not set, event streaming disabled");
if (!MEILISEARCH_URL) console.warn("MEILISEARCH_URL not set, search disabled");
