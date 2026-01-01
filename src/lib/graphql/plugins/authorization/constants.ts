import { BILLING_BYPASS_SLUGS } from "lib/config/env.config";

/**
 * Organization slugs that bypass all billing/tier limits.
 * Configured via BILLING_BYPASS_SLUGS env var (comma-separated).
 * TODO: Replace with dynamic authZ plugin system
 *
 * NOTE: Exported as array for use in EXPORTABLE functions.
 * Use `billingBypassSlugs.includes(slug)` inline within EXPORTABLE blocks.
 */
export const billingBypassSlugs: string[] =
  BILLING_BYPASS_SLUGS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

export const FREE_TIER_MAX_REPOSITORIES = 5;
export const FREE_TIER_MAX_COLLABORATORS = 3;
export const FREE_TIER_MAX_MEMBERS = 3;
export const FREE_TIER_MAX_ADMINS = 1;

export const BASIC_TIER_MAX_REPOSITORIES = 25;
export const BASIC_TIER_MAX_COLLABORATORS = 10;
export const BASIC_TIER_MAX_MEMBERS = 10;
export const BASIC_TIER_MAX_ADMINS = 3;
