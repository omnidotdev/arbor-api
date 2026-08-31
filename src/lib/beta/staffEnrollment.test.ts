import { describe, expect, mock, test } from "bun:test";

import { ensureStaffEnrollment, isStaffEmail } from "./staffEnrollment";

const observer = {
  id: "u1",
  username: "staffer",
  email: "staffer@omni.dev",
};

/**
 * A fake db recording the values passed to insert, returning an approved row
 * that merges those values so the emit payload can be asserted. `existing`
 * controls whether a row is already present for the caller.
 */
const makeDb = (existing?: { id: string }) => {
  const calls: { inserted?: Record<string, unknown> } = {};
  const db = {
    calls,
    query: {
      testerApplicationTable: {
        findFirst: async () => existing,
      },
    },
    insert: () => ({
      values: (values: Record<string, unknown>) => ({
        returning: async () => {
          calls.inserted = values;
          return [
            {
              id: "app1",
              userId: "u1",
              answers: (values as { answers?: unknown }).answers,
              status: "approved",
              reviewerNote: (values as { reviewerNote?: unknown }).reviewerNote,
              ndaAccepted: false,
              ndaVersion: null,
              ndaAcceptedAt: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ];
        },
      }),
    }),
  };
  return db;
};

describe("isStaffEmail", () => {
  test("matches a configured staff domain, case-insensitively", () => {
    expect(isStaffEmail("Alice@Omni.Dev", ["omni.dev"])).toBe(true);
    expect(isStaffEmail("bob@omni.dev", ["omni.dev"])).toBe(true);
  });

  test("does not match a non-staff domain", () => {
    expect(isStaffEmail("carol@example.com", ["omni.dev"])).toBe(false);
  });

  test("does not partial-match a lookalike domain", () => {
    expect(isStaffEmail("mallory@notomni.dev", ["omni.dev"])).toBe(false);
    expect(isStaffEmail("mallory@omni.dev.evil.com", ["omni.dev"])).toBe(false);
  });

  test("is false for empty or malformed addresses", () => {
    expect(isStaffEmail(null, ["omni.dev"])).toBe(false);
    expect(isStaffEmail(undefined, ["omni.dev"])).toBe(false);
    expect(isStaffEmail("", ["omni.dev"])).toBe(false);
    expect(isStaffEmail("no-at-sign", ["omni.dev"])).toBe(false);
    expect(isStaffEmail("trailing@", ["omni.dev"])).toBe(false);
  });
});

describe("ensureStaffEnrollment", () => {
  test("inserts an approved row and emits once for a new staff caller", async () => {
    const emit = mock(
      (_event: {
        type: string;
        subject?: string;
        data: Record<string, unknown>;
      }) => Promise.resolve({}),
    );
    const db = makeDb();

    await ensureStaffEnrollment({
      observer,
      db: db as never,
      emit,
      domains: ["omni.dev"],
    });

    expect(db.calls.inserted).toMatchObject({
      userId: "u1",
      status: "approved",
      answers: { note: "Omni staff (auto-approved)" },
      reviewerNote: "Omni staff (auto-approved)",
      ndaAccepted: false,
    });

    expect(emit).toHaveBeenCalledTimes(1);
    const event = emit.mock.calls[0]?.[0];
    if (!event) throw new Error("emit was not called with an event");
    expect(event.type).toBe("arbor.application.submitted");
    expect(event.subject).toBe("app1");
    expect(event.data).toEqual({
      applicationId: "app1",
      userId: "u1",
      handle: "staffer",
      email: "staffer@omni.dev",
      product: "arbor",
      answers: { note: "Omni staff (auto-approved)" },
      nda: { accepted: false, version: null, acceptedAt: null },
    });
  });

  test("is a no-op when the caller already has a row (never overrides)", async () => {
    const emit = mock(async () => ({}));
    const db = makeDb({ id: "existing" });

    await ensureStaffEnrollment({
      observer,
      db: db as never,
      emit,
      domains: ["omni.dev"],
    });

    expect(db.calls.inserted).toBeUndefined();
    expect(emit).not.toHaveBeenCalled();
  });

  test("is a no-op for a non-staff caller", async () => {
    const emit = mock(async () => ({}));
    const db = makeDb();

    await ensureStaffEnrollment({
      observer: { ...observer, email: "outsider@example.com" },
      db: db as never,
      emit,
      domains: ["omni.dev"],
    });

    expect(db.calls.inserted).toBeUndefined();
    expect(emit).not.toHaveBeenCalled();
  });

  test("is a no-op for an anonymous caller", async () => {
    const emit = mock(async () => ({}));
    const db = makeDb();

    await ensureStaffEnrollment({
      observer: null,
      db: db as never,
      emit,
      domains: ["omni.dev"],
    });

    expect(db.calls.inserted).toBeUndefined();
    expect(emit).not.toHaveBeenCalled();
  });

  test("never throws when the db lookup fails", async () => {
    const emit = mock(async () => ({}));
    const db = {
      query: {
        testerApplicationTable: {
          findFirst: async () => {
            throw new Error("db down");
          },
        },
      },
      insert: () => {
        throw new Error("should not insert");
      },
    };

    await expect(
      ensureStaffEnrollment({
        observer,
        db: db as never,
        emit,
        domains: ["omni.dev"],
      }),
    ).resolves.toBeUndefined();
    expect(emit).not.toHaveBeenCalled();
  });
});
