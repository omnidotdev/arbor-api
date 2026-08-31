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
  // Bearer key presented to Gatekeeper's /api/stats for the public Omni
  // userbase count shown on /apply (unset = falls back to the local applicant
  // count)
  STATS_SERVICE_KEY,
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
  // HMAC secret Vortex signs webhook deliveries with (the hmacSecret returned
  // when the decision subscription is created). Verifies POST /webhooks/vortex
  VORTEX_WEBHOOK_SECRET,
  // Public URL Vortex delivers webhooks to (this service's /webhooks/vortex)
  WEBHOOK_TARGET_URL,
  // Herald transactional email (closed-beta lifecycle mail). Unset = noop
  // provider (no email sent), so the beta flow degrades gracefully
  HERALD_API_URL,
  HERALD_API_KEY,
  // Sender for beta emails (RFC 5322, may include a display name). Defaults to
  // "Arbor <arbor@send.omni.dev>" when unset
  NOTIFICATION_FROM_EMAIL,
  // Public base URL of the arbor web app, linked as the CTA in beta emails.
  // Defaults to https://arbor.omni.dev
  APP_BASE_URL,
  // Billing bypass (org IDs that skip billing checks)
  BILLING_BYPASS_ORG_IDS,
  // Closed-beta gate: default-denied whitelist enforced across the app. Off by
  // default (unset) so the gate is inert until explicitly enabled at rollout
  ARBOR_BETA_GATE_ENABLED,
  // Comma-separated user IDs allowed through the closed-beta gate without an
  // approved application (env bypass alongside the billing-bypass admins)
  ARBOR_BETA_WHITELIST_USER_IDS,
  // Comma-separated email domains treated as Omni staff. An authenticated
  // caller whose email domain matches is auto-approved into the closed beta.
  // Defaults to "omni.dev" when unset
  STAFF_EMAIL_DOMAINS,
  // Pre-launch "coming soon" switch. When "false", arbor is not open yet: only
  // the founder whitelist (ARBOR_BETA_WHITELIST_USER_IDS) may reach the app or
  // git; approved testers and Omni staff wait. Any other value (or unset) means
  // launched, and the normal closed-beta gate applies
  ARBOR_LAUNCHED,
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
  betaGateEnabled = ARBOR_BETA_GATE_ENABLED === "true",
  /** Whether arbor is launched. When false, only founders reach the app */
  arborLaunched = ARBOR_LAUNCHED !== "false";

/**
 * User IDs allowed through the closed-beta gate without an approved application,
 * derived once from the comma-separated ARBOR_BETA_WHITELIST_USER_IDS env var
 */
export const betaWhitelistUserIds: string[] =
  ARBOR_BETA_WHITELIST_USER_IDS?.split(",")
    .map((id) => id.trim())
    .filter(Boolean) ?? [];

/**
 * Email domains treated as Omni staff, derived once from the comma-separated
 * STAFF_EMAIL_DOMAINS env var. Falls back to "omni.dev" so staff auto-approval
 * works out of the box without extra configuration. Normalized to lowercase so
 * the domain match is case-insensitive
 */
export const staffEmailDomains: string[] = (STAFF_EMAIL_DOMAINS ?? "omni.dev")
  .split(",")
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);

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

/**
 * Public base URL of the arbor web app, linked as the call to action in
 * closed-beta emails. Defaults to production when unset.
 */
export const appBaseUrl = APP_BASE_URL || "https://arbor.omni.dev";

// Startup warnings for optional integrations
if (!STRIPE_API_KEY) console.warn("STRIPE_API_KEY not set, Stripe disabled");
if (!BILLING_BASE_URL)
  console.warn("BILLING_BASE_URL not set, billing disabled");
if (!AUTHZ_API_URL)
  console.warn("AUTHZ_API_URL not set, authorization disabled");
if (!VORTEX_API_URL)
  console.warn("VORTEX_API_URL not set, event streaming disabled");
if (!MEILISEARCH_URL) console.warn("MEILISEARCH_URL not set, search disabled");
if (!staffEmailDomains.length)
  console.warn("STAFF_EMAIL_DOMAINS empty, staff auto-approval disabled");
if (!(HERALD_API_URL && HERALD_API_KEY))
  console.warn("HERALD_API_URL/HERALD_API_KEY not set, beta emails disabled");
