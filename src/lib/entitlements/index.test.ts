import { beforeEach, describe, expect, mock, test } from "bun:test";

import type { EntitlementsResponse } from "@omnidotdev/providers/billing";

/**
 * Graph-capability entitlement tests.
 *
 * Focus: `requireGraphLevel` is the gate every graph plugin (blast radius, and
 * any future org-wide polyrepo surface) calls. It must throw a client-visible
 * GraphQLError with a stable `GRAPH_TIER_REQUIRED` code when an organization is
 * below the required graph_level, pass at or above it, honour bypass orgs, and
 * fall back to the free tier when Aether is unavailable (self-hosted) or the
 * repository is personal (no organization to bill).
 *
 * `lib/providers` is stubbed so the billing provider returns a controllable
 * entitlements response. The entitlements module is imported with a query suffix
 * so it resolves the REAL module even though another test file registers a
 * global `mock.module("lib/entitlements", ...)` (Bun module mocks are global and
 * persist across files in a single run).
 */

let entitlementsResponse: EntitlementsResponse | null = null;

mock.module("lib/providers", () => ({
  default: { emit: async () => {} },
  billing: {
    getEntitlements: async () => entitlementsResponse,
  },
}));

const importEntitlements = () =>
  import(`./index?real=${Math.random().toString(36).slice(2)}`);

/** Build an entitlements response carrying a plan tier. */
const withTier = (tier: string): EntitlementsResponse =>
  ({ entitlements: [{ featureKey: "tier", value: tier }] }) as never;

/** Build an entitlements response carrying an explicit graph_level. */
const withGraphLevel = (level: number): EntitlementsResponse =>
  ({
    entitlements: [{ featureKey: "graph_level", value: String(level) }],
  }) as never;

beforeEach(() => {
  // Default: no billing account / Aether unavailable -> free tier
  entitlementsResponse = null;
});

describe("getOrganizationGraphLevel", () => {
  test("maps the pro tier to the org-wide graph level (1)", async () => {
    const { getOrganizationGraphLevel } = await importEntitlements();
    entitlementsResponse = withTier("pro");
    expect(await getOrganizationGraphLevel("org-1")).toBe(1);
  });

  test("maps the team tier to the blast-radius level (2)", async () => {
    const { getOrganizationGraphLevel } = await importEntitlements();
    entitlementsResponse = withTier("team");
    expect(await getOrganizationGraphLevel("org-1")).toBe(2);
  });

  test("prefers an explicit graph_level entitlement over the tier map", async () => {
    const { getOrganizationGraphLevel } = await importEntitlements();
    entitlementsResponse = withGraphLevel(2);
    expect(await getOrganizationGraphLevel("org-1")).toBe(2);
  });

  test("falls back to the free level (0) when Aether is unavailable", async () => {
    const { getOrganizationGraphLevel } = await importEntitlements();
    entitlementsResponse = null;
    expect(await getOrganizationGraphLevel("org-1")).toBe(0);
  });

  test("grants the highest level to a bypass organization", async () => {
    const { getOrganizationGraphLevel } = await importEntitlements();
    entitlementsResponse = null;
    expect(await getOrganizationGraphLevel("org-omni", ["org-omni"])).toBe(2);
  });
});

describe("requireGraphLevel", () => {
  test("throws GRAPH_TIER_REQUIRED with a Pro message below the org level (1)", async () => {
    const { requireGraphLevel } = await importEntitlements();
    entitlementsResponse = null; // free tier, level 0

    await expect(requireGraphLevel("org-1", 1)).rejects.toThrow(
      "This feature is available on the Pro plan",
    );

    try {
      await requireGraphLevel("org-1", 1);
      throw new Error("expected requireGraphLevel to throw");
    } catch (error: any) {
      expect(error.extensions?.code).toBe("GRAPH_TIER_REQUIRED");
      expect(error.extensions?.requiredLevel).toBe(1);
    }
  });

  test("throws a Team message below the blast-radius level (2)", async () => {
    const { requireGraphLevel } = await importEntitlements();
    entitlementsResponse = null; // free tier, level 0

    try {
      await requireGraphLevel("org-1", 2);
      throw new Error("expected requireGraphLevel to throw");
    } catch (error: any) {
      expect(error.message).toBe("This feature is available on the Team plan");
      expect(error.extensions?.code).toBe("GRAPH_TIER_REQUIRED");
      expect(error.extensions?.requiredLevel).toBe(2);
    }
  });

  test("passes when the org is at the required level", async () => {
    const { requireGraphLevel } = await importEntitlements();
    entitlementsResponse = withGraphLevel(2);
    await expect(requireGraphLevel("org-1", 2)).resolves.toBeUndefined();
  });

  test("passes when the org is above the required level", async () => {
    const { requireGraphLevel } = await importEntitlements();
    entitlementsResponse = withGraphLevel(2);
    await expect(requireGraphLevel("org-1", 1)).resolves.toBeUndefined();
  });

  test("passes for a bypass organization regardless of tier", async () => {
    const { requireGraphLevel } = await importEntitlements();
    entitlementsResponse = null; // free tier, but bypassed
    await expect(
      requireGraphLevel("org-omni", 2, ["org-omni"]),
    ).resolves.toBeUndefined();
  });

  test("denies a paid capability on a personal repository (null organization)", async () => {
    const { requireGraphLevel } = await importEntitlements();
    // A personal repo has no organization to bill -> free tier -> denied
    await expect(requireGraphLevel(null, 2)).rejects.toThrow(
      "This feature is available on the Team plan",
    );
  });

  test("allows the free per-repo graph (level 0) on a personal repository", async () => {
    const { requireGraphLevel } = await importEntitlements();
    await expect(requireGraphLevel(null, 0)).resolves.toBeUndefined();
  });

  test("denies blast radius when Aether is unavailable (self-hosted, free)", async () => {
    const { requireGraphLevel } = await importEntitlements();
    entitlementsResponse = null;
    try {
      await requireGraphLevel("org-1", 2);
      throw new Error("expected requireGraphLevel to throw");
    } catch (error: any) {
      expect(error.extensions?.code).toBe("GRAPH_TIER_REQUIRED");
    }
  });
});
