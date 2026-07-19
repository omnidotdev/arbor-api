import { and, eq } from "drizzle-orm";

import {
  isPersonalAccessToken,
  resolveUserFromPat,
} from "lib/auth/personalAccessToken";
import { resolveUserFromToken } from "lib/auth/resolveUserFromToken";
import { dbPool } from "lib/db/db";
import { repositoryTable, userTable } from "lib/db/schema";

import type { OrganizationClaim } from "@omnidotdev/providers";
import type { ResolvedUser } from "lib/auth/resolveUserFromToken";
import type { SelectUser } from "lib/db/schema";

/**
 * Smart-HTTP git access control.
 *
 * The git Smart-HTTP endpoints are mounted OUTSIDE the GraphQL pipeline, so
 * they cannot rely on the GraphQL authentication/authorization plugins. This
 * module mirrors those plugins' read/write rules:
 *
 * - Read: public repos are anonymous; private repos require owner, collaborator
 *   (any role), or membership in the owning organization
 *   (see Repository.plugin.ts / PullRequest.plugin.ts `hasReadAccess`).
 * - Write: never anonymous; requires owner, a collaborator with write/admin
 *   permission, or an org member with admin/owner role
 *   (see PullRequest.plugin.ts `hasWriteAccess` and
 *   RepositoryRelationship.plugin.ts `hasOrgAdminRole`).
 *
 * All checks FAIL CLOSED.
 */

/** Minimal repository fields needed for access decisions */
export interface RepositorySummary {
  id: string;
  visibility: "public" | "private";
  ownerId: string;
  organizationId: string | null;
}

/** Database surface required by this module */
type GitAccessDb = typeof dbPool;

/**
 * Request-scoped organization claims for an authenticated user.
 * `authenticateGitRequest` populates this so `canReadRepository` /
 * `canWriteRepository` can evaluate org membership without re-resolving
 * the token. Keyed by the user object identity.
 */
const userOrganizationsCache = new WeakMap<SelectUser, OrganizationClaim[]>();

/**
 * Indirection for the token resolver so tests can stub it at the module
 * boundary without a live IDP or database.
 */
type TokenResolver = (token: string) => Promise<ResolvedUser | null>;

let tokenResolver: TokenResolver = (token) => resolveUserFromToken(token);

let patResolver: TokenResolver = (token) => resolveUserFromPat(token, dbPool);

/**
 * Test-only override for the token resolver. Pass null to restore the default.
 * @internal
 */
export const __setResolveUserFromTokenForTests = (
  resolver: TokenResolver | null,
): void => {
  tokenResolver = resolver ?? ((token) => resolveUserFromToken(token));
};

/**
 * Test-only override for the PAT resolver. Pass null to restore the default.
 * @internal
 */
export const __setResolveUserFromPatForTests = (
  resolver: TokenResolver | null,
): void => {
  patResolver = resolver ?? ((token) => resolveUserFromPat(token, dbPool));
};

/**
 * Test-only helper to seed organization claims for a user object.
 * @internal
 */
export const __setOrganizationsForUser = (
  user: SelectUser,
  organizations: OrganizationClaim[],
): void => {
  userOrganizationsCache.set(user, organizations);
};

/**
 * Extract a raw access token from a request's Authorization header.
 *
 * Accepts either:
 * - `Authorization: Bearer <token>`
 * - `Authorization: Basic base64(username:<token>)` (git CLI sends the access
 *   token as the Basic-auth password regardless of username)
 */
const extractToken = (request: Request): string | null => {
  const header = request.headers.get("authorization");
  if (!header) return null;

  const [scheme, ...rest] = header.split(" ");
  const value = rest.join(" ").trim();
  if (!scheme || !value) return null;

  if (scheme.toLowerCase() === "bearer") {
    return value || null;
  }

  if (scheme.toLowerCase() === "basic") {
    let decoded: string;
    try {
      decoded = Buffer.from(value, "base64").toString("utf-8");
    } catch {
      return null;
    }
    // git CLI sends base64(username:password) where password is the token
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex === -1) return null;
    const password = decoded.slice(separatorIndex + 1);
    return password || null;
  }

  return null;
};

/**
 * Authenticate a Smart-HTTP git request from its Authorization header.
 *
 * @returns The resolved user, or null when no/invalid credentials are present
 */
export const authenticateGitRequest = async (
  request: Request,
): Promise<SelectUser | null> => {
  const token = extractToken(request);
  if (!token) return null;

  // A personal access token authenticates as its owning user; anything else is
  // treated as an IDP session access token (JWT via the userinfo endpoint)
  const resolved = isPersonalAccessToken(token)
    ? await patResolver(token)
    : await tokenResolver(token);
  if (!resolved) return null;

  userOrganizationsCache.set(resolved.user, resolved.organizations);

  return resolved.user;
};

/**
 * Look up the minimal repository summary for an owner-username + repo-slug.
 * @returns The summary, or null when the repository row does not exist
 */
export const resolveRepositorySummary = async (
  owner: string,
  repo: string,
  db: GitAccessDb = dbPool,
): Promise<RepositorySummary | null> => {
  const [repository] = await db
    .select({
      id: repositoryTable.id,
      visibility: repositoryTable.visibility,
      ownerId: repositoryTable.ownerId,
      organizationId: repositoryTable.organizationId,
    })
    .from(repositoryTable)
    .innerJoin(userTable, eq(repositoryTable.ownerId, userTable.id))
    .where(and(eq(userTable.username, owner), eq(repositoryTable.slug, repo)))
    .limit(1);

  return repository ?? null;
};

/** Fetch the caller's collaborator row for a repository, if any */
const findCollaborator = async (
  db: GitAccessDb,
  repositoryId: string,
  userId: string,
) => {
  const repository = await db.query.repositoryTable.findFirst({
    where: (table, { eq: eqOp }) => eqOp(table.id, repositoryId),
    with: {
      collaborators: {
        where: (table, { eq: eqOp }) => eqOp(table.userId, userId),
      },
    },
  });

  return repository?.collaborators[0] ?? null;
};

/** Whether the caller is a member of the repository's owning organization */
const isOrganizationMember = async (
  db: GitAccessDb,
  organizationId: string,
  organizations: OrganizationClaim[],
): Promise<boolean> => {
  const organization = await db.query.organizationTable.findFirst({
    where: (table, { eq: eqOp }) => eqOp(table.id, organizationId),
  });

  if (!organization) return false;

  return organizations.some((org) => org.id === organization.idpOrganizationId);
};

/**
 * Whether the caller has admin/owner role in the repository's owning org.
 * Mirrors RepositoryRelationship.plugin.ts:hasOrgAdminRole.
 */
const hasOrganizationWriteRole = async (
  db: GitAccessDb,
  organizationId: string,
  organizations: OrganizationClaim[],
): Promise<boolean> => {
  const organization = await db.query.organizationTable.findFirst({
    where: (table, { eq: eqOp }) => eqOp(table.id, organizationId),
  });

  if (!organization) return false;

  const org = organizations.find(
    (o) => o.id === organization.idpOrganizationId,
  );
  if (!org) return false;

  return org.roles.includes("admin") || org.roles.includes("owner");
};

/**
 * Whether a user (or anonymous caller) may READ a repository.
 *
 * Public repos are world-readable. Private repos require owner, collaborator
 * (any role), or membership in the owning organization. Fails closed.
 */
export const canReadRepository = async (
  user: SelectUser | null,
  repo: RepositorySummary,
  db: GitAccessDb = dbPool,
): Promise<boolean> => {
  // Public repos are readable by anyone, including anonymous callers
  if (repo.visibility === "public") return true;

  if (!user) return false;

  // Owner always has read access
  if (repo.ownerId === user.id) return true;

  // Collaborators (any permission) have read access
  const collaborator = await findCollaborator(db, repo.id, user.id);
  if (collaborator) return true;

  // Organization members have read access to org repos
  if (repo.organizationId) {
    const organizations = userOrganizationsCache.get(user) ?? [];
    if (await isOrganizationMember(db, repo.organizationId, organizations))
      return true;
  }

  return false;
};

/**
 * Whether a user may WRITE (push) to a repository.
 *
 * Never anonymous. Requires owner, a collaborator with write/admin permission,
 * or an org member with admin/owner role. Fails closed.
 */
export const canWriteRepository = async (
  user: SelectUser | null,
  repo: RepositorySummary,
  db: GitAccessDb = dbPool,
): Promise<boolean> => {
  if (!user) return false;

  // Owner always has write access
  if (repo.ownerId === user.id) return true;

  // Collaborators with write or admin permission have write access
  const collaborator = await findCollaborator(db, repo.id, user.id);
  if (
    collaborator?.permission === "write" ||
    collaborator?.permission === "admin"
  ) {
    return true;
  }

  // Organization admins/owners have write access to org repos
  if (repo.organizationId) {
    const organizations = userOrganizationsCache.get(user) ?? [];
    if (await hasOrganizationWriteRole(db, repo.organizationId, organizations))
      return true;
  }

  return false;
};
