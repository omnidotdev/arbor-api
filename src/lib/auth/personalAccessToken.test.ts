import { describe, expect, test } from "bun:test";

import {
  PAT_PREFIX,
  createPersonalAccessTokenRecord,
  generatePersonalAccessToken,
  hashPersonalAccessToken,
  isPersonalAccessToken,
  resolveUserFromPat,
} from "./personalAccessToken";

import type { SelectUser } from "lib/db/schema";

/** Build a minimal user row for tests */
const makeUser = (overrides: Partial<SelectUser> = {}): SelectUser =>
  ({
    id: "user-1",
    identityProviderId: "idp-1",
    name: "Test User",
    username: "test",
    avatarUrl: null,
    email: "test@example.com",
    bio: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }) as SelectUser;

/** ISO string offset from now by the given milliseconds */
const isoOffset = (ms: number) => new Date(Date.now() + ms).toISOString();

/**
 * Stub db for resolveUserFromPat. `findFirst` returns the given row; `update`
 * returns a thenable chain whose terminal call resolves (and records that the
 * lastUsedAt write was attempted).
 */
const makeResolveDb = (
  row: unknown,
  onUpdate?: () => void,
): Parameters<typeof resolveUserFromPat>[1] =>
  ({
    query: {
      personalAccessTokenTable: {
        findFirst: async (_args: unknown) => row,
      },
    },
    update: () => ({
      set: () => ({
        where: () => {
          onUpdate?.();
          return Promise.resolve();
        },
      }),
    }),
  }) as unknown as Parameters<typeof resolveUserFromPat>[1];

describe("token generation and hashing", () => {
  test("generates a token with the arbor_pat_ prefix", () => {
    const { token } = generatePersonalAccessToken();
    expect(token.startsWith(PAT_PREFIX)).toBe(true);
    expect(isPersonalAccessToken(token)).toBe(true);
  });

  test("hash is the sha256 hex of the plaintext and never the plaintext", () => {
    const { token, tokenHash } = generatePersonalAccessToken();
    expect(tokenHash).toBe(hashPersonalAccessToken(token));
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash).not.toContain(token);
  });

  test("tokenPrefix is a short non-secret slice of the token", () => {
    const { token, tokenPrefix } = generatePersonalAccessToken();
    expect(token.startsWith(tokenPrefix)).toBe(true);
    expect(tokenPrefix.length).toBeLessThan(token.length);
  });

  test("tokens are high-entropy and unique per call", () => {
    const a = generatePersonalAccessToken();
    const b = generatePersonalAccessToken();
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).not.toBe(b.tokenHash);
  });

  test("isPersonalAccessToken rejects non-PAT credentials", () => {
    expect(isPersonalAccessToken("eyJhbGciOi.jwt.token")).toBe(false);
    expect(isPersonalAccessToken("")).toBe(false);
  });
});

describe("resolveUserFromPat", () => {
  test("resolves the owning user for a valid, non-expired token", async () => {
    const user = makeUser();
    let updated = false;
    const db = makeResolveDb(
      { id: "pat-1", userId: user.id, expiresAt: null, user },
      () => {
        updated = true;
      },
    );

    const resolved = await resolveUserFromPat(`${PAT_PREFIX}valid`, db);

    expect(resolved?.user.id).toBe(user.id);
    // PATs carry no IDP org claims
    expect(resolved?.organizations).toEqual([]);
    // lastUsedAt best-effort write attempted
    expect(updated).toBe(true);
  });

  test("returns null for an unknown token", async () => {
    const db = makeResolveDb(undefined);
    const resolved = await resolveUserFromPat(`${PAT_PREFIX}unknown`, db);
    expect(resolved).toBeNull();
  });

  test("returns null for an expired token", async () => {
    const user = makeUser();
    const db = makeResolveDb({
      id: "pat-1",
      userId: user.id,
      expiresAt: isoOffset(-1000),
      user,
    });
    const resolved = await resolveUserFromPat(`${PAT_PREFIX}expired`, db);
    expect(resolved).toBeNull();
  });

  test("resolves a token whose expiry is in the future", async () => {
    const user = makeUser();
    const db = makeResolveDb({
      id: "pat-1",
      userId: user.id,
      expiresAt: isoOffset(60_000),
      user,
    });
    const resolved = await resolveUserFromPat(`${PAT_PREFIX}future`, db);
    expect(resolved?.user.id).toBe(user.id);
  });

  test("returns null for a credential that is not a PAT (no lookup)", async () => {
    let lookedUp = false;
    const db = {
      query: {
        personalAccessTokenTable: {
          findFirst: async () => {
            lookedUp = true;
            return undefined;
          },
        },
      },
      update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
    } as unknown as Parameters<typeof resolveUserFromPat>[1];

    const resolved = await resolveUserFromPat("not-a-pat", db);
    expect(resolved).toBeNull();
    expect(lookedUp).toBe(false);
  });
});

describe("createPersonalAccessTokenRecord", () => {
  /** Stub db whose insert captures the values it was given */
  const makeInsertDb = (captured: { values?: Record<string, unknown> }) =>
    ({
      insert: () => ({
        values: (values: Record<string, unknown>) => {
          captured.values = values;
          return {
            returning: async () => [
              {
                id: "pat-1",
                name: values.name,
                tokenPrefix: values.tokenPrefix,
                expiresAt: values.expiresAt,
                createdAt: new Date().toISOString(),
              },
            ],
          };
        },
      }),
    }) as unknown as Parameters<
      typeof createPersonalAccessTokenRecord
    >[0]["db"];

  test("pins userId to the authenticated observer and returns the plaintext once", async () => {
    const captured: { values?: Record<string, unknown> } = {};
    const db = makeInsertDb(captured);

    const payload = await createPersonalAccessTokenRecord({
      observer: { id: "observer-1" },
      name: "ci token",
      db,
    });

    // Ownership pinned server-side to the observer
    expect(captured.values?.userId).toBe("observer-1");
    // Only the hash is persisted, never the plaintext
    expect(captured.values?.tokenHash).toBe(
      hashPersonalAccessToken(payload.token),
    );
    expect(captured.values).not.toHaveProperty("token");
    // Plaintext returned once
    expect(payload.token.startsWith(PAT_PREFIX)).toBe(true);
    expect(payload.rowId).toBe("pat-1");
  });

  test("rejects an unauthenticated caller", async () => {
    const db = makeInsertDb({});
    await expect(
      createPersonalAccessTokenRecord({
        observer: null,
        name: "nope",
        db,
      }),
    ).rejects.toThrow("Unauthorized");
  });

  test("computes an absolute expiresAt from expiresInDays", async () => {
    const captured: { values?: Record<string, unknown> } = {};
    const db = makeInsertDb(captured);

    await createPersonalAccessTokenRecord({
      observer: { id: "observer-1" },
      name: "expiring",
      expiresInDays: 30,
      db,
    });

    const expiresAt = new Date(captured.values?.expiresAt as string).getTime();
    const expected = Date.now() + 30 * 86_400_000;
    // within a minute of the expected instant
    expect(Math.abs(expiresAt - expected)).toBeLessThan(60_000);
  });

  test("leaves expiresAt null when no lifetime is given", async () => {
    const captured: { values?: Record<string, unknown> } = {};
    const db = makeInsertDb(captured);

    await createPersonalAccessTokenRecord({
      observer: { id: "observer-1" },
      name: "forever",
      db,
    });

    expect(captured.values?.expiresAt).toBeNull();
  });
});
