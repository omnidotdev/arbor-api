import { describe, expect, test } from "bun:test";

import { applyDecision } from "./decisionConsumer";

const decidedAt = new Date("2026-08-23T12:00:00.000Z");
const now = () => decidedAt;

/**
 * A fake db recording the values passed to update and the where filter, and
 * returning the supplied number of affected rows so the missing-row path can be
 * exercised.
 */
const makeDb = (affectedRows: number) => {
  const calls: { updated?: Record<string, unknown> } = {};
  const db = {
    calls,
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: () => ({
          returning: async () => {
            calls.updated = values;
            return Array.from({ length: affectedRows }, (_, i) => ({
              id: `app${i}`,
            }));
          },
        }),
      }),
    }),
  };
  return db;
};

describe("applyDecision", () => {
  test("approves the applicant's row and reports applied", async () => {
    const db = makeDb(1);
    const result = await applyDecision({
      db: db as never,
      payload: {
        product: "arbor",
        sourceApplicationId: "app1",
        userId: "u1",
        decision: "approved",
      },
      now,
    });

    expect(result).toEqual({ outcome: "applied", status: "approved" });
    expect(db.calls.updated).toMatchObject({
      status: "approved",
      reviewerNote: null,
      updatedAt: decidedAt,
    });
  });

  test("declines with a reviewer note", async () => {
    const db = makeDb(1);
    const result = await applyDecision({
      db: db as never,
      payload: {
        product: "arbor",
        sourceApplicationId: "app1",
        userId: "u1",
        decision: "declined",
        note: "not a fit right now",
      },
      now,
    });

    expect(result).toEqual({ outcome: "applied", status: "declined" });
    expect(db.calls.updated).toMatchObject({
      status: "declined",
      reviewerNote: "not a fit right now",
      updatedAt: decidedAt,
    });
  });

  test("ignores a decision for another product without writing", async () => {
    const db = makeDb(1);
    const result = await applyDecision({
      db: db as never,
      payload: {
        product: "bifrost",
        userId: "u1",
        decision: "approved",
      },
      now,
    });

    expect(result.outcome).toBe("ignored");
    expect(db.calls.updated).toBeUndefined();
  });

  test("ignores an unknown decision value without writing", async () => {
    const db = makeDb(1);
    const result = await applyDecision({
      db: db as never,
      payload: {
        product: "arbor",
        userId: "u1",
        decision: "maybe",
      },
      now,
    });

    expect(result.outcome).toBe("ignored");
    expect(db.calls.updated).toBeUndefined();
  });

  test("ignores a payload missing the userId without writing", async () => {
    const db = makeDb(1);
    const result = await applyDecision({
      db: db as never,
      payload: { product: "arbor", decision: "approved" },
      now,
    });

    expect(result.outcome).toBe("ignored");
    expect(db.calls.updated).toBeUndefined();
  });

  test("is a no-op when no application row exists for the user", async () => {
    const db = makeDb(0);
    const result = await applyDecision({
      db: db as never,
      payload: { product: "arbor", userId: "ghost", decision: "approved" },
      now,
    });

    expect(result.outcome).toBe("ignored");
    // the update was attempted, but affected no rows
    expect(db.calls.updated).toMatchObject({ status: "approved" });
  });
});
