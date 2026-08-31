import { describe, expect, test } from "bun:test";

import { resolveBetaAllowed } from "./resolveBetaAllowed";

/**
 * Fake db exposing only the tester-application lookup resolveBetaAllowed needs,
 * returning the configured status (or no row) regardless of the where clause.
 */
const fakeDb = (status: string | undefined) =>
  ({
    query: {
      testerApplicationTable: {
        findFirst: async () => (status ? { status } : undefined),
      },
    },
  }) as never;

/**
 * A db whose lookup throws, so a test proves the resolution short-circuited on a
 * cheap in-memory check and never hit the database.
 */
const throwingDb = {
  query: {
    testerApplicationTable: {
      findFirst: async () => {
        throw new Error("db must not be queried");
      },
    },
  },
} as never;

describe("resolveBetaAllowed", () => {
  test("allows an observer with an approved application", async () => {
    expect(
      await resolveBetaAllowed({
        observer: { id: "u1" },
        organizations: [],
        db: fakeDb("approved"),
      }),
    ).toBe(true);
  });

  test("denies an observer with a pending application", async () => {
    expect(
      await resolveBetaAllowed({
        observer: { id: "u1" },
        organizations: [],
        db: fakeDb("pending"),
      }),
    ).toBe(false);
  });

  test("denies an anonymous caller", async () => {
    expect(
      await resolveBetaAllowed({
        observer: null,
        organizations: [],
        db: fakeDb(undefined),
      }),
    ).toBe(false);
  });

  test("allows an env-whitelisted user id", async () => {
    expect(
      await resolveBetaAllowed(
        { observer: { id: "u1" }, organizations: [], db: fakeDb(undefined) },
        { envIds: ["u1"] },
      ),
    ).toBe(true);
  });

  test("allows an env-whitelisted user without a DB lookup", async () => {
    // throwingDb rejects if queried, so passing proves the in-memory check
    // short-circuited before getApplicationStatus
    expect(
      await resolveBetaAllowed(
        { observer: { id: "u1" }, organizations: [], db: throwingDb },
        { envIds: ["u1"] },
      ),
    ).toBe(true);
  });

  test("allows a bypass-org member without a DB lookup", async () => {
    expect(
      await resolveBetaAllowed(
        {
          observer: { id: "u1" },
          organizations: [{ id: "org1" }],
          db: throwingDb,
        },
        { bypassOrgIds: ["org1"] },
      ),
    ).toBe(true);
  });

  test("allows a member of a billing-bypass org", async () => {
    expect(
      await resolveBetaAllowed(
        {
          observer: { id: "u1" },
          organizations: [{ id: "org1" }],
          db: fakeDb(undefined),
        },
        { bypassOrgIds: ["org1"] },
      ),
    ).toBe(true);
  });

  test("allows a staff-domain email without an approved application", async () => {
    // throwingDb rejects if queried, so passing proves the staff fast-path
    // short-circuited before getApplicationStatus even with no approved row
    expect(
      await resolveBetaAllowed(
        {
          observer: { id: "u1", email: "person@omni.dev" },
          organizations: [],
          db: throwingDb,
        },
        { isStaff: (email) => email === "person@omni.dev" },
      ),
    ).toBe(true);
  });

  test("denies a member of an unrelated org", async () => {
    expect(
      await resolveBetaAllowed(
        {
          observer: { id: "u1" },
          organizations: [{ id: "org2" }],
          db: fakeDb(undefined),
        },
        { bypassOrgIds: ["org1"] },
      ),
    ).toBe(false);
  });
});
