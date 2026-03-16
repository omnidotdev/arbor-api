/**
 * Entitlements module for Arbor.
 *
 * Thin wrapper around @omnidotdev/providers BillingProvider.
 * When Aether is unavailable or no billing account exists,
 * defaults to free-tier limits instead of failing.
 */

import { isWithinLimit as checkLimit } from "@omnidotdev/providers/billing";

import { billing } from "lib/providers";

import type { EntitlementsResponse } from "@omnidotdev/providers/billing";

/** Arbor app ID for entitlements */
const APP_ID = "arbor";

/**
 * Default free-tier limits applied when no billing account exists.
 * Prevents hard failures for orgs that haven't been provisioned in Aether.
 */
const DEFAULT_LIMITS: Record<string, Record<string, number>> = {
  max_collaborators: { free: 1, pro: 10, team: -1 },
  max_private_repos: { free: 1 },
  max_storage_bytes: {
    free: 524_288_000,
    pro: 2_147_483_648,
    team: 10_737_418_240,
  },
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
 * @param limitKey - The limit key to check (e.g., "max_repositories")
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
 * Get the tier for an organization.
 * Returns "free" if org not found (no billing account yet).
 * @knipignore Used by scripts
 */
export async function getOrganizationTier(
  organizationId: string,
): Promise<Tier> {
  const entitlements = await getOrganizationEntitlements(organizationId);

  if (!entitlements) return "free";

  const tierEntitlement = entitlements.entitlements.find(
    (e) => e.featureKey === `${APP_ID}:tier` || e.featureKey === "tier",
  );

  return (tierEntitlement?.value as Tier) ?? "free";
}

/**
 * Invalidate cached entitlements for an organization.
 * Called from webhook handlers when entitlements change.
 */
export function invalidateCache(pattern: string): void {
  // Extract entity info from pattern for provider cache invalidation
  // Patterns: "organization:orgId:*" or "organization:orgId"
  const parts = pattern.replace(/:\*$/, "").split(":");
  if (parts.length >= 2) {
    billing.invalidateCache?.(parts[0], parts[1]);
  } else {
    billing.clearCache?.();
  }
}
