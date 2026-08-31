import { afterEach, describe, expect, mock, test } from "bun:test";
import { createHmac } from "node:crypto";

// Captured before any mock.module call below (so it is always the real,
// unmocked module): every scenario spreads this and overrides only
// BILLING_WEBHOOK_SECRET, so a fresh cache-busted import of ./webhooks (or any
// other consumer of lib/config/env.config resolved after these tests run)
// still finds every other real export rather than a SyntaxError for a name
// missing from a partial mock
import * as realEnvConfig from "lib/config/env.config";

/**
 * Entitlements webhook tests: the fail-closed signature-verification gate.
 *
 * These events drive the entitlement cache Aether's billing decisions read
 * from, so an unverifiable request must never be treated as consumed.
 *
 * Each scenario re-mocks lib/config/env.config immediately before a
 * cache-busted re-import of ./webhooks. Bun's module registry is process-wide:
 * once a module is evaluated, its top-level `import { BILLING_WEBHOOK_SECRET }`
 * binding is frozen for the rest of the process, so a second import of the
 * same specifier (even after reassigning process.env or re-mocking the config
 * module) would keep observing the first-evaluated value. The `?case=` query
 * suffix forces Bun to evaluate a genuinely fresh module instance per
 * scenario, so each one observes the mock.module value set just before it.
 */

const SECRET = "test-billing-secret";
const sign = (body: string) =>
  createHmac("sha256", SECRET).update(body).digest("hex");

const invalidateCalls: string[] = [];
mock.module("lib/entitlements", () => ({
  invalidateCache: (pattern: string) => {
    invalidateCalls.push(pattern);
  },
}));

const changedEvent = {
  eventType: "entitlement.updated",
  entityType: "organization",
  entityId: "org_1",
  productId: "arbor",
  version: 1,
  timestamp: new Date().toISOString(),
};

const request = (body: unknown, signature?: string) =>
  new Request("http://localhost/entitlements", {
    method: "POST",
    headers: {
      ...(signature !== undefined ? { "x-billing-signature": signature } : {}),
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

afterEach(() => {
  invalidateCalls.length = 0;
});

/**
 * Cache-busting re-import of ./webhooks. Interpolating into the template
 * literal (rather than a plain string) keeps the specifier non-literal, so
 * tsc does not attempt to statically resolve a module path that only Bun's
 * runtime import understands (mirrors lib/entitlements/index.test.ts).
 */
const importWebhooks = (scenario: string) =>
  import(`./webhooks?case=${scenario}`);

describe("entitlements webhook", () => {
  test("rejects with 503 and does not invalidate the cache when the secret is not configured", async () => {
    mock.module("lib/config/env.config", () => ({
      ...realEnvConfig,
      BILLING_WEBHOOK_SECRET: undefined,
    }));
    const { default: entitlementsWebhook } =
      await importWebhooks("unconfigured");

    // A well-formed signature header is present; without a configured secret
    // it still cannot be verified and must be rejected
    const res = await entitlementsWebhook.handle(
      request(changedEvent, "a".repeat(64)),
    );

    expect(res.status).toBe(503);
    expect(invalidateCalls).toHaveLength(0);
  });

  test("rejects a missing signature with 401 when configured", async () => {
    mock.module("lib/config/env.config", () => ({
      ...realEnvConfig,
      BILLING_WEBHOOK_SECRET: SECRET,
    }));
    const { default: entitlementsWebhook } =
      await importWebhooks("missing-signature");

    const res = await entitlementsWebhook.handle(
      request(changedEvent, undefined),
    );

    expect(res.status).toBe(401);
    expect(invalidateCalls).toHaveLength(0);
  });

  test("rejects a wrong signature with 401 and does not invalidate the cache when configured", async () => {
    mock.module("lib/config/env.config", () => ({
      ...realEnvConfig,
      BILLING_WEBHOOK_SECRET: SECRET,
    }));
    const { default: entitlementsWebhook } =
      await importWebhooks("wrong-signature");

    const res = await entitlementsWebhook.handle(
      request(changedEvent, "0".repeat(64)),
    );

    expect(res.status).toBe(401);
    expect(invalidateCalls).toHaveLength(0);
  });

  test("accepts a validly-signed entitlement.updated event (200)", async () => {
    mock.module("lib/config/env.config", () => ({
      ...realEnvConfig,
      BILLING_WEBHOOK_SECRET: SECRET,
    }));
    const { default: entitlementsWebhook } = await importWebhooks("valid");

    const body = JSON.stringify(changedEvent);
    const res = await entitlementsWebhook.handle(
      new Request("http://localhost/entitlements", {
        method: "POST",
        headers: {
          "x-billing-signature": sign(body),
          "content-type": "application/json",
        },
        body,
      }),
    );

    expect(res.status).toBe(200);
    expect(invalidateCalls.length).toBeGreaterThan(0);
  });
});
