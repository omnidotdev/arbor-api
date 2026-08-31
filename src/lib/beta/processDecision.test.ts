import { describe, expect, test } from "bun:test";

import { processApplicationDecision } from "./processDecision";

import type { EmailParams } from "@omnidotdev/providers/notifications";

const APP_URL = "https://arbor.omni.dev";
const now = () => new Date("2026-08-31T12:00:00.000Z");

/**
 * Fake db supporting the three reads/writes the flow needs: the prior
 * application status, the applicant's email, and the applyDecision update chain
 * (returns `affectedRows` rows so the applied/ignored branch is exercised).
 */
const makeDb = ({
  priorStatus,
  email,
  affectedRows = 1,
}: {
  priorStatus: string | null;
  email: string | null;
  affectedRows?: number;
}) => ({
  query: {
    testerApplicationTable: {
      findFirst: async () =>
        priorStatus === null ? undefined : { status: priorStatus },
    },
    userTable: {
      findFirst: async () => (email === null ? undefined : { email }),
    },
  },
  update: () => ({
    set: () => ({
      where: () => ({
        returning: async () =>
          Array.from({ length: affectedRows }, (_, i) => ({ id: `app${i}` })),
      }),
    }),
  }),
});

const collector = () => {
  const sent: EmailParams[] = [];
  return {
    sent,
    notify: async (params: EmailParams) => {
      sent.push(params);
      return { success: true };
    },
  };
};

const approve = { product: "arbor", userId: "u1", decision: "approved" };

describe("processApplicationDecision", () => {
  test("sends an acceptance email when a pending applicant is approved", async () => {
    const db = makeDb({ priorStatus: "pending", email: "dev@example.com" });
    const { sent, notify } = collector();

    const result = await processApplicationDecision({
      db: db as never,
      payload: approve,
      notify,
      appUrl: APP_URL,
      now,
    });

    expect(result).toEqual({ outcome: "applied", status: "approved" });
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe("dev@example.com");
    expect(sent[0]?.subject).toMatch(/beta/i);
  });

  test("does not re-send when the row was already approved", async () => {
    const db = makeDb({ priorStatus: "approved", email: "dev@example.com" });
    const { sent, notify } = collector();

    await processApplicationDecision({
      db: db as never,
      payload: approve,
      notify,
      appUrl: APP_URL,
      now,
    });

    expect(sent).toHaveLength(0);
  });

  test("does not email on a decline", async () => {
    const db = makeDb({ priorStatus: "pending", email: "dev@example.com" });
    const { sent, notify } = collector();

    await processApplicationDecision({
      db: db as never,
      payload: { product: "arbor", userId: "u1", decision: "declined" },
      notify,
      appUrl: APP_URL,
      now,
    });

    expect(sent).toHaveLength(0);
  });

  test("does not throw when the notify provider fails", async () => {
    const db = makeDb({ priorStatus: "pending", email: "dev@example.com" });

    const result = await processApplicationDecision({
      db: db as never,
      payload: approve,
      notify: async () => {
        throw new Error("herald down");
      },
      appUrl: APP_URL,
      now,
    });

    expect(result).toEqual({ outcome: "applied", status: "approved" });
  });

  test("skips the email when the applicant has no email on file", async () => {
    const db = makeDb({ priorStatus: "pending", email: null });
    const { sent, notify } = collector();

    await processApplicationDecision({
      db: db as never,
      payload: approve,
      notify,
      appUrl: APP_URL,
      now,
    });

    expect(sent).toHaveLength(0);
  });
});
