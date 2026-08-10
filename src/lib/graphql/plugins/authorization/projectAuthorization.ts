/**
 * Pure authorization decisions for projects and project membership.
 *
 * A project aggregates repositories under one page (polyrepo). Ownership mirrors
 * the repository model: every project has a user `ownerId`, and an optional
 * `organizationId` when it belongs to an organization. These helpers decide who
 * may create, administer, and curate a project; the grafast wiring in
 * `Project.plugin.ts` resolves the organization's IDP id and calls them.
 */

/** The caller: their user id and the organization roles from their IDP claims. */
export interface ProjectAdminSubject {
  observerId: string;
  organizations: Array<{ id: string; roles: string[] }>;
}

/** A project reduced to what an authorization decision needs. */
export interface ProjectRecord {
  ownerId: string;
  /** The owning organization's IDP id, or null for a personal project. */
  organizationIdpId: string | null;
}

/**
 * Whether the caller holds an admin or owner role in the given organization.
 * Organization membership and roles come from IDP JWT claims.
 */
export const hasOrgAdminRole = (
  organizations: ProjectAdminSubject["organizations"],
  idpOrganizationId: string,
): boolean => {
  const org = organizations.find((o) => o.id === idpOrganizationId);
  if (!org) return false;
  return org.roles.includes("admin") || org.roles.includes("owner");
};

/**
 * Whether the caller may administer (rename, delete, curate membership of) an
 * existing project. The project owner always may; for an organization project,
 * an org admin/owner may too, even one who did not create it.
 */
export const canAdministerProject = (
  project: ProjectRecord,
  subject: ProjectAdminSubject,
): boolean => {
  if (project.ownerId === subject.observerId) return true;
  if (project.organizationIdpId === null) return false;
  return hasOrgAdminRole(subject.organizations, project.organizationIdpId);
};

/**
 * Whether the caller may create a project with the given owner/organization.
 * A caller may only create projects they own, and an organization project
 * additionally requires an admin/owner role in that organization.
 */
export const canCreateProject = (
  project: ProjectRecord,
  subject: ProjectAdminSubject,
): boolean => {
  if (project.ownerId !== subject.observerId) return false;
  if (project.organizationIdpId === null) return true;
  return hasOrgAdminRole(subject.organizations, project.organizationIdpId);
};
