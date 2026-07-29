import { eq } from "drizzle-orm";

import { repositoryTable } from "lib/db/schema";
import { isWithinLimit } from "lib/entitlements";
import { repositoryService } from "lib/git";
import {
  FEATURE_KEYS,
  billingBypassOrgIds,
} from "lib/graphql/plugins/authorization/constants";
import events from "lib/providers";

import type { OrganizationClaim } from "@omnidotdev/providers";
import type { dbPool } from "lib/db/db";

/**
 * Repository creation.
 *
 * The single correct way to create a repository: it enforces organization
 * membership and the private-repository entitlement, writes the row, and
 * initializes git storage on disk. The auto-generated `createRepository`
 * mutation is hidden precisely because it does only the row, leaving a
 * repository that can never be cloned or pushed to.
 *
 * Shared by the GraphQL mutation and the MCP tool so the two cannot drift, in
 * the same shape as `pullRequestService.createPullRequest`.
 */

/** What a caller may specify about the repository */
interface CreateRepositoryInput {
  name: string;
  slug: string;
  description?: string | null;
  visibility?: "public" | "private";
  defaultBranch?: string;
  organizationId?: string | null;
}

export interface CreateRepositoryArgs {
  /** Authenticated caller; null is rejected */
  observer: { id: string } | null;
  /** Organization claims the caller acts under */
  organizations: OrganizationClaim[];
  input: CreateRepositoryInput;
  db: typeof dbPool;
  /** Seam for tests; defaults to real on-disk initialization */
  initStorage?: (owner: string, slug: string) => Promise<boolean>;
  /** Seam for tests; defaults to the real entitlement check */
  checkLimit?: (
    organizationId: string,
    currentCount: number,
  ) => Promise<boolean>;
}

/** Result of a creation attempt; `error` is null on success */
export interface CreateRepositoryResult {
  rowId: string | null;
  slug: string | null;
  ownerUsername: string | null;
  organizationSlug: string | null;
  error: string | null;
}

const failure = (error: string): CreateRepositoryResult => ({
  rowId: null,
  slug: null,
  ownerUsername: null,
  organizationSlug: null,
  error,
});

export const createRepository = async ({
  observer,
  organizations,
  input,
  db,
  initStorage = (owner, slug) => repositoryService.init(owner, slug),
  checkLimit = (organizationId, currentCount) =>
    isWithinLimit(
      { organizationId },
      FEATURE_KEYS.MAX_PRIVATE_REPOS,
      currentCount,
      billingBypassOrgIds,
    ),
}: CreateRepositoryArgs): Promise<CreateRepositoryResult> => {
  if (!observer) return failure("Unauthorized");

  const {
    name,
    slug,
    description,
    visibility = "public",
    defaultBranch = "master",
    organizationId,
  } = input;

  if (organizationId) {
    const organization = await db.query.organizationTable.findFirst({
      where: (table, { eq: eqOp }) => eqOp(table.id, organizationId),
      with: { repositories: true },
    });

    if (!organization) return failure("Organization not found");

    // Membership comes from the caller's claims, which for an access token are
    // served from the membership mirror rather than a live token
    const isMember = organizations.some(
      (org) => org.id === organization.idpOrganizationId,
    );
    if (!isMember) return failure("Unauthorized");

    // The catalog limit governs private repositories only, so public ones are
    // unlimited and are not counted
    if (visibility === "private") {
      const privateRepoCount = organization.repositories.filter(
        (repo: { visibility: string }) => repo.visibility === "private",
      ).length;

      if (!(await checkLimit(organizationId, privateRepoCount))) {
        return failure(
          "Maximum number of private repositories reached for your plan",
        );
      }
    }
  }

  const [repository] = await db
    .insert(repositoryTable)
    .values({
      name,
      slug,
      description,
      visibility,
      defaultBranch,
      ownerId: observer.id,
      organizationId: organizationId || null,
    })
    .returning();

  if (!repository) return failure("Failed to create repository");

  const fullRepository = await db.query.repositoryTable.findFirst({
    where: (table, { eq: eqOp }) => eqOp(table.id, repository.id),
    with: { owner: true, organization: true },
  });

  if (!fullRepository) return failure("Failed to fetch repository");

  // Storage is keyed by the owning user's username: an organization repository
  // is still addressed as {ownerUsername}/{slug}
  const ownerSlug = fullRepository.owner?.username;
  if (!ownerSlug) return failure("Invalid owner");

  if (!(await initStorage(ownerSlug, fullRepository.slug))) {
    // Roll the row back rather than leaving a repository that cannot be cloned
    // and a slug that stays taken
    await db
      .delete(repositoryTable)
      .where(eq(repositoryTable.id, repository.id));

    return failure("Failed to initialize git repository");
  }

  events
    .emit({
      type: "arbor.repository.created",
      data: {
        repositoryId: fullRepository.id,
        name,
        slug,
        visibility,
        ownerId: observer.id,
        organizationId: organizationId || null,
      },
      organizationId: organizationId || observer.id,
      subject: fullRepository.id,
    })
    .catch((err) => console.warn("[arbor] Event emit failed", err));

  return {
    rowId: fullRepository.id,
    slug: fullRepository.slug,
    ownerUsername: fullRepository.owner?.username ?? null,
    organizationSlug: fullRepository.organization?.slug ?? null,
    error: null,
  };
};
