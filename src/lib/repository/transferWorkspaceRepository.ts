import { and, eq } from "drizzle-orm";

import { organizationRepositoryCreateDenial } from "lib/auth/organizationRoles";
import {
  organizationMemberTable,
  organizationTable,
  repositoryRedirectTable,
  repositoryTable,
} from "lib/db/schema";
import { isWithinLimit } from "lib/entitlements";
import { invalidateRepositorySizeCache, repositoryService } from "lib/git";
import {
  FEATURE_KEYS,
  billingBypassOrgIds,
} from "lib/graphql/plugins/authorization/constants";
import events from "lib/providers";
import { isFirstPartyServiceUser } from "./createWorkspaceRepository";

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
const ensureOrganization = async (
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
  const previousOwner = repository.owner?.username;
  const newOwner = member.user.username;
  if (!previousOwner || !newOwner) return failure("Invalid owner");

  // The member's own path must be free for the repository to move onto it
  if (member.user.id !== repository.ownerId) {
    const clash = await db.query.repositoryTable.findFirst({
      where: (table, { eq: eqOp, and: andOp }) =>
        andOp(
          eqOp(table.ownerId, member.user.id),
          eqOp(table.slug, input.slug),
        ),
      columns: { id: true },
    });
    if (clash) {
      return failure(
        "You already have a repository with this name. Rename it first, then move this one.",
      );
    }
  }

  // The private-repository limit governs the target like a new repository
  if (repository.visibility === "private" && target) {
    const privateCount = (
      await db.query.repositoryTable.findMany({
        where: (table, { eq: eqOp, and: andOp }) =>
          andOp(
            eqOp(table.organizationId, target.id),
            eqOp(table.visibility, "private"),
          ),
        columns: { id: true },
      })
    ).length;
    if (!(await checkLimit(target.id, privateCount))) {
      return failure(
        "The target workspace has reached its plan's private repository limit",
      );
    }
  }

  if (input.dryRun || !target) {
    return {
      rowId: repository.id,
      slug: repository.slug,
      ownerUsername: newOwner,
      organizationSlug: targetSlug,
      previousOwnerUsername: previousOwner,
      error: null,
    };
  }

  // Mirror both memberships now, so the member's later git access resolves
  // the organizations without waiting for the next sign-in
  for (const [organizationId, claim] of [
    [source.id, fromClaim],
    [target.id, toClaim],
  ] as const) {
    await db
      .insert(organizationMemberTable)
      .values({ userId: member.user.id, organizationId, roles: claim.roles })
      .onConflictDoUpdate({
        target: [
          organizationMemberTable.userId,
          organizationMemberTable.organizationId,
        ],
        set: { roles: claim.roles, syncedAt: new Date().toISOString() },
      });
  }

  const ownerChanges = previousOwner !== newOwner;
  if (
    ownerChanges &&
    !(await relocate(previousOwner, repository.slug, newOwner))
  ) {
    return failure("Failed to move the repository");
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(repositoryTable)
        .set({
          ownerId: member.user.id,
          organizationId: target.id,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(repositoryTable.id, repository.id));

      if (!ownerChanges) return;

      // The new path is a real repository now: no redirect may claim it
      await tx
        .delete(repositoryRedirectTable)
        .where(
          and(
            eq(repositoryRedirectTable.ownerUsername, newOwner),
            eq(repositoryRedirectTable.slug, repository.slug),
          ),
        );
      // Keep the old path serving this repository
      await tx
        .insert(repositoryRedirectTable)
        .values({
          ownerUsername: previousOwner,
          slug: repository.slug,
          organizationId: source.id,
          repositoryId: repository.id,
        })
        .onConflictDoUpdate({
          target: [
            repositoryRedirectTable.ownerUsername,
            repositoryRedirectTable.slug,
          ],
          set: { repositoryId: repository.id, organizationId: source.id },
        });
    });
  } catch (error) {
    // Put storage back where the unchanged row says it is
    if (ownerChanges) await relocate(newOwner, repository.slug, previousOwner);
    console.error("[arbor] repository transfer failed", error);
    return failure("Failed to move the repository");
  }

  if (ownerChanges) {
    invalidateRepositorySizeCache(previousOwner, repository.slug);
  }

  events
    .emit({
      type: "arbor.repository.transferred",
      data: {
        repositoryId: repository.id,
        slug: repository.slug,
        fromOrganizationId: source.id,
        toOrganizationId: target.id,
        ownerId: member.user.id,
      },
      organizationId: target.id,
      subject: repository.id,
    })
    .catch((err) => console.warn("[arbor] Event emit failed", err));

  return {
    rowId: repository.id,
    slug: repository.slug,
    ownerUsername: newOwner,
    organizationSlug: targetSlug,
    previousOwnerUsername: previousOwner,
    error: null,
  };
};
