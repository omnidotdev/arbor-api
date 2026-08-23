import { describe, expect, it } from "bun:test";

import { isWhitelisted } from "./whitelist";

/**
 * Pure whitelist resolution for the closed-beta gate.
 *
 * The DB status lookup and the billing-bypass merge happen at the call site;
 * this helper is intentionally db-free so the decision itself is unit-testable.
 */
describe("isWhitelisted", () => {
  it("allows everyone when the gate is disabled", () => {
    expect(
      isWhitelisted({
        gateEnabled: false,
        userId: "u1",
        envIds: [],
        applicationStatus: null,
      }),
    ).toBe(true);
  });

  it("allows an env-whitelisted user id", () => {
    expect(
      isWhitelisted({
        gateEnabled: true,
        userId: "u1",
        envIds: ["u1"],
        applicationStatus: null,
      }),
    ).toBe(true);
  });

  it("allows a user with an approved application", () => {
    expect(
      isWhitelisted({
        gateEnabled: true,
        userId: "u1",
        envIds: [],
        applicationStatus: "approved",
      }),
    ).toBe(true);
  });

  it("denies pending / declined / no application", () => {
    for (const s of ["pending", "declined", null] as const) {
      expect(
        isWhitelisted({
          gateEnabled: true,
          userId: "u1",
          envIds: [],
          applicationStatus: s,
        }),
      ).toBe(false);
    }
  });

  it("denies an anonymous caller when gated", () => {
    expect(
      isWhitelisted({
        gateEnabled: true,
        userId: null,
        envIds: ["u1"],
        applicationStatus: null,
      }),
    ).toBe(false);
  });
});
