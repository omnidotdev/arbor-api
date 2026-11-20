import { and, eq, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import {
  organizationTable,
  repositoryCollaboratorTable,
  repositoryRedirectTable,
  repositoryTable,
  userTable,
} from "lib/db/schema";

import type { OrganizationClaim } from "@omnidotdev/providers";
import type { dbPool } from "lib/db/db";
import type { SelectUser } from "lib/db/schema";

/** Where a repository lives now: the path segment and slug links use */
export interface RepositoryLocation {
  /** The owning workspace's slug, or the owner's username for a personal repository */
  ownerSlug: string;
  repoSlug: string;
}

export interface ResolveMovedRepositoryArgs {
  /** The old path's owner segment: a workspace slug or id, or a username */
  ownerSlug: string;
  repoSlug: string;
  observer: Pick<SelectUser, "id"> | null;
  organizations: Pick<OrganizationClaim, "id">[];
  db: typeof dbPool;
}

/**
 * Where a repository that moved away from a web path lives now, so an old
 * link (`/@<old workspace>/<repo>`) can be redirected after a transfer.
 *
 * A repository that still lives at the path always wins, and the answer is
 * only given to a caller who may read the moved repository (public, or the
 * owner, a collaborator, or a member of its workspace), so the lookup reveals
 * nothing a caller could not already open
 */
export const resolveMovedRepository = async ({
  ownerSlug,
  repoSlug,
  observer,
  organizations,
  db,
}: ResolveMovedRepositoryArgs): Promise<RepositoryLocation | null> => {
  const oldOrganization = alias(organizationTable, "old_organization");
  const currentOrganization = alias(organizationTable, "current_organization");

  const [moved] = await db
    .select({
      id: repositoryTable.id,
      slug: repositoryTable.slug,
      visibility: repositoryTable.visibility,
      ownerId: repositoryTable.ownerId,
      ownerUsername: userTable.username,
      organizationSlug: currentOrganization.slug,
      organizationIdpId: currentOrganization.idpOrganizationId,
    })
    .from(repositoryRedirectTable)
    .innerJoin(
      repositoryTable,
      eq(repositoryRedirectTable.repositoryId, repositoryTable.id),
    )
    .innerJoin(userTable, eq(repositoryTable.ownerId, userTable.id))
    .leftJoin(
      currentOrganization,
      eq(repositoryTable.organizationId, currentOrganization.id),
    )
    .leftJoin(
      oldOrganization,
      eq(repositoryRedirectTable.organizationId, oldOrganization.id),
    )
    .where(
      and(
        eq(repositoryRedirectTable.slug, repoSlug),
        or(
          eq(repositoryRedirectTable.ownerUsername, ownerSlug),
          eq(oldOrganization.slug, ownerSlug),
          eq(oldOrganization.idpOrganizationId, ownerSlug),
        ),
      ),
    )
    .limit(1);

  if (!moved) return null;

  // A repository that still lives at the path wins over the redirect
  const [stillThere] = await db
    .select({ id: repositoryTable.id })
    .from(repositoryTable)
    .innerJoin(userTable, eq(repositoryTable.ownerId, userTable.id))
    .leftJoin(
      organizationTable,
      eq(repositoryTable.organizationId, organizationTable.id),
    )
    .where(
      and(
        eq(repositoryTable.slug, repoSlug),
        or(
          eq(userTable.username, ownerSlug),
          eq(organizationTable.slug, ownerSlug),
          eq(organizationTable.idpOrganizationId, ownerSlug),
        ),
      ),
    )
    .limit(1);
  if (stillThere) return null;

  const readable =
    moved.visibility === "public" ||
    (observer !== null &&
      (moved.ownerId === observer.id ||
        organizations.some((org) => org.id === moved.organizationIdpId) ||
        (
          await db
            .select({ userId: repositoryCollaboratorTable.userId })
            .from(repositoryCollaboratorTable)
            .where(
              and(
                eq(repositoryCollaboratorTable.repositoryId, moved.id),
                eq(repositoryCollaboratorTable.userId, observer.id),
              ),
            )
            .limit(1)
        ).length > 0));
  if (!readable) return null;

  return {
    ownerSlug: moved.organizationSlug ?? moved.ownerUsername,
    repoSlug: moved.slug,
  };
};
