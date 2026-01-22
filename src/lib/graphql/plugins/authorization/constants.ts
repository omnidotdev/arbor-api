import { BILLING_BYPASS_ORG_IDS } from "lib/config/env.config";

/**
 * Organization IDs that bypass all billing/tier limits.
 * Configured via BILLING_BYPASS_ORG_IDS env var (comma-separated).
 *
 * NOTE: Exported as array for use in EXPORTABLE functions.
 * Use `billingBypassOrgIds.includes(organizationId)` inline within EXPORTABLE blocks.
 */
export const billingBypassOrgIds: string[] =
  BILLING_BYPASS_ORG_IDS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

/**
 * Feature keys for entitlement checks.
 * Maps to feature keys in Aether.
 */
export const FEATURE_KEYS = {
  MAX_REPOSITORIES: "max_repositories",
  MAX_COLLABORATORS: "max_collaborators",
  MAX_MEMBERS: "max_members",
  MAX_ADMINS: "max_admins",
  MAX_PRIVATE_REPOS: "max_private_repos",
} as const;
