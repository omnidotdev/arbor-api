import { extractOrgClaims } from "@omnidotdev/providers";
import { QueryClient } from "@tanstack/query-core";
import { createRemoteJWKSet, jwtVerify } from "jose";
import ms from "ms";

import { AUTH_BASE_URL } from "lib/config/env.config";
import { dbPool } from "lib/db/db";
import { userTable } from "lib/db/schema";

import type { OrganizationClaim } from "@omnidotdev/providers";
import type { JWTPayload } from "jose";
import type { InsertUser, SelectUser } from "lib/db/schema";

/**
 * Database surface required to upsert a user.
 * Kept minimal so callers (and tests) can inject a stub.
 */
type UserUpsertDb = Pick<typeof dbPool, "insert">;

interface UserInfoClaims extends JWTPayload {
  sub: string;
  preferred_username?: string;
  email?: string;
  [key: string]: unknown;
}

class AuthenticationError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "AuthenticationError";
    this.code = code;
  }
}

/** Result of resolving an access token to an Arbor user */
export interface ResolvedUser {
  user: SelectUser;
  organizations: OrganizationClaim[];
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: ms("2m"),
    },
  },
});

/**
 * Remote JWKS for verifying JWT signatures from Gatekeeper.
 * jose's createRemoteJWKSet handles caching and key rotation automatically.
 * Lazily initialized to avoid errors during build scripts when AUTH_BASE_URL is not set.
 * @see https://www.better-auth.com/docs/plugins/jwt
 */
let JWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

const getJWKS = () => {
  if (!JWKS) {
    if (!AUTH_BASE_URL) {
      throw new AuthenticationError(
        "AUTH_BASE_URL is not configured",
        "AUTH_CONFIG_MISSING",
      );
    }
    JWKS = createRemoteJWKSet(
      new URL(`${AUTH_BASE_URL}/.well-known/jwks.json`),
    );
  }
  return JWKS;
};

/**
 * Verify JWT signature using Gatekeeper's JWKS endpoint.
 * Returns the verified payload or throws an error.
 */
const verifyAccessToken = async (token: string): Promise<UserInfoClaims> => {
  const { payload } = await jwtVerify(token, getJWKS(), {
    issuer: AUTH_BASE_URL,
  });

  if (!payload.sub) {
    throw new AuthenticationError(
      "Missing required 'sub' claim",
      "MISSING_SUB_CLAIM",
    );
  }

  return payload as UserInfoClaims;
};

/**
 * Validate token claims.
 */
const validateClaims = (claims: UserInfoClaims): void => {
  const now = Math.floor(Date.now() / 1000);

  // validate `exp`
  if (claims.exp !== undefined && claims.exp < now)
    throw new AuthenticationError("Token has expired", "TOKEN_EXPIRED");

  // validate `iat` (reject tokens issued in the future with clock skew allowance)
  if (claims.iat !== undefined && claims.iat > now + ms("1m"))
    throw new AuthenticationError(
      "Token issued in the future",
      "INVALID_TOKEN_IAT",
    );

  // validate issuer
  if (AUTH_BASE_URL && claims.iss !== undefined && claims.iss !== AUTH_BASE_URL)
    throw new AuthenticationError(
      "Token issuer mismatch",
      "INVALID_TOKEN_ISSUER",
    );
};

/**
 * Fetch and validate user claims from the IDP userinfo endpoint.
 * This is the authoritative validation of an opaque or JWT access token.
 */
const fetchUserInfoClaims = async (
  accessToken: string,
): Promise<UserInfoClaims | null> => {
  // Better Auth OIDC access tokens are opaque tokens, not JWTs.
  // Validation is done via the userinfo endpoint which verifies the token server-side.
  // If the access token looks like a JWT (3 dot-separated parts), we can optionally
  // verify it for additional security, but this is not required.
  const isJwtFormat = accessToken.split(".").length === 3;
  if (isJwtFormat) {
    try {
      const verifiedPayload = await verifyAccessToken(accessToken);
      validateClaims(verifiedPayload);
    } catch (jwtError) {
      // JWT verification failed - this is expected for opaque tokens
      // Continue with userinfo validation which will definitively validate the token
      console.warn(
        "[Auth] JWT verification skipped (opaque token):",
        jwtError instanceof Error ? jwtError.message : jwtError,
      );
    }
  }

  // Fetch user claims from userinfo endpoint - this validates the access token
  // and provides the authoritative user identity claims
  const claims = await queryClient.ensureQueryData({
    queryKey: ["UserInfo", { accessToken }],
    queryFn: async () => {
      const response = await fetch(`${AUTH_BASE_URL}/oauth2/userinfo`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new AuthenticationError(
          "Invalid access token or request failed",
          "USERINFO_FAILED",
        );
      }

      const userInfoClaims: UserInfoClaims = await response.json();

      return userInfoClaims;
    },
  });

  return claims ?? null;
};

/**
 * Resolve an Arbor user (and their organization claims) from a raw access token.
 *
 * Framework-agnostic core shared by the GraphQL authentication plugin and the
 * Smart-HTTP git access layer. Validates the token via Gatekeeper's userinfo
 * endpoint (and optional JWKS signature verification for JWT-format tokens),
 * then upserts the resulting identity into the `user` table.
 *
 * @param accessToken - Raw bearer access token (no scheme prefix)
 * @param db - Database surface used for the user upsert (defaults to the pool)
 * @returns The resolved user with org claims, or null when invalid/absent
 */
export const resolveUserFromToken = async (
  accessToken: string | null | undefined,
  db: UserUpsertDb = dbPool,
): Promise<ResolvedUser | null> => {
  try {
    if (!accessToken) return null;

    const claims = await fetchUserInfoClaims(accessToken);

    if (!claims) {
      throw new AuthenticationError(
        "Invalid access token or request failed",
        "INVALID_CLAIMS",
      );
    }

    if (!claims.email)
      throw new AuthenticationError(
        "Missing required 'email' claim",
        "MISSING_EMAIL_CLAIM",
      );

    const organizations = extractOrgClaims(claims);

    const insertedUser: InsertUser = {
      identityProviderId: claims.sub,
      name: claims.preferred_username ?? claims.email,
      username: claims.preferred_username ?? claims.email,
      email: claims.email,
    };

    const { identityProviderId, ...rest } = insertedUser;

    const [user] = await db
      .insert(userTable)
      .values(insertedUser)
      .onConflictDoUpdate({
        target: userTable.identityProviderId,
        set: {
          ...rest,
          updatedAt: new Date().toISOString(),
        },
      })
      .returning();

    if (!user) return null;

    return { user, organizations };
  } catch (err) {
    if (err instanceof AuthenticationError) {
      console.error(`[Auth] ${err.code}: ${err.message}`);
    } else {
      console.error("[Auth] Unexpected error:", err);
    }

    return null;
  }
};
