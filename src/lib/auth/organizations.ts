import type { OrganizationClaim } from "lib/graphql/createGraphqlContext";

/**
 * Get the default organization for a user.
 * Priority: personal org first, then oldest team org.
 */
export function getDefaultOrganization(
  organizations: OrganizationClaim[],
): OrganizationClaim | null {
  if (organizations.length === 0) return null;

  // Personal org always takes priority
  const personalOrg = organizations.find((org) => org.type === "personal");
  if (personalOrg) return personalOrg;

  // Fallback to first org (shouldn't happen since personal org always exists).
  // The length check above proves this is present; `?? null` is what says so to
  // the compiler, and null is already this function's absent value
  return organizations[0] ?? null;
}
