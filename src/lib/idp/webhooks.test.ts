import { afterEach, describe, expect, mock, test } from "bun:test";
import { createHmac } from "node:crypto";

// Captured before any mock.module call below (so it is always the real,
// unmocked module): every scenario spreads this and overrides only
// IDP_WEBHOOK_SECRET, so a fresh cache-busted import of ./webhooks (or any
// other consumer of lib/config/env.config resolved after these tests run)
// still finds every other real export rather than a SyntaxError for a name
// missing from a partial mock
import * as realEnvConfig from "lib/config/env.config";

/**
 * IDP webhook tests: the fail-closed signature-verification gate.
 *
 * handleOrganizationDeleted/handleUserDeleted reach destructive/authz-affecting
 * writes (a soft-delete and a hard DELETE), so an unverifiable request must
 * never be treated as consumed.
 *
 * Each scenario re-mocks lib/config/env.config immediately before a
 * cache-busted re-import of ./webhooks. Bun's module registry is process-wide:
 * once a module is evaluated, its top-level `import { IDP_WEBHOOK_SECRET }`
 * binding is frozen for the rest of the process, so a second import of the
 * same specifier (even after reassigning process.env or re-mocking the config
 * module) would keep observing the first-evaluated value. The `?case=` query
 * suffix forces Bun to evaluate a genuinely fresh module instance per
 * scenario, so each one observes the mock.module value set just before it.
 */

const SECRET = "test-idp-secret";
const sign = (body: string) =>
  createHmac("sha256", SECRET).update(body).digest("hex");

// Chainable Drizzle query builder stub, recording every mutating call so a
// rejected request can be asserted to have touched nothing
const dbCalls: { update: unknown[]; delete: unknown[] } = {
  update: [],
  delete: [],
};

mock.module("lib/db/db", () => ({
  dbPool: {
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: () => ({
          returning: () => {
            dbCalls.update.push({ table, values });
            return Promise.resolve([{ id: "org_1" }]);
          },
        }),
      }),
    }),
    delete: (table: unknown) => ({
      where: () => ({
        returning: () => {
          dbCalls.delete.push({ table });
          return Promise.resolve([{ id: "user_1" }]);
        },
      }),
    }),
  },
}));

const deletedOrgEvent = {
  eventType: "organization.deleted",
  organizationId: "org_1",
  deletedAt: new Date().toISOString(),
  timestamp: new Date().toISOString(),
};

const request = (body: unknown, signature?: string) =>
  new Request("http://localhost/idp", {
    method: "POST",
    headers: {
      ...(signature !== undefined ? { "x-idp-signature": signature } : {}),
      "x-idp-event": "organization.deleted",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

afterEach(() => {
  dbCalls.update = [];
  dbCalls.delete = [];
});

/**
 * Cache-busting re-import of ./webhooks. Interpolating into the template
 * literal (rather than a plain string) keeps the specifier non-literal, so
 * tsc does not attempt to statically resolve a module path that only Bun's
 * runtime import understands (mirrors lib/entitlements/index.test.ts).
 */
const importWebhooks = (scenario: string) =>
  import(`./webhooks?case=${scenario}`);

describe("idp webhook", () => {
  test("rejects with 503 and does not mutate state when the secret is not configured", async () => {
    mock.module("lib/config/env.config", () => ({
      ...realEnvConfig,
      IDP_WEBHOOK_SECRET: undefined,
    }));
    const { default: idpWebhook } = await importWebhooks("unconfigured");

    // A well-formed signature header is present; without a configured secret
    // it still cannot be verified and must be rejected
    const res = await idpWebhook.handle(
      request(deletedOrgEvent, "a".repeat(64)),
    );

    expect(res.status).toBe(503);
    expect(dbCalls.update).toHaveLength(0);
    expect(dbCalls.delete).toHaveLength(0);
  });

  test("rejects a missing signature with 401 when configured", async () => {
    mock.module("lib/config/env.config", () => ({
      ...realEnvConfig,
      IDP_WEBHOOK_SECRET: SECRET,
    }));
    const { default: idpWebhook } = await importWebhooks("missing-signature");

    const res = await idpWebhook.handle(request(deletedOrgEvent, undefined));

    expect(res.status).toBe(401);
    expect(dbCalls.update).toHaveLength(0);
  });

  test("rejects a wrong signature with 401 and does not mutate state when configured", async () => {
    mock.module("lib/config/env.config", () => ({
      ...realEnvConfig,
      IDP_WEBHOOK_SECRET: SECRET,
    }));
    const { default: idpWebhook } = await importWebhooks("wrong-signature");

    const res = await idpWebhook.handle(
      request(deletedOrgEvent, "0".repeat(64)),
    );

    expect(res.status).toBe(401);
    expect(dbCalls.update).toHaveLength(0);
  });

  test("accepts a validly-signed organization.deleted event (200)", async () => {
    mock.module("lib/config/env.config", () => ({
      ...realEnvConfig,
      IDP_WEBHOOK_SECRET: SECRET,
    }));
    const { default: idpWebhook } = await importWebhooks("valid");

    const body = JSON.stringify(deletedOrgEvent);
    const res = await idpWebhook.handle(
      new Request("http://localhost/idp", {
        method: "POST",
        headers: {
          "x-idp-signature": sign(body),
          "x-idp-event": "organization.deleted",
          "content-type": "application/json",
        },
        body,
      }),
    );

    expect(res.status).toBe(200);
    expect(dbCalls.update).toHaveLength(1);
  });
});
