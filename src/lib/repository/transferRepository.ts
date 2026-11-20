import { organizationRepositoryCreateDenial } from "lib/auth/organizationRoles";
import { isWithinLimit } from "lib/entitlements";
import { repositoryService } from "lib/git";
import {
  FEATURE_KEYS,
  billingBypassOrgIds,
} from "lib/graphql/plugins/authorization/constants";
import { moveFailure, moveRepositoryInto } from "./moveRepository";
import {
  TRANSFER_ROLE_MESSAGE,
  ensureOrganization,
} from "./transferWorkspaceRepository";

import type { OrganizationClaim } from "@omnidotdev/providers";
import type { dbPool } from "lib/db/db";
import type { SelectUser } from "lib/db/schema";
import type { MoveRepositoryResult } from "./moveRepository";

/**
 * A member moves one of their workspace's repositories to another of their
 * workspaces, from the repository's settings in Arbor.
 *
 * The member must be an owner or admin of the workspace the repository is in
 * (or own a personal repository) and of the target. The move itself is the
 * same as a product's (`moveRepositoryInto`): history, collaborators and the
 * old paths are kept, and the member becomes the owner
 */
export interface TransferRepositoryArgs {
  observer: Pick<SelectUser, "id" | "username"> | null;
  /** Organizations the member acts under (session claims) */
  organizations: OrganizationClaim[];
  input: {
    /** The repository row id */
    rowId: string;
    /** The target workspace, as its identity-provider organization id */
    toIdpOrganizationId: string;
    dryRun?: boolean | null;
  };
  db: typeof dbPool;
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

export const transferRepository = async ({
  observer,
  organizations,
  input,
  db,
  relocate = (owner, slug, newOwner) =>
    repositoryService.relocate(owner, slug, newOwner),
  checkLimit = (organizationId, currentCount) =>
    isWithinLimit(
      { organizationId },
      FEATURE_KEYS.MAX_PRIVATE_REPOS,
      currentCount,
      billingBypassOrgIds,
    ),
}: TransferRepositoryArgs): Promise<MoveRepositoryResult> => {
  if (!observer) return moveFailure("Unauthorized");

  const repository = await db.query.repositoryTable.findFirst({
    where: (table, { eq: eqOp }) => eqOp(table.id, input.rowId),
    with: {
      owner: { columns: { username: true } },
      organization: { columns: { id: true, idpOrganizationId: true } },
    },
  });
  if (!repository) return moveFailure("Repository not found");

  const source = repository.organization;
  // Who may take it out: an owner or admin of its workspace, or the owner of
  // a personal repository. Anyone else learns nothing
  const mayMoveOut = source
    ? organizationRepositoryCreateDenial(
        organizations,
        source.idpOrganizationId,
      ) === null
    : repository.ownerId === observer.id;
  if (!mayMoveOut) {
    const member =
      source && organizations.some((o) => o.id === source.idpOrganizationId);
    return moveFailure(member ? TRANSFER_ROLE_MESSAGE : "Repository not found");
  }

  if (source?.idpOrganizationId === input.toIdpOrganizationId) {
    return moveFailure("The repository is already in that workspace");
  }

  const toClaim = organizations.find(
    (org) => org.id === input.toIdpOrganizationId,
  );
  if (
    !toClaim ||
    organizationRepositoryCreateDenial(organizations, toClaim.id) !== null
  ) {
    return moveFailure(TRANSFER_ROLE_MESSAGE);
  }

  const target = input.dryRun
    ? ((await db.query.organizationTable.findFirst({
        where: (table, { eq: eqOp }) =>
          eqOp(table.idpOrganizationId, toClaim.id),
        columns: { id: true, slug: true },
      })) ?? null)
    : await ensureOrganization(db, toClaim);

  const fromClaim = source
    ? organizations.find((o) => o.id === source.idpOrganizationId)
    : undefined;

  return moveRepositoryInto({
    db,
    repository: {
      id: repository.id,
      slug: repository.slug,
      ownerId: repository.ownerId,
      visibility: repository.visibility,
      ownerUsername: repository.owner?.username ?? null,
    },
    member: { id: observer.id, username: observer.username ?? null },
    memberships: target
      ? [
          ...(source && fromClaim
            ? [{ organizationId: source.id, roles: fromClaim.roles }]
            : []),
          { organizationId: target.id, roles: toClaim.roles },
        ]
      : [],
    sourceOrganizationId: source?.id ?? null,
    target: target ? { id: target.id, slug: target.slug ?? null } : null,
    targetSlug: toClaim.slug ?? null,
    dryRun: !!input.dryRun,
    relocate,
    checkLimit,
  });
};
