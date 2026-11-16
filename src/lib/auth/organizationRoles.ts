/**
 * Organization role rules for repository ownership.
 *
 * Arbor's organization model gives write access (push, administration) only to
 * owners and admins; a plain member reads the organization's repositories but
 * cannot push to them (see `hasOrganizationWriteRole` in lib/git/gitAccess.ts).
 * Creating a repository makes the creator its owner, so letting a plain member
 * create one inside the organization would hand them write control the role
 * does not carry. Creation therefore needs the same owner or admin role.
 *
 * Roles come from the caller's organization claims: an IDP session token's own
 * claims, or for an access token the membership mirror, which only the server
 * writes.
 */

/** Organization roles that may create repositories in the organization */
const REPOSITORY_CREATOR_ROLES: readonly string[] = ["owner", "admin"];

/** The claim shape role checks read */
interface RoleClaim {
  id: string;
  roles: string[];
}

/** Why a caller may not create a repository in an organization */
export type OrganizationRepositoryDenial = "not_member" | "insufficient_role";

/**
 * Whether the caller may create a repository in an organization, identified by
 * its identity-provider id.
 *
 * Returns null when allowed, otherwise the reason it is not, so a caller can
 * tell a non-member (who learns nothing) from a member lacking the role
 */
export const organizationRepositoryCreateDenial = (
  organizations: RoleClaim[],
  idpOrganizationId: string,
): OrganizationRepositoryDenial | null => {
  const claim = organizations.find((org) => org.id === idpOrganizationId);
  if (!claim) return "not_member";

  return claim.roles.some((role) => REPOSITORY_CREATOR_ROLES.includes(role))
    ? null
    : "insufficient_role";
};

/** User-facing message for a member without a repository-creating role */
export const INSUFFICIENT_ROLE_MESSAGE =
  "Only workspace owners and admins can create repositories";
