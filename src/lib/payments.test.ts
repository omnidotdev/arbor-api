import { describe, expect, test } from "bun:test";

/**
 * Payments (Stripe) client tests.
 *
 * Focus: the module must import and initialize WITHOUT throwing when
 * STRIPE_API_KEY is unset, so the server boots with only required env vars
 * (graceful degradation of an optional integration). When disabled, the
 * client is `null` and callers must detect that rather than crashing.
 *
 * Imports use a query suffix so they resolve the REAL module even if another
 * test file has registered a `mock.module("lib/payments", ...)` (Bun module
 * mocks are global and persist across files in a single run).
 */

const importPayments = () =>
  import(`./payments?real=${Math.random().toString(36).slice(2)}`);

describe("payments client", () => {
  test("module imports without throwing when STRIPE_API_KEY is unset", async () => {
    // The default test env has no STRIPE_API_KEY, so importing the module
    // exercises the disabled boot path. Stripe's constructor throws on an
    // empty key, so a successful import proves we no longer construct it.
    const mod = await importPayments();
    expect(mod.default).toBeNull();
    expect(mod.isPaymentsEnabled).toBe(false);
  });

  test("createPaymentsClient returns null when no key is provided", async () => {
    const { createPaymentsClient } = await importPayments();
    expect(createPaymentsClient(undefined)).toBeNull();
    expect(createPaymentsClient("")).toBeNull();
  });

  test("createPaymentsClient constructs a Stripe client when a key is provided", async () => {
    const { createPaymentsClient } = await importPayments();
    const client = createPaymentsClient("sk_test_dummy");
    expect(client).not.toBeNull();
    // A real Stripe instance exposes the webhooks namespace used by callers
    expect(client?.webhooks).toBeDefined();
  });
});
