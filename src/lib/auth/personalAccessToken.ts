import { createHash, randomBytes } from "node:crypto";

import { eq } from "drizzle-orm";

import { readOrganizationClaims } from "lib/auth/organizationMembership";
import { dbPool } from "lib/db/db";
import {
  personalAccessTokenRepositoryTable,
  personalAccessTokenTable,
} from "lib/db/schema";

import type { ResolvedUser } from "lib/auth/resolveUserFromToken";
import type { TokenScope } from "lib/auth/tokenScope";

/**
 * Prefix that marks a credential as an Arbor personal access token (PAT).
 * Git sends the token as the HTTP Basic-auth password; this prefix lets the
 * auth layer distinguish a PAT from an IDP session JWT without a lookup.
 */
export const PAT_PREFIX = "arbor_pat_";

/** Number of leading characters kept as the non-secret display prefix */
const PREFIX_DISPLAY_LENGTH = 14;

/** Milliseconds in a day, for translating an expiresInDays lifetime */
const MS_PER_DAY = 86_400_000;

/** Database surface required to resolve a PAT to a user */
type PatResolveDb = Pick<typeof dbPool, "query" | "update">;

/** Whether a raw credential is (claims to be) a personal access token */
export const isPersonalAccessToken = (token: string): boolean =>
  token.startsWith(PAT_PREFIX);

/**
 * Hash a plaintext token for storage or lookup.
 *
 * The plaintext is never stored; only this SHA-256 hex digest is persisted, and
 * incoming tokens are hashed the same way to look the row up.
 */
export const hashPersonalAccessToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

/** A freshly generated token and the values persisted alongside its hash */
export interface GeneratedPersonalAccessToken {
  /** Plaintext token, returned to the user exactly once */
  token: string;
  /** SHA-256 hex digest stored in the database */
  tokenHash: string;
  /** Short non-secret prefix stored for UI display */
  tokenPrefix: string;
}

/**
 * Generate a new personal access token.
 *
 * The token is `arbor_pat_` followed by a URL-safe, high-entropy random string
 * from 32 random bytes. Only the hash and a short display prefix are persisted.
 */
export const generatePersonalAccessToken = (): GeneratedPersonalAccessToken => {
  const random = randomBytes(32).toString("base64url");
  const token = `${PAT_PREFIX}${random}`;

  return {
    token,
    tokenHash: hashPersonalAccessToken(token),
    tokenPrefix: token.slice(0, PREFIX_DISPLAY_LENGTH),
  };
};

/** Arguments for minting a personal access token */
export interface CreatePersonalAccessTokenArgs {
  /** The authenticated user; null means unauthenticated (rejected) */
  observer: { id: string } | null;
  /** User-facing label */
  name: string;
  /** Optional lifetime in days; omit or null for a non-expiring token */
  expiresInDays?: number | null;
  /** Furthest operation the token may perform; defaults to "write" */
  permission?: "read" | "write";
  /**
   * Repositories to confine the token to. Omit or pass an empty list to leave
   * the token unconfined (it then reaches everything its owner can reach).
   */
  repositoryIds?: string[] | null;
  /** Database surface used for the insert */
  db: Pick<typeof dbPool, "insert">;
}

/** Payload returned to the caller when a token is created */
export interface CreatedPersonalAccessTokenPayload {
  rowId: string;
  name: string;
  tokenPrefix: string;
  expiresAt: string | null;
  createdAt: string;
  permission: string;
  /** Plaintext token, returned exactly once */
  token: string;
}

/**
 * Mint a personal access token for the authenticated user.
 *
 * Ownership is pinned server-side: the row's userId is always the observer's
 * id. Unauthenticated callers are rejected. Only the token hash is persisted;
 * the plaintext is returned once in the payload.
 */
export const createPersonalAccessTokenRecord = async ({
  observer,
  name,
  expiresInDays,
  permission = "write",
  repositoryIds,
  db,
}: CreatePersonalAccessTokenArgs): Promise<CreatedPersonalAccessTokenPayload> => {
  // Must be authenticated; never trust a client-supplied owner
  if (!observer) throw new Error("Unauthorized");

  // Reject anything outside the supported set rather than storing it: an
  // unrecognized value would read as "not read" downstream and so would
  // silently grant write
  if (permission !== "read" && permission !== "write")
    throw new Error("Invalid permission");

  const expiresAt =
    expiresInDays != null
      ? new Date(Date.now() + expiresInDays * MS_PER_DAY).toISOString()
      : null;

  const { token, tokenHash, tokenPrefix } = generatePersonalAccessToken();

  const [row] = await db
    .insert(personalAccessTokenTable)
    .values({
      userId: observer.id,
      name,
      tokenHash,
      tokenPrefix,
      expiresAt,
      permission,
    })
    .returning();

  if (!row) throw new Error("Failed to create token");

  // Naming repositories is what confines the token; writing no rows leaves it
  // unconfined, which is the behaviour of every token minted before scoping
  if (repositoryIds?.length) {
    await db.insert(personalAccessTokenRepositoryTable).values(
      repositoryIds.map((repositoryId) => ({
        personalAccessTokenId: row.id,
        repositoryId,
      })),
    );
  }

  return {
    rowId: row.id,
    name: row.name,
    tokenPrefix: row.tokenPrefix,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    permission: row.permission,
    token,
  };
};

/** Shape of a token row that scope is derived from */
interface ScopableTokenRow {
  permission?: string | null;
  repositories?: { repositoryId: string }[] | null;
}

/**
 * Derive a token's scope from its row.
 *
 * Both fields fall back to full authority when absent, so a token minted before
 * scoping existed is never silently narrowed. An empty repository whitelist
 * means "not confined" rather than "reaches nothing", because confinement is
 * expressed by naming repositories, and a token that reaches nothing would be
 * useless rather than safe.
 */
const resolveTokenScope = (row: ScopableTokenRow): TokenScope => ({
  permission: row.permission === "read" ? "read" : "write",
  repositoryIds: row.repositories?.length
    ? row.repositories.map(({ repositoryId }) => repositoryId)
    : null,
});

/**
 * Resolve an Arbor user from a personal access token.
 *
 * Hashes the token, looks up the matching `personal_access_token` row, rejects
 * a missing row or an expired token, then resolves the owning user. Updates
 * `lastUsedAt` best-effort (a failure there never blocks authentication).
 *
 * A PAT carries no IDP organization claims of its own, so `organizations` is
 * read from the membership mirror written whenever this user last resolved a
 * session token. Membership older than the freshness window is dropped, so a
 * user removed from an organization upstream loses cached access rather than
 * keeping it indefinitely.
 *
 * @param token - Raw credential (the git Basic-auth password)
 * @param db - Database surface (defaults to the pool)
 * @returns The resolved user with empty org claims, or null when invalid
 */
export const resolveUserFromPat = async (
  token: string,
  db: PatResolveDb = dbPool,
): Promise<ResolvedUser | null> => {
  try {
    if (!isPersonalAccessToken(token)) return null;

    const tokenHash = hashPersonalAccessToken(token);

    const row = await db.query.personalAccessTokenTable.findFirst({
      where: (table, { eq: eqOp }) => eqOp(table.tokenHash, tokenHash),
      with: { user: true, repositories: true },
    });

    if (!row?.user) return null;

    // Reject expired tokens
    if (row.expiresAt && new Date(row.expiresAt).getTime() <= Date.now())
      return null;

    const scope = resolveTokenScope(row);

    // Best-effort last-used stamp; never block auth on a write failure
    void db
      .update(personalAccessTokenTable)
      .set({ lastUsedAt: new Date().toISOString() })
      .where(eq(personalAccessTokenTable.id, row.id))
      .catch((err) =>
        console.warn("[Auth] PAT lastUsedAt update failed:", err),
      );

    // A token carries no IDP claims, so organization membership comes from the
    // mirror written on session login (see organizationMembership). Without
    // this, org-membership-derived access is unavailable to every token
    const organizations = await readOrganizationClaims(row.user.id, db);

    return { user: row.user, organizations, scope };
  } catch (err) {
    console.error("[Auth] PAT resolution error:", err);
    return null;
  }
};
