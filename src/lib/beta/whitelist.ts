/**
 * Pure whitelist resolution for the arbor closed-beta gate.
 *
 * "Whitelisted" = the caller may use arbor while the closed-beta gate is active.
 * This helper is deliberately db-free so the decision is unit-testable in
 * isolation. The DB lookup of `applicationStatus` and the merge of env-whitelisted
 * ids with billing-bypass admins happen at the call site (later tasks), which
 * passes the resolved values in here.
 */

export interface WhitelistInput {
  /** Whether the closed-beta gate is active at all */
  gateEnabled: boolean;
  /** The authenticated caller's id, or null/undefined for an anonymous caller */
  userId: string | null | undefined;
  /** Env-whitelisted ids plus billing-bypass admins, merged by the caller */
  envIds: string[];
  /** The caller's tester application status, looked up by the caller */
  applicationStatus: "pending" | "approved" | "declined" | null;
}

/**
 * Whether the caller may use arbor while the closed-beta gate is active.
 *
 * Default-denied: an authenticated caller passes only when explicitly
 * env-whitelisted or holding an approved application. When the gate is disabled
 * everyone passes, and an anonymous caller is always denied while gated.
 */
export const isWhitelisted = ({
  gateEnabled,
  userId,
  envIds,
  applicationStatus,
}: WhitelistInput): boolean => {
  if (!gateEnabled) return true;
  if (!userId) return false;
  if (envIds.includes(userId)) return true;
  return applicationStatus === "approved";
};
