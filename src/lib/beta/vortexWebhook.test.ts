import { describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";

import { handleVortexDelivery } from "./vortexWebhook";

const SECRET = "test-vortex-secret";

const sign = (body: string) =>
  createHmac("sha256", SECRET).update(body).digest("hex");

const decidedEvent = {
  type: "bifrost.application.decided",
  source: "omni.bifrost",
  data: {
    product: "arbor",
    sourceApplicationId: "src-1",
    userId: "u1",
    decision: "approved",
  },
};

/**
 * A recording fake apply, passed in directly so no module mock (which bun
 * applies globally for the whole run) can leak into other suites.
 */
const recordingApply = () => {
  const calls: Record<string, unknown>[] = [];
  const apply = async (payload: Record<string, unknown>) => {
    calls.push(payload);
    return { outcome: "applied" as const, status: "approved" as const };
  };
  return { apply, calls };
};

describe("handleVortexDelivery", () => {
  test("returns 503 when no signing secret is configured", async () => {
    const { apply, calls } = recordingApply();
    const body = JSON.stringify(decidedEvent);
    const res = await handleVortexDelivery({
      rawBody: body,
      signature: sign(body),
      secret: undefined,
      apply,
    });
    expect(res.status).toBe(503);
    expect(calls).toHaveLength(0);
  });

  test("rejects a missing signature with 401 and does not apply", async () => {
    const { apply, calls } = recordingApply();
    const res = await handleVortexDelivery({
      rawBody: JSON.stringify(decidedEvent),
      signature: undefined,
      secret: SECRET,
      apply,
    });
    expect(res.status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  test("rejects an invalid signature with 401 and does not apply", async () => {
    const { apply, calls } = recordingApply();
    const res = await handleVortexDelivery({
      rawBody: JSON.stringify(decidedEvent),
      signature: "deadbeef",
      secret: SECRET,
      apply,
    });
    expect(res.status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  test("applies a validly-signed decision, delegating the envelope data", async () => {
    const { apply, calls } = recordingApply();
    const body = JSON.stringify(decidedEvent);
    const res = await handleVortexDelivery({
      rawBody: body,
      signature: sign(body),
      secret: SECRET,
      apply,
    });
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ userId: "u1", decision: "approved" });
  });

  test("applies data-mode deliveries (no envelope) too", async () => {
    const { apply, calls } = recordingApply();
    const body = JSON.stringify(decidedEvent.data);
    const res = await handleVortexDelivery({
      rawBody: body,
      signature: sign(body),
      secret: SECRET,
      apply,
    });
    expect(res.status).toBe(200);
    expect(calls[0]).toMatchObject({ userId: "u1" });
  });

  test("drops a non-decision event type with 200 without applying", async () => {
    const { apply, calls } = recordingApply();
    const body = JSON.stringify({
      type: "arbor.application.submitted",
      data: { product: "arbor", userId: "u1" },
    });
    const res = await handleVortexDelivery({
      rawBody: body,
      signature: sign(body),
      secret: SECRET,
      apply,
    });
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(0);
  });

  test("drops a malformed authentic body with 200", async () => {
    const { apply, calls } = recordingApply();
    const body = "not json";
    const res = await handleVortexDelivery({
      rawBody: body,
      signature: sign(body),
      secret: SECRET,
      apply,
    });
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(0);
  });

  test("returns 500 when apply throws so Vortex retries", async () => {
    const body = JSON.stringify(decidedEvent);
    const res = await handleVortexDelivery({
      rawBody: body,
      signature: sign(body),
      secret: SECRET,
      apply: async () => {
        throw new Error("db down");
      },
    });
    expect(res.status).toBe(500);
  });
});
