import { afterEach, describe, expect, mock, test } from "bun:test";

/**
 * Stripe webhook tests.
 *
 * Focus: a Stripe API/processing failure must SURFACE (non-2xx so Stripe
 * retries) rather than being swallowed, and webhook handling must be
 * idempotent under those retries.
 */

// Mutable mock state, swapped per-test
const mockState: {
  constructEvent: (...args: unknown[]) => unknown;
  retrieve: (...args: unknown[]) => unknown;
  updateCalls: Array<{ set: Record<string, unknown> }>;
  updateImpl: () => void;
} = {
  constructEvent: () => {
    throw new Error("not configured");
  },
  retrieve: () => {
    throw new Error("not configured");
  },
  updateCalls: [],
  updateImpl: () => {},
};

mock.module("lib/payments", () => ({
  default: {
    webhooks: {
      constructEventAsync: (...args: unknown[]) =>
        Promise.resolve(mockState.constructEvent(...args)),
    },
    subscriptions: {
      retrieve: (...args: unknown[]) =>
        Promise.resolve(mockState.retrieve(...args)),
    },
  },
}));

// Chainable Drizzle query builder stub: update().set().where()
mock.module("lib/db/db", () => ({
  dbPool: {
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: () => {
          mockState.updateCalls.push({ set: values });
          mockState.updateImpl();
          return Promise.resolve([{ id: "org_1" }]);
        },
      }),
    }),
  },
}));

// Ensure the signing secret is treated as configured (read by env.config at
// module load from process.env)
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

// Import AFTER mocks are registered
const { default: webhooks } = await import("./webhooks");

const post = (body: unknown, signature = "sig_test") =>
  webhooks.handle(
    new Request("http://localhost/webhooks/stripe", {
      method: "POST",
      headers: {
        "stripe-signature": signature,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }),
  );

const activeSubEvent = {
  type: "customer.subscription.created",
  data: { object: { id: "sub_1", metadata: { omniProduct: "arbor" } } },
};

afterEach(() => {
  mockState.updateCalls = [];
  mockState.updateImpl = () => {};
});

describe("stripe webhook", () => {
  test("rejects (non-2xx) when signature header is missing", async () => {
    const res = await webhooks.handle(
      new Request("http://localhost/webhooks/stripe", {
        method: "POST",
        body: "{}",
      }),
    );
    // Elysia header schema validation rejects the missing signature (422)
    // before the handler runs; either way it must never be treated as consumed.
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("returns 500 (so Stripe retries) when signature verification fails", async () => {
    mockState.constructEvent = () => {
      throw new Error("Invalid signature");
    };

    const res = await post({});
    expect(res.status).toBe(500);
  });

  test("returns 500 when the subscription DB write fails (failure is not swallowed)", async () => {
    mockState.constructEvent = () => activeSubEvent;
    mockState.retrieve = () => ({
      id: "sub_1",
      status: "active",
      metadata: { organizationId: "org_1" },
    });
    mockState.updateImpl = () => {
      throw new Error("permission denied / db write failed");
    };

    const res = await post(activeSubEvent);
    expect(res.status).toBe(500);
  });

  test("returns 500 when a created subscription is missing organizationId metadata", async () => {
    mockState.constructEvent = () => activeSubEvent;
    mockState.retrieve = () => ({
      id: "sub_1",
      status: "active",
      metadata: {},
    });

    const res = await post(activeSubEvent);
    expect(res.status).toBe(500);
    expect(mockState.updateCalls.length).toBe(0);
  });

  test("caches subscription id on an active subscription (200)", async () => {
    mockState.constructEvent = () => activeSubEvent;
    mockState.retrieve = () => ({
      id: "sub_1",
      status: "active",
      metadata: { organizationId: "org_1" },
    });

    const res = await post(activeSubEvent);
    expect(res.status).toBe(200);
    expect(mockState.updateCalls).toHaveLength(1);
    expect(mockState.updateCalls[0]?.set.subscriptionId).toBe("sub_1");
  });

  test("caches subscription id on a trialing subscription (not silently dropped)", async () => {
    mockState.constructEvent = () => activeSubEvent;
    mockState.retrieve = () => ({
      id: "sub_1",
      status: "trialing",
      metadata: { organizationId: "org_1" },
    });

    const res = await post(activeSubEvent);
    expect(res.status).toBe(200);
    expect(mockState.updateCalls).toHaveLength(1);
    expect(mockState.updateCalls[0]?.set.subscriptionId).toBe("sub_1");
  });

  test("processing the same created event twice is idempotent (same id written)", async () => {
    mockState.constructEvent = () => activeSubEvent;
    mockState.retrieve = () => ({
      id: "sub_1",
      status: "active",
      metadata: { organizationId: "org_1" },
    });

    await post(activeSubEvent);
    await post(activeSubEvent);

    expect(mockState.updateCalls).toHaveLength(2);
    expect(mockState.updateCalls[0]?.set.subscriptionId).toBe("sub_1");
    expect(mockState.updateCalls[1]?.set.subscriptionId).toBe("sub_1");
  });

  test("clears cached subscription id on deletion regardless of reported status", async () => {
    const deletedEvent = {
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_1", metadata: { omniProduct: "arbor" } } },
    };
    mockState.constructEvent = () => deletedEvent;
    // Stripe may not always report exactly "canceled"; clearing must still happen
    mockState.retrieve = () => ({
      id: "sub_1",
      status: "active",
      metadata: { organizationId: "org_1" },
    });

    const res = await post(deletedEvent);
    expect(res.status).toBe(200);
    expect(mockState.updateCalls).toHaveLength(1);
    expect(mockState.updateCalls[0]?.set.subscriptionId).toBeNull();
  });

  test("ignores events for other omni products (200, no write)", async () => {
    const otherEvent = {
      type: "customer.subscription.created",
      data: { object: { id: "sub_2", metadata: { omniProduct: "aether" } } },
    };
    mockState.constructEvent = () => otherEvent;

    const res = await post(otherEvent);
    expect(res.status).toBe(200);
    expect(mockState.updateCalls).toHaveLength(0);
  });
});
