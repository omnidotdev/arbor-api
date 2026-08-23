import { describe, expect, test } from "bun:test";

import { getMyTesterApplication } from "./MyTesterApplication.plugin";

import type { SelectTesterApplication } from "lib/db/schema";

const observer = { id: "u1" };

const acceptedAt = new Date("2026-08-23T00:00:00.000Z");

/** A realistic stored application row, overridable per case. */
const row = (
  overrides: Partial<SelectTesterApplication> = {},
): SelectTesterApplication =>
  ({
    id: "app1",
    userId: "u1",
    answers: { useCase: "ci" },
    status: "pending",
    reviewerNote: null,
    ndaAccepted: true,
    ndaVersion: "1.0",
    ndaAcceptedAt: acceptedAt,
    createdAt: acceptedAt,
    updatedAt: acceptedAt,
    ...overrides,
  }) as SelectTesterApplication;

/** A fake db whose findFirst returns the supplied row (or undefined). */
const makeDb = (existing?: SelectTesterApplication) => ({
  query: {
    testerApplicationTable: {
      findFirst: async () => existing,
    },
  },
});

describe("getMyTesterApplication", () => {
  test("returns null for an anonymous caller without touching the db", async () => {
    let called = false;
    const db = {
      query: {
        testerApplicationTable: {
          findFirst: async () => {
            called = true;
            return undefined;
          },
        },
      },
    };
    const result = await getMyTesterApplication({
      observer: null,
      db: db as never,
    });
    expect(result).toBeNull();
    expect(called).toBe(false);
  });

  test("returns null when the caller has no application", async () => {
    const result = await getMyTesterApplication({
      observer,
      db: makeDb() as never,
    });
    expect(result).toBeNull();
  });

  test("returns the caller's application row when one exists", async () => {
    const result = await getMyTesterApplication({
      observer,
      db: makeDb(row({ status: "declined", reviewerNote: "not now" })) as never,
    });
    expect(result?.id).toBe("app1");
    expect(result?.status).toBe("declined");
    expect(result?.reviewerNote).toBe("not now");
  });
});
