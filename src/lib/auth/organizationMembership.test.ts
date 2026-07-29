import { describe, expect, test } from "bun:test";

import {
  MEMBERSHIP_TTL_MS,
  SYNC_THROTTLE_MS,
  isMembershipFresh,
  shouldSync,
  toOrganizationClaims,
} from "./organizationMembership";

describe("isMembershipFresh", () => {
  const now = Date.parse("2026-07-29T12:00:00.000Z");

  test("membership synced just now is fresh", () => {
    expect(isMembershipFresh(new Date(now).toISOString(), now)).toBe(true);
  });

  test("membership synced within the window is fresh", () => {
    const synced = new Date(now - MEMBERSHIP_TTL_MS + 60_000).toISOString();
    expect(isMembershipFresh(synced, now)).toBe(true);
  });

  test("membership older than the window is stale", () => {
    // a user removed from an org keeps cached access only until this expires
    const synced = new Date(now - MEMBERSHIP_TTL_MS - 1).toISOString();
    expect(isMembershipFresh(synced, now)).toBe(false);
  });

  test("a missing sync timestamp is treated as stale", () => {
    expect(isMembershipFresh(null, now)).toBe(false);
  });

  test("an unparseable timestamp is treated as stale", () => {
    expect(isMembershipFresh("not-a-date", now)).toBe(false);
  });
});

describe("toOrganizationClaims", () => {
  const now = Date.parse("2026-07-29T12:00:00.000Z");
  const fresh = new Date(now).toISOString();
  const stale = new Date(now - MEMBERSHIP_TTL_MS - 1).toISOString();

  test("maps a membership row to the claim shape consumers expect", () => {
    const claims = toOrganizationClaims(
      [
        {
          roles: ["admin"],
          syncedAt: fresh,
          organization: {
            idpOrganizationId: "idp-org-1",
            name: "Omni",
            slug: "omni",
          },
        },
      ],
      now,
    );

    expect(claims).toHaveLength(1);
    // `id` is the IDP organization id, which is what access checks compare on
    expect(claims[0]?.id).toBe("idp-org-1");
    expect(claims[0]?.roles).toEqual(["admin"]);
    expect(claims[0]?.slug).toBe("omni");
  });

  test("drops stale memberships so removed access expires", () => {
    const claims = toOrganizationClaims(
      [
        {
          roles: ["member"],
          syncedAt: stale,
          organization: {
            idpOrganizationId: "idp-org-1",
            name: "Omni",
            slug: "omni",
          },
        },
      ],
      now,
    );

    expect(claims).toEqual([]);
  });

  test("drops rows whose organization is missing", () => {
    const claims = toOrganizationClaims(
      [{ roles: ["member"], syncedAt: fresh, organization: null }],
      now,
    );

    expect(claims).toEqual([]);
  });

  test("defaults absent roles to an empty list rather than throwing", () => {
    const claims = toOrganizationClaims(
      [
        {
          roles: null,
          syncedAt: fresh,
          organization: {
            idpOrganizationId: "idp-org-1",
            name: null,
            slug: null,
          },
        },
      ],
      now,
    );

    expect(claims[0]?.roles).toEqual([]);
    expect(claims[0]?.name).toBe("");
  });
});

describe("shouldSync", () => {
  const now = Date.parse("2026-07-29T12:00:00.000Z");

  test("syncs when the user has not been seen", () => {
    expect(shouldSync(new Map(), "user-1", now)).toBe(true);
  });

  test("does not resync within the throttle window", () => {
    const seen = new Map([["user-1", now - 1000]]);
    expect(shouldSync(seen, "user-1", now)).toBe(false);
  });

  test("resyncs once the throttle window has passed", () => {
    const seen = new Map([["user-1", now - SYNC_THROTTLE_MS - 1]]);
    expect(shouldSync(seen, "user-1", now)).toBe(true);
  });

  test("throttles per user, not globally", () => {
    const seen = new Map([["user-1", now]]);
    expect(shouldSync(seen, "user-2", now)).toBe(true);
  });
});
