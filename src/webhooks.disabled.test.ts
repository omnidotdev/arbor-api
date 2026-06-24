import { describe, expect, mock, test } from "bun:test";

/**
 * Stripe webhook tests for the DISABLED (no API key) state.
 *
 * When STRIPE_API_KEY is unset the payments client is null. The webhook must
 * degrade gracefully (non-2xx, no crash) instead of dereferencing null.
 */

// Simulate the disabled integration: the payments client default is null
mock.module("lib/payments", () => ({
  default: null,
  isPaymentsEnabled: false,
}));

// Drizzle is not exercised on this path, but importing webhooks pulls it in
mock.module("lib/db/db", () => ({
  dbPool: {
    update: () => ({ set: () => ({ where: () => Promise.resolve([]) }) }),
  },
}));

// Treat the signing secret as configured so we reach the null-client guard
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

const { default: webhooks } = await import("./webhooks");

describe("stripe webhook (Stripe disabled)", () => {
  test("returns a non-2xx (no crash) when the payments client is null", async () => {
    const res = await webhooks.handle(
      new Request("http://localhost/webhooks/stripe", {
        method: "POST",
        headers: {
          "stripe-signature": "sig_test",
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      }),
    );

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBe(503);
  });
});
