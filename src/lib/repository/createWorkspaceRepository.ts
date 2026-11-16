import {
  INSUFFICIENT_ROLE_MESSAGE,
  organizationRepositoryCreateDenial,
} from "lib/auth/organizationRoles";
import { FIRST_PARTY_SERVICE_USERS } from "lib/auth/serviceUsers";
import {
  organizationMemberTable,
  organizationTable,
  repositoryCollaboratorTable,
} from "lib/db/schema";
import { createRepository } from "./createRepository";

import type { OrganizationClaim } from "@omnidotdev/providers";
import type { ResolvedUser } from "lib/auth/resolveUserFromToken";
import type { dbPool } from "lib/db/db";
import type { SelectUser } from "lib/db/schema";
import type { CreateRepositoryResult } from "./createRepository";

/**
 * Workspace repository creation for a first-party product, on a member's
 * behalf.
 *
 * An Omni product (Keystone, for one) keeps work it produces for a workspace in
 * a repository the WORKSPACE owns, not in one the product owns. The product's
 * service user cannot be a workspace member, so it calls this with the
 * member's own access token: the member must belong to the workspace with an
 * owner or admin role (the role that may create repositories there), the
 * repository is created exactly as if the member had created it (owned by the
 * workspace's organization, under the member's path), and the product is then
 * added as a `write` collaborator on that one repository. That grant is the
 * product's only reach: it is visible to the workspace and revocable like any
 * other collaborator, and it never extends to the workspace's other
 * repositories.
 *
 * Idempotent per workspace and slug, so a product can call it on every
 * publish: an existing repository it already collaborates on is returned.
 */

/** What the product specifies about the repository */
interface WorkspaceRepositoryInput {
  /** The workspace, as its identity-provider organization id */
  idpOrganizationId: string;
  name: string;
  slug: string;
  description?: string | null;
  visibility?: "public" | "private";
}

export interface WorkspaceRepositoryResult extends CreateRepositoryResult {
  /** Clone path owner (`<owner>/<slug>`): the creating member's username */
  ownerUsername: string | null;
}

export interface CreateWorkspaceRepositoryArgs {
  /** The calling product's service user (the authenticated observer) */
  observer: Pick<SelectUser, "id" | "identityProviderId"> | null;
  /** The member's access token, presented by the product */
  memberToken: string | null;
  input: WorkspaceRepositoryInput;
  db: typeof dbPool;
  /** Seam for tests; defaults to identity-provider token resolution */
  resolveMember: (token: string) => Promise<ResolvedUser | null>;
  /** Seam for tests; defaults to the shared creation path */
  create?: typeof createRepository;
}

const failure = (error: string): WorkspaceRepositoryResult => ({
  rowId: null,
  slug: null,
  ownerUsername: null,
  organizationSlug: null,
  error,
});

/** Whether a user is a first-party product that may act for members */
export const isFirstPartyServiceUser = (
  user: Pick<SelectUser, "identityProviderId"> | null,
): boolean =>
  !!user &&
  FIRST_PARTY_SERVICE_USERS.some(
    (def) =>
      def.actsForMembers && def.identityProviderId === user.identityProviderId,
  );

/**
 * Find or create the Arbor organization row for a workspace. Organization
 * identity is owned by the identity provider, so the row only caches the
 * claimed name and slug
 */
const ensureOrganization = async (
  db: typeof dbPool,
  claim: OrganizationClaim,
): Promise<{ id: string; slug: string | null }> => {
  const existing = await db.query.organizationTable.findFirst({
    where: (table, { eq: eqOp }) => eqOp(table.idpOrganizationId, claim.id),
    columns: { id: true, slug: true },
  });
  if (existing) return existing;

  const [created] = await db
    .insert(organizationTable)
    .values({ idpOrganizationId: claim.id, name: claim.name, slug: claim.slug })
    .onConflictDoNothing({ target: organizationTable.idpOrganizationId })
    .returning({ id: organizationTable.id, slug: organizationTable.slug });
  if (created) return created;

  // Lost a race with a concurrent create: read the winner
  const raced = await db.query.organizationTable.findFirst({
    where: (table, { eq: eqOp }) => eqOp(table.idpOrganizationId, claim.id),
    columns: { id: true, slug: true },
  });
  if (!raced) throw new Error("organization row missing after create");
  return raced;
};

export const createWorkspaceRepository = async ({
  observer,
  memberToken,
  input,
  db,
  resolveMember,
  create = createRepository,
}: CreateWorkspaceRepositoryArgs): Promise<WorkspaceRepositoryResult> => {
  // Only a first-party product may act for a member
  if (!observer || !isFirstPartyServiceUser(observer)) {
    return failure("Unauthorized");
  }
  if (!memberToken) return failure("A member token is required");

  const member = await resolveMember(memberToken);
  if (!member) return failure("Unauthorized");

  // The member must belong to the workspace, as their own token vouches
  const claim = member.organizations.find(
    (org) => org.id === input.idpOrganizationId,
  );
  if (!claim) return failure("Unauthorized");

  // and hold a role that may create repositories there. Checked before the
  // re-publish branch too: the product writes to the workspace repository on
  // the member's say-so, so a member who could not create it directly must
  // not reach it through the product either
  if (
    organizationRepositoryCreateDenial(
      member.organizations,
      input.idpOrganizationId,
    ) !== null
  ) {
    return failure(INSUFFICIENT_ROLE_MESSAGE);
  }

  const organization = await ensureOrganization(db, claim);

  // Mirror this membership now, so the member's later token or git access
  // resolves the new organization without waiting for the next sign-in
  await db
    .insert(organizationMemberTable)
    .values({
      userId: member.user.id,
      organizationId: organization.id,
      roles: claim.roles,
    })
    .onConflictDoUpdate({
      target: [
        organizationMemberTable.userId,
        organizationMemberTable.organizationId,
      ],
      set: { roles: claim.roles, syncedAt: new Date().toISOString() },
    });

  // Re-publish: the workspace already has this repository
  const existing = await db.query.repositoryTable.findFirst({
    where: (table, { eq: eqOp, and: andOp }) =>
      andOp(
        eqOp(table.organizationId, organization.id),
        eqOp(table.slug, input.slug),
      ),
    with: {
      owner: { columns: { username: true } },
      collaborators: {
        where: (table, { eq: eqOp }) => eqOp(table.userId, observer.id),
      },
    },
  });

  if (existing) {
    const grant = existing.collaborators[0]?.permission;
    // The slug is taken by a repository the product was never granted
    if (grant !== "write" && grant !== "admin") {
      return failure("A repository with this name already exists");
    }

    return {
      rowId: existing.id,
      slug: existing.slug,
      ownerUsername: existing.owner?.username ?? null,
      organizationSlug: organization.slug,
      error: null,
    };
  }

  const result = await create({
    observer: member.user,
    organizations: member.organizations,
    input: {
      name: input.name,
      slug: input.slug,
      description: input.description,
      visibility: input.visibility ?? "public",
      organizationId: organization.id,
    },
    db,
  });

  if (result.error || !result.rowId) return result;

  // The product's only reach: write on this one repository
  await db
    .insert(repositoryCollaboratorTable)
    .values({
      repositoryId: result.rowId,
      userId: observer.id,
      permission: "write",
    })
    .onConflictDoUpdate({
      target: [
        repositoryCollaboratorTable.repositoryId,
        repositoryCollaboratorTable.userId,
      ],
      set: { permission: "write", updatedAt: new Date().toISOString() },
    });

  return result;
};
