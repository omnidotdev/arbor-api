import { organizationRepositoryCreateDenial } from "lib/auth/organizationRoles";
import { organizationTable } from "lib/db/schema";
import { isWithinLimit } from "lib/entitlements";
import { repositoryService } from "lib/git";
import {
  FEATURE_KEYS,
  billingBypassOrgIds,
} from "lib/graphql/plugins/authorization/constants";
import { isFirstPartyServiceUser } from "./createWorkspaceRepository";
import { moveRepositoryInto } from "./moveRepository";

import type { OrganizationClaim } from "@omnidotdev/providers";
import type { ResolvedUser } from "lib/auth/resolveUserFromToken";
import type { dbPool } from "lib/db/db";
import type { SelectUser } from "lib/db/schema";

/**
 * Transfer a workspace repository to another workspace, for a first-party
 * product acting with a member's token (the same model as
 * `createWorkspaceRepository`).
 *
 * Keystone moves a hosted site's repository along with the site. The member
 * must be an owner or admin of BOTH workspaces (the role that may create
 * repositories in each), and the product must hold write on the repository,
 * so a product can only move what it manages, and only when a member who
 * controls both sides asks.
 *
 * The repository keeps its id, history, collaborators and the product's
 * grant. Its organization becomes the target, and its owner the transferring
 * member: the first publisher may not belong to the target workspace and must
 * not keep owner rights over its repository. A new owner changes the storage
 * and clone path (`{owner}/{slug}`), so the bare repository moves on disk
 * (history and all) and the old path is kept as a redirect, so existing clone
 * URLs and remotes keep working.
 *
 * Idempotent: a repository already in the target workspace (and granted to
 * the product) is reported as transferred, so a product can resume an
 * interrupted move. A dry run makes every check and changes nothing.
 */

interface TransferWorkspaceRepositoryInput {
  /** The workspace the repository is in, as its identity-provider id */
  fromIdpOrganizationId: string;
  /** The workspace to move it to, as its identity-provider id */
  toIdpOrganizationId: string;
  slug: string;
  /** Run every check and change nothing */
  dryRun?: boolean | null;
}

export interface TransferWorkspaceRepositoryResult {
  rowId: string | null;
  slug: string | null;
  /** Clone path owner (`<owner>/<slug>`) after the transfer */
  ownerUsername: string | null;
  /** The target workspace's slug, for links into Arbor */
  organizationSlug: string | null;
  /** Clone path owner before the transfer (still served as a redirect) */
  previousOwnerUsername: string | null;
  error: string | null;
}

export interface TransferWorkspaceRepositoryArgs {
  /** The calling product's service user (the authenticated observer) */
  observer: Pick<SelectUser, "id" | "identityProviderId"> | null;
  /** The member's access token, presented by the product */
  memberToken: string | null;
  input: TransferWorkspaceRepositoryInput;
  db: typeof dbPool;
  /** Seam for tests; defaults to identity-provider token resolution */
  resolveMember: (token: string) => Promise<ResolvedUser | null>;
  /** Seam for tests; defaults to moving the repository's storage */
  relocate?: (
    owner: string,
    slug: string,
    newOwner: string,
  ) => Promise<boolean>;
  /** Seam for tests; defaults to the real private-repository limit */
  checkLimit?: (
    organizationId: string,
    currentCount: number,
  ) => Promise<boolean>;
}

/** Shown to a member who is not an owner or admin of both workspaces */
export const TRANSFER_ROLE_MESSAGE =
  "Only an owner or admin of both workspaces can move a repository between them";

const failure = (error: string): TransferWorkspaceRepositoryResult => ({
  rowId: null,
  slug: null,
  ownerUsername: null,
  organizationSlug: null,
  previousOwnerUsername: null,
  error,
});

/** Find or create the Arbor organization row for a workspace claim */
export const ensureOrganization = async (
  db: typeof dbPool,
  claim: OrganizationClaim,
): Promise<{ id: string; slug: string | null }> => {
  const [created] = await db
    .insert(organizationTable)
    .values({ idpOrganizationId: claim.id, name: claim.name, slug: claim.slug })
    .onConflictDoNothing({ target: organizationTable.idpOrganizationId })
    .returning({ id: organizationTable.id, slug: organizationTable.slug });
  if (created) return created;

  const existing = await db.query.organizationTable.findFirst({
    where: (table, { eq: eqOp }) => eqOp(table.idpOrganizationId, claim.id),
    columns: { id: true, slug: true },
  });
  if (!existing) throw new Error("organization row missing after create");
  return existing;
};

/** Whether the product's grant on a repository lets it manage it */
const managedByProduct = (
  collaborators: Array<{ permission: string }>,
): boolean =>
  collaborators.some(
    (c) => c.permission === "write" || c.permission === "admin",
  );

export const transferWorkspaceRepository = async ({
  observer,
  memberToken,
  input,
  db,
  resolveMember,
  relocate = (owner, slug, newOwner) =>
    repositoryService.relocate(owner, slug, newOwner),
  checkLimit = (organizationId, currentCount) =>
    isWithinLimit(
      { organizationId },
      FEATURE_KEYS.MAX_PRIVATE_REPOS,
      currentCount,
      billingBypassOrgIds,
    ),
}: TransferWorkspaceRepositoryArgs): Promise<TransferWorkspaceRepositoryResult> => {
  if (!observer || !isFirstPartyServiceUser(observer)) {
    return failure("Unauthorized");
  }
  if (!memberToken) return failure("A member token is required");
  if (input.fromIdpOrganizationId === input.toIdpOrganizationId) {
    return failure("The repository is already in that workspace");
  }

  const member = await resolveMember(memberToken);
  if (!member) return failure("Unauthorized");

  const fromClaim = member.organizations.find(
    (org) => org.id === input.fromIdpOrganizationId,
  );
  const toClaim = member.organizations.find(
    (org) => org.id === input.toIdpOrganizationId,
  );
  // A workspace the member is not in reads as not found
  if (!fromClaim || !toClaim) return failure("Unauthorized");
  if (
    organizationRepositoryCreateDenial(member.organizations, fromClaim.id) !==
      null ||
    organizationRepositoryCreateDenial(member.organizations, toClaim.id) !==
      null
  ) {
    return failure(TRANSFER_ROLE_MESSAGE);
  }

  const source = await db.query.organizationTable.findFirst({
    where: (table, { eq: eqOp }) => eqOp(table.idpOrganizationId, fromClaim.id),
    columns: { id: true },
  });
  if (!source) return failure("Repository not found");
  const target = input.dryRun
    ? ((await db.query.organizationTable.findFirst({
        where: (table, { eq: eqOp }) =>
          eqOp(table.idpOrganizationId, toClaim.id),
        columns: { id: true, slug: true },
      })) ?? null)
    : await ensureOrganization(db, toClaim);
  const targetSlug = target?.slug ?? toClaim.slug ?? null;

  // Resume: already moved
  if (target) {
    const moved = await db.query.repositoryTable.findFirst({
      where: (table, { eq: eqOp, and: andOp }) =>
        andOp(
          eqOp(table.organizationId, target.id),
          eqOp(table.slug, input.slug),
        ),
      with: {
        owner: { columns: { username: true } },
        collaborators: {
          where: (table, { eq: eqOp }) => eqOp(table.userId, observer.id),
        },
      },
    });
    if (moved) {
      if (!managedByProduct(moved.collaborators)) {
        return failure(
          "A repository with this name already exists in that workspace",
        );
      }
      return {
        rowId: moved.id,
        slug: moved.slug,
        ownerUsername: moved.owner?.username ?? null,
        organizationSlug: targetSlug,
        previousOwnerUsername: null,
        error: null,
      };
    }
  }

  const repository = await db.query.repositoryTable.findFirst({
    where: (table, { eq: eqOp, and: andOp }) =>
      andOp(
        eqOp(table.organizationId, source.id),
        eqOp(table.slug, input.slug),
      ),
    with: {
      owner: { columns: { username: true } },
      collaborators: {
        where: (table, { eq: eqOp }) => eqOp(table.userId, observer.id),
      },
    },
  });
  // The product only moves repositories it manages
  if (!repository || !managedByProduct(repository.collaborators)) {
    return failure("Repository not found");
  }
  return moveRepositoryInto({
    db,
    repository: {
      id: repository.id,
      slug: repository.slug,
      ownerId: repository.ownerId,
      visibility: repository.visibility,
      ownerUsername: repository.owner?.username ?? null,
    },
    member: { id: member.user.id, username: member.user.username ?? null },
    memberships: target
      ? [
          { organizationId: source.id, roles: fromClaim.roles },
          { organizationId: target.id, roles: toClaim.roles },
        ]
      : [],
    sourceOrganizationId: source.id,
    target: target ? { id: target.id, slug: targetSlug } : null,
    targetSlug,
    dryRun: !!input.dryRun,
    relocate,
    checkLimit,
  });
};
