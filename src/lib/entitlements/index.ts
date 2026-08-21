/**
 * Entitlements module for Arbor.
 *
 * Thin wrapper around @omnidotdev/providers BillingProvider.
 * When Aether is unavailable or no billing account exists,
 * defaults to free-tier limits instead of failing.
 */

import { isWithinLimit as checkLimit } from "@omnidotdev/providers/billing";
import { GraphQLError } from "graphql";

import { BILLING_BYPASS_ORG_IDS } from "lib/config/env.config";
import { billing } from "lib/providers";

import type { EntitlementsResponse } from "@omnidotdev/providers/billing";

/** Arbor app ID for entitlements */
const APP_ID = "arbor";

/**
 * Organization IDs exempt from billing/tier limits (Omni internal orgs),
 * derived once from the comma-separated BILLING_BYPASS_ORG_IDS env var. Used as
 * the default bypass for graph-capability checks so callers don't have to thread
 * it through.
 */
const DEFAULT_BYPASS_ORG_IDS: string[] =
  BILLING_BYPASS_ORG_IDS?.split(",")
    .map((id) => id.trim())
    .filter(Boolean) ?? [];

/**
 * Graph capability levels, mirroring the SSOT graph_level operationalLimits.
 * Level 1 unlocks the org-wide polyrepo graph (cross-repo dependency edges);
 * level 2 unlocks dependency blast-radius analysis and Weaver orchestration.
 */
export const GRAPH_LEVEL = {
  /** Per-repository dependency graph (free tier) */
  BASIC: 0,
  /** Org-wide polyrepo graph with cross-repo edges (pro tier) */
  ORG: 1,
  /** Dependency blast-radius + Weaver orchestration (team tier) */
  BLAST_RADIUS: 2,
} as const;

/**
 * Thrown when an organization's plan does not include a graph capability.
 *
 * NOTE: graph plugins must throw the GraphQLError raised by requireGraphLevel,
 * not this plain Error subclass. graphql-yoga masks any thrown plain Error to
 * "Unexpected error" in production, so a GraphTierError would never reach the
 * client. Kept for callers outside the GraphQL boundary (e.g. REST/git paths)
 * that want a typed graph-tier failure.
 * @knipignore Retained typed error for non-GraphQL callers
 */
export class GraphTierError extends Error {
  readonly requiredLevel: number;
  constructor(requiredLevel: number) {
    super(
      requiredLevel >= GRAPH_LEVEL.BLAST_RADIUS
        ? "This feature is available on the Team plan"
        : "This feature is available on the Pro plan",
    );
    this.name = "GraphTierError";
    this.requiredLevel = requiredLevel;
  }
}

/**
 * Default free-tier limits applied when no billing account exists.
 * Prevents hard failures for orgs that haven't been provisioned in Aether.
 */
const DEFAULT_LIMITS: Record<string, Record<string, number>> = {
  max_collaborators: { free: 5, pro: -1, team: -1 },
  max_private_repos: { free: -1, pro: -1, team: -1 },
  max_storage_bytes: {
    // Mirrors the omni-api catalog SSOT (planConfigs.ts): 1 GB / 25 GB / 100 GB
    free: 1_073_741_824,
    pro: 26_843_545_600,
    team: 107_374_182_400,
  },
  // Graph capability tier: 0 basic (per-repo), 1 org-wide polyrepo graph,
  // 2 dependency blast-radius + Weaver orchestration. Enforced by requiring
  // the org's graph_level to meet a minimum via requireGraphLevel below
  graph_level: { free: 0, pro: 1, team: 2 },
};

/** Tier type */
type Tier = "free" | "pro" | "team" | "enterprise";

/**
 * Error thrown when entitlements service is unavailable.
 * Callers should catch this and return appropriate error to user.
 * @knipignore Used by plugins
 */
export class EntitlementsUnavailableError extends Error {
  constructor(message: string) {
    super(`Entitlements service unavailable: ${message}`);
    this.name = "EntitlementsUnavailableError";
  }
}

/**
 * Fetch entitlements for an organization from the billing provider.
 */
async function getOrganizationEntitlements(
  organizationId: string,
): Promise<EntitlementsResponse | null> {
  return billing.getEntitlements("organization", organizationId, APP_ID);
}

/**
 * Check if an organization is within its limit for a resource.
 * This is the primary function for authorization plugins.
 *
 * @param entity - Object with organizationId
 * @param limitKey - The limit key to check (e.g., "max_private_repos")
 * @param currentCount - Current count of resources
 * @param billingBypassOrgIds - Organization IDs exempt from billing limits
 */
export async function isWithinLimit(
  entity: { organizationId: string },
  limitKey: string,
  currentCount: number,
  billingBypassOrgIds: string[] = [],
): Promise<boolean> {
  // Bypass check for exempt organizations (e.g., Omni internal orgs)
  if (billingBypassOrgIds.includes(entity.organizationId)) {
    return true;
  }

  const entitlements = await getOrganizationEntitlements(entity.organizationId);

  return checkLimit(entitlements, limitKey, currentCount, DEFAULT_LIMITS);
}

/**
 * Check whether an organization's graph capability tier meets a minimum level.
 * Level 1 unlocks the org-wide polyrepo graph (cross-repo dependency edges);
 * level 2 unlocks dependency blast-radius analysis and Weaver orchestration.
 *
 * Reuses the numeric limit check: the org passes when its graph_level
 * entitlement is at least requiredLevel. Falls back to free-tier (level 0)
 * when Aether is unavailable, so self-hosted deployments without billing get
 * the per-repository graph and paid graph tiers stay a hosted-plan capability.
 * @knipignore Used by graph plugins
 */
export async function getOrganizationGraphLevel(
  organizationId: string,
  billingBypassOrgIds: string[] = DEFAULT_BYPASS_ORG_IDS,
): Promise<number> {
  // Exempt orgs (e.g. Omni internal) get the highest capability tier
  if (billingBypassOrgIds.includes(organizationId)) {
    return DEFAULT_LIMITS.graph_level?.team ?? 2;
  }

  const entitlements = await getOrganizationEntitlements(organizationId);

  // Prefer an explicit graph_level entitlement when Aether provides one
  const explicit = entitlements?.entitlements.find(
    (e) =>
      e.featureKey === `${APP_ID}:graph_level` ||
      e.featureKey === "graph_level",
  );
  if (explicit?.value != null) {
    const level = Number(explicit.value);
    if (!Number.isNaN(level)) return level;
  }

  // Fall back to the tier -> level map (mirrors the SSOT operationalLimits),
  // so self-hosted deployments without Aether resolve to the free-tier graph
  const tier = tierFromEntitlements(entitlements);
  return DEFAULT_LIMITS.graph_level?.[tier] ?? 0;
}

/**
 * Boolean form of the graph-capability check, for callers that branch on the
 * tier rather than gating a GraphQL field (which should use requireGraphLevel).
 * @knipignore Used by graph plugins
 */
export async function hasGraphLevel(
  entity: { organizationId: string },
  requiredLevel: number,
  billingBypassOrgIds: string[] = [],
): Promise<boolean> {
  const level = await getOrganizationGraphLevel(
    entity.organizationId,
    billingBypassOrgIds,
  );
  return level >= requiredLevel;
}

/**
 * Enforce that an organization's graph capability tier meets a minimum level,
 * throwing a client-visible GraphQLError when it does not.
 *
 * This MUST throw a GraphQLError, not a plain Error: graphql-yoga masks any
 * thrown plain Error to "Unexpected error" in production, so an upgrade prompt
 * would never reach the client. The stable `extensions.code` of
 * GRAPH_TIER_REQUIRED plus `requiredLevel` survive masking, letting the UI show
 * the correct upgrade path.
 *
 * graph_level is an ORGANIZATION entitlement because billing is per-organization,
 * so this gates ORGANIZATION-owned surfaces. A null organizationId resolves to
 * the free tier (level 0). Surfaces with no owning organization (a personal
 * repository, or the user-scoped org-wide graph) gate on the user's capability
 * via requireUserGraphLevel instead, so a paying customer keeps paid graph
 * features there rather than being denied outright.
 *
 * Falls back to the free tier when Aether is unavailable (see
 * getOrganizationGraphLevel), so self-hosted deployments without billing keep
 * the free per-repository graph and paid tiers stay a hosted-plan capability.
 */
export async function requireGraphLevel(
  organizationId: string | null | undefined,
  requiredLevel: number,
  billingBypassOrgIds: string[] = DEFAULT_BYPASS_ORG_IDS,
): Promise<void> {
  const level =
    organizationId != null
      ? await getOrganizationGraphLevel(organizationId, billingBypassOrgIds)
      : GRAPH_LEVEL.BASIC;

  if (level < requiredLevel) throw graphTierRequiredError(requiredLevel);
}

/**
 * Client-visible error for a graph capability the caller's plan does not cover.
 *
 * MUST be a GraphQLError, not a plain Error: graphql-yoga masks any thrown plain
 * Error to "Unexpected error" in production, so the upgrade prompt would never
 * reach the client. The stable `extensions.code` of GRAPH_TIER_REQUIRED plus
 * `requiredLevel` survive masking, letting the UI show the right upgrade path.
 */
function graphTierRequiredError(requiredLevel: number): GraphQLError {
  return new GraphQLError(
    requiredLevel >= GRAPH_LEVEL.BLAST_RADIUS
      ? "This feature is available on the Team plan"
      : "This feature is available on the Pro plan",
    { extensions: { code: "GRAPH_TIER_REQUIRED", requiredLevel } },
  );
}

/**
 * The subset of the db a user's graph-level resolution needs: the mirrored
 * organization memberships. Structurally typed so the resolution can be unit
 * tested with a fake db and so entitlements does not depend on the db module.
 */
interface GraphMembershipDb {
  query: {
    organizationMemberTable: {
      findMany: (args: {
        columns: { organizationId: true };
        where: (table: any, ops: { eq: (a: any, b: any) => any }) => unknown;
      }) => Promise<Array<{ organizationId: string }>>;
    };
  };
}

/**
 * The graph capability a USER carries: the highest graph_level across every
 * organization they belong to.
 *
 * graph_level is an organization entitlement because billing is per-organization,
 * which leaves two surfaces with no single organization to gate on: a PERSONAL
 * repository (no owning org) and the user-scoped org-wide polyrepo graph (which
 * spans a user's repos across many orgs). Both resolve their tier from the
 * user's paid memberships instead, so a paying Pro/Team customer keeps the
 * capability there while a user in only free organizations (or none) stays on
 * the free tier. Nothing is given away, and the paid feature stays reachable
 * without per-personal-account billing.
 *
 * Falls back to the free level (0) for a user in no organizations.
 * @knipignore Exported for unit tests; wrapped by requireUserGraphLevel
 */
export async function getUserMaxGraphLevel(
  userId: string,
  db: GraphMembershipDb,
  billingBypassOrgIds: string[] = DEFAULT_BYPASS_ORG_IDS,
): Promise<number> {
  const memberships = await db.query.organizationMemberTable.findMany({
    columns: { organizationId: true },
    where: (table, { eq }) => eq(table.userId, userId),
  });

  if (memberships.length === 0) return GRAPH_LEVEL.BASIC;

  const levels = await Promise.all(
    memberships.map((membership) =>
      getOrganizationGraphLevel(membership.organizationId, billingBypassOrgIds),
    ),
  );

  return Math.max(GRAPH_LEVEL.BASIC, ...levels);
}

/**
 * Enforce that a USER's graph capability (max across their organizations) meets
 * a minimum level, throwing a client-visible GRAPH_TIER_REQUIRED GraphQLError
 * when it does not. The user-scoped counterpart to requireGraphLevel, for the
 * surfaces with no single organization to bill (personal repositories and the
 * org-wide polyrepo graph).
 */
export async function requireUserGraphLevel(
  userId: string,
  db: GraphMembershipDb,
  requiredLevel: number,
  billingBypassOrgIds: string[] = DEFAULT_BYPASS_ORG_IDS,
): Promise<void> {
  const level = await getUserMaxGraphLevel(userId, db, billingBypassOrgIds);
  if (level < requiredLevel) throw graphTierRequiredError(requiredLevel);
}

/**
 * Check if an organization is within its limit.
 * Lower-level function without bypass logic.
 * @knipignore Used by scripts
 */
export async function checkOrganizationLimit(
  organizationId: string,
  limitKey: string,
  currentCount: number,
): Promise<boolean> {
  const entitlements = await getOrganizationEntitlements(organizationId);

  return checkLimit(entitlements, limitKey, currentCount, DEFAULT_LIMITS);
}

/**
 * Resolve the tier from an entitlements response, defaulting to "free" when
 * absent (no billing account yet, or Aether unavailable).
 */
function tierFromEntitlements(entitlements: EntitlementsResponse | null): Tier {
  const tierEntitlement = entitlements?.entitlements.find(
    (e) => e.featureKey === `${APP_ID}:tier` || e.featureKey === "tier",
  );

  return (tierEntitlement?.value as Tier) ?? "free";
}

/**
 * Get the tier for an organization.
 * Returns "free" if org not found (no billing account yet).
 * @knipignore Used by scripts
 */
export async function getOrganizationTier(
  organizationId: string,
): Promise<Tier> {
  const entitlements = await getOrganizationEntitlements(organizationId);

  return tierFromEntitlements(entitlements);
}

/**
 * Invalidate cached entitlements for an organization.
 * Called from webhook handlers when entitlements change.
 */
export function invalidateCache(pattern: string): void {
  // Extract entity info from pattern for provider cache invalidation
  // Patterns: "organization:orgId:*" or "organization:orgId"
  // Destructured rather than length-checked so the compiler can see both parts
  // are present. Checking `undefined` rather than truthiness keeps the previous
  // behaviour for an empty segment, e.g. "organization:"
  const [entityType, entityId] = pattern.replace(/:\*$/, "").split(":");
  if (entityType !== undefined && entityId !== undefined) {
    billing.invalidateCache?.(entityType, entityId);
  } else {
    billing.clearCache?.();
  }
}
