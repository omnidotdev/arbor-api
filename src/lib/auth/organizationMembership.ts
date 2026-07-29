import { eq } from "drizzle-orm";

import { organizationMemberTable, organizationTable } from "lib/db/schema";

import type { OrganizationClaim } from "@omnidotdev/providers";
import type { dbPool } from "lib/db/db";

/**
 * Cached organization membership.
 *
 * Arbor learns organization membership only from IDP session claims, so a
 * personal access token, which carries none, could not act on organization
 * repositories at all: `canReadRepository` falls through owner and collaborator
 * to org membership, and that last path was always empty for a token.
 *
 * Membership is therefore mirrored into the database whenever a session token
 * is resolved, and read back when a token authenticates. The mirror is a cache,
 * not a source of truth, so it expires: a user removed from an organization
 * upstream keeps cached access only until the entry goes stale, and any
 * subsequent login refreshes it.
 */

/**
 * How long a mirrored membership is honored.
 *
 * The trade-off is revocation latency against how often a user must sign in to
 * keep a token working. Seven days keeps a removed member's token from lingering
 * indefinitely while not breaking tokens for anyone who logs in occasionally.
 */
export const MEMBERSHIP_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** A mirrored membership row joined to its organization */
export interface MembershipRow {
  roles: string[] | null;
  syncedAt: string | null;
  organization: {
    idpOrganizationId: string;
    name: string | null;
    slug: string | null;
  } | null;
}

/**
 * Whether a mirrored membership is recent enough to honor.
 *
 * Fails closed: a missing or unparseable timestamp is stale, so a row that
 * predates this mechanism never silently grants access.
 */
export const isMembershipFresh = (
  syncedAt: string | null,
  now: number,
): boolean => {
  if (!syncedAt) return false;

  const synced = Date.parse(syncedAt);
  if (Number.isNaN(synced)) return false;

  return now - synced <= MEMBERSHIP_TTL_MS;
};

/**
 * Rebuild the organization claims a token acts under from mirrored rows.
 *
 * Only `id` and `roles` are consulted by the access checks; the remaining
 * fields exist to satisfy the claim shape and are filled from whatever the
 * mirror captured.
 */
export const toOrganizationClaims = (
  rows: MembershipRow[],
  now: number,
): OrganizationClaim[] =>
  rows
    .filter((row) => row.organization && isMembershipFresh(row.syncedAt, now))
    .map((row) => ({
      // access checks compare against organization.idpOrganizationId
      id: row.organization?.idpOrganizationId ?? "",
      name: row.organization?.name ?? "",
      slug: row.organization?.slug ?? "",
      type: "team" as const,
      roles: row.roles ?? [],
      teams: [],
    }));

/**
 * Minimum interval between membership mirrors for a given user.
 *
 * `resolveUserFromToken` runs on every authenticated request, so mirroring
 * unconditionally would add database writes to the hot path. Throttling per
 * user keeps the mirror close enough to current while making the common request
 * cost nothing.
 */
export const SYNC_THROTTLE_MS = 5 * 60 * 1000;

/**
 * Whether this user's membership should be mirrored now.
 *
 * Throttling is per user rather than global so that one active user cannot
 * starve everyone else's mirror.
 */
export const shouldSync = (
  lastSyncedByUser: Map<string, number>,
  userId: string,
  now: number,
): boolean => {
  const last = lastSyncedByUser.get(userId);
  if (last === undefined) return true;

  return now - last >= SYNC_THROTTLE_MS;
};

/** Database surface needed to mirror memberships */
type MembershipSyncDb = Pick<typeof dbPool, "query" | "insert" | "update">;

/** Tracks the last mirror per user, so the hot path stays cheap */
const lastSyncedByUser = new Map<string, number>();

/**
 * Mirror a session's organization claims into the database.
 *
 * Only organizations Arbor already knows about are mirrored. An organization
 * row appears when it is created through Arbor, so skipping unknown ones avoids
 * accumulating rows for every unrelated organization a user happens to belong
 * to, and costs nothing: an organization with no Arbor presence owns no
 * repositories, so no access check can turn on it.
 *
 * Best-effort by design. Authentication must not fail because the mirror could
 * not be written.
 */
export const syncOrganizationMemberships = async (
  userId: string,
  claims: OrganizationClaim[],
  db: MembershipSyncDb,
  now: number = Date.now(),
): Promise<void> => {
  if (!shouldSync(lastSyncedByUser, userId, now)) return;
  lastSyncedByUser.set(userId, now);

  try {
    if (claims.length === 0) return;

    const known = await db.query.organizationTable.findMany({
      where: (table, { inArray }) =>
        inArray(
          table.idpOrganizationId,
          claims.map((claim) => claim.id),
        ),
      columns: { id: true, idpOrganizationId: true },
    });

    if (known.length === 0) return;

    const claimByIdpId = new Map(claims.map((claim) => [claim.id, claim]));
    const syncedAt = new Date(now).toISOString();

    for (const organization of known) {
      const claim = claimByIdpId.get(organization.idpOrganizationId);
      if (!claim) continue;

      // Refresh the cached display fields the IDP owns
      await db
        .update(organizationTable)
        .set({ name: claim.name, slug: claim.slug })
        .where(eq(organizationTable.id, organization.id));

      await db
        .insert(organizationMemberTable)
        .values({
          userId,
          organizationId: organization.id,
          roles: claim.roles,
          syncedAt,
        })
        .onConflictDoUpdate({
          target: [
            organizationMemberTable.userId,
            organizationMemberTable.organizationId,
          ],
          set: { roles: claim.roles, syncedAt },
        });
    }
  } catch (err) {
    // Never block authentication on the mirror
    console.warn("[Auth] Organization membership sync failed:", err);
  }
};

/**
 * Read the organization claims a token acts under from the mirror.
 *
 * Returns an empty list on any failure, so a token falls back to owner and
 * collaborator access rather than gaining anything it should not have.
 */
export const readOrganizationClaims = async (
  userId: string,
  db: Pick<typeof dbPool, "query">,
  now: number = Date.now(),
): Promise<OrganizationClaim[]> => {
  try {
    const rows = await db.query.organizationMemberTable.findMany({
      where: (table, { eq: eqOp }) => eqOp(table.userId, userId),
      with: {
        organization: {
          columns: { idpOrganizationId: true, name: true, slug: true },
        },
      },
    });

    return toOrganizationClaims(rows as MembershipRow[], now);
  } catch (err) {
    console.warn("[Auth] Organization membership read failed:", err);
    return [];
  }
};
