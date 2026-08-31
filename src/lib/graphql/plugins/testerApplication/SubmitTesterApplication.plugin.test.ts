import { describe, expect, mock, test } from "bun:test";

import { GraphQLError } from "graphql";

import { submitTesterApplication } from "./SubmitTesterApplication.plugin";

import type { EmailParams } from "@omnidotdev/providers/notifications";
import type { SelectTesterApplication } from "lib/db/schema";

const observer = {
  id: "u1",
  username: "octocat",
  email: "octocat@example.com",
};

const acceptedAt = new Date("2026-08-23T00:00:00.000Z");
const now = () => acceptedAt;

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

/**
 * A fake db recording the values passed to insert/update, returning a row that
 * merges those values so the handler's return and emit payload can be asserted.
 */
const makeDb = (existing?: SelectTesterApplication) => {
  const calls: {
    inserted?: Record<string, unknown>;
    updated?: Record<string, unknown>;
  } = {};
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
          return [row({ id: "app1", ...(values as object) })];
        },
      }),
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: () => ({
          returning: async () => {
            calls.updated = values;
            return [row({ ...(existing as object), ...(values as object) })];
          },
        }),
      }),
    }),
  };
  return db;
};

const validInput = {
  answers: { useCase: "ci" },
  ndaAccepted: true,
  ndaVersion: "1.0",
};

describe("submitTesterApplication", () => {
  test("throws for an anonymous caller", async () => {
    const emit = mock(async () => ({}));
    await expect(
      submitTesterApplication({
        observer: null,
        input: validInput,
        db: makeDb() as never,
        emit,
        now,
      }),
    ).rejects.toBeInstanceOf(GraphQLError);
    expect(emit).not.toHaveBeenCalled();
  });

  test("throws when the beta terms are not accepted", async () => {
    const emit = mock(async () => ({}));
    await expect(
      submitTesterApplication({
        observer,
        input: { ...validInput, ndaAccepted: false },
        db: makeDb() as never,
        emit,
        now,
      }),
    ).rejects.toBeInstanceOf(GraphQLError);
    expect(emit).not.toHaveBeenCalled();
  });

  test("throws when the terms version is missing", async () => {
    const emit = mock(async () => ({}));
    await expect(
      submitTesterApplication({
        observer,
        input: { ...validInput, ndaVersion: "  " },
        db: makeDb() as never,
        emit,
        now,
      }),
    ).rejects.toBeInstanceOf(GraphQLError);
    expect(emit).not.toHaveBeenCalled();
  });

  test("emails the applicant a confirmation on a successful submit", async () => {
    const emit = mock(async () => ({}));
    const sent: EmailParams[] = [];
    const notify = async (params: EmailParams) => {
      sent.push(params);
      return { success: true };
    };

    await submitTesterApplication({
      observer,
      input: validInput,
      db: makeDb() as never,
      emit,
      notify,
      appUrl: "https://arbor.omni.dev",
      now,
    });

    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe("octocat@example.com");
    expect(sent[0]?.subject).toMatch(/received|application/i);
  });

  test("does not fail the submit when the confirmation email throws", async () => {
    const emit = mock(async () => ({}));
    const db = makeDb();
    const result = await submitTesterApplication({
      observer,
      input: validInput,
      db: db as never,
      emit,
      notify: async () => {
        throw new Error("herald down");
      },
      appUrl: "https://arbor.omni.dev",
      now,
    });

    expect(result).toBeDefined();
    expect(db.calls.inserted).toBeDefined();
  });

  test("inserts a pending row and returns it when none exists", async () => {
    const emit = mock(async () => ({}));
    const db = makeDb();
    const result = await submitTesterApplication({
      observer,
      input: validInput,
      db: db as never,
      emit,
      now,
    });

    expect(db.calls.inserted).toMatchObject({
      userId: "u1",
      status: "pending",
      answers: { useCase: "ci" },
      ndaAccepted: true,
      ndaVersion: "1.0",
      ndaAcceptedAt: acceptedAt,
    });
    expect(result.status).toBe("pending");
    expect(result.id).toBe("app1");
  });

  test("emits arbor.application.submitted with the exact payload", async () => {
    const emit = mock(
      (_event: {
        type: string;
        subject?: string;
        data: Record<string, unknown>;
      }) => Promise.resolve({}),
    );
    await submitTesterApplication({
      observer,
      input: validInput,
      db: makeDb() as never,
      emit,
      now,
    });

    expect(emit).toHaveBeenCalledTimes(1);
    const event = emit.mock.calls[0]?.[0];
    if (!event) throw new Error("emit was not called with an event");
    expect(event.type).toBe("arbor.application.submitted");
    expect(event.subject).toBe("app1");
    expect(event.data).toEqual({
      applicationId: "app1",
      userId: "u1",
      handle: "octocat",
      email: "octocat@example.com",
      product: "arbor",
      answers: { useCase: "ci" },
      nda: { accepted: true, version: "1.0", acceptedAt },
    });
  });

  test("resets a declined application back to pending", async () => {
    const emit = mock(async () => ({}));
    const db = makeDb(
      row({ status: "declined", reviewerNote: "not now", answers: {} }),
    );
    const result = await submitTesterApplication({
      observer,
      input: {
        answers: { useCase: "new" },
        ndaAccepted: true,
        ndaVersion: "2.0",
      },
      db: db as never,
      emit,
      now,
    });

    expect(db.calls.updated).toMatchObject({
      status: "pending",
      answers: { useCase: "new" },
      ndaVersion: "2.0",
      reviewerNote: null,
    });
    expect(result.status).toBe("pending");
    expect(emit).toHaveBeenCalledTimes(1);
  });

  test("refuses when an application is already pending", async () => {
    const emit = mock(async () => ({}));
    await expect(
      submitTesterApplication({
        observer,
        input: validInput,
        db: makeDb(row({ status: "pending" })) as never,
        emit,
        now,
      }),
    ).rejects.toBeInstanceOf(GraphQLError);
    expect(emit).not.toHaveBeenCalled();
  });

  test("refuses when an application is already approved", async () => {
    const emit = mock(async () => ({}));
    await expect(
      submitTesterApplication({
        observer,
        input: validInput,
        db: makeDb(row({ status: "approved" })) as never,
        emit,
        now,
      }),
    ).rejects.toBeInstanceOf(GraphQLError);
    expect(emit).not.toHaveBeenCalled();
  });
});
