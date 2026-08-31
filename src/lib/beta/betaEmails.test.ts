import { describe, expect, test } from "bun:test";

import {
  composeAcceptanceEmail,
  composeApplicationReceivedEmail,
  shouldSendAcceptanceEmail,
} from "./betaEmails";

import type { DecisionResult } from "./decisionConsumer";

const APP_URL = "https://arbor.omni.dev";

describe("composeAcceptanceEmail", () => {
  test("addresses the applicant with an approval subject and a link into the app", () => {
    const email = composeAcceptanceEmail({
      to: "dev@example.com",
      appUrl: APP_URL,
    });

    expect(email.to).toBe("dev@example.com");
    expect(email.subject).toMatch(/beta/i);
    expect(email.html).toBe(true);
    expect(email.body).toContain(APP_URL);
  });
});

describe("composeApplicationReceivedEmail", () => {
  test("addresses the applicant with a received-confirmation subject", () => {
    const email = composeApplicationReceivedEmail({
      to: "dev@example.com",
      appUrl: APP_URL,
    });

    expect(email.to).toBe("dev@example.com");
    expect(email.subject).toMatch(/received|application/i);
    expect(email.html).toBe(true);
  });
});

describe("shouldSendAcceptanceEmail", () => {
  const applied = (status: "approved" | "declined"): DecisionResult => ({
    outcome: "applied",
    status,
  });

  test("sends when a pending applicant transitions to approved", () => {
    expect(shouldSendAcceptanceEmail("pending", applied("approved"))).toBe(
      true,
    );
  });

  test("sends when a previously declined applicant is approved", () => {
    expect(shouldSendAcceptanceEmail("declined", applied("approved"))).toBe(
      true,
    );
  });

  test("does not re-send when the row was already approved (event re-delivery)", () => {
    expect(shouldSendAcceptanceEmail("approved", applied("approved"))).toBe(
      false,
    );
  });

  test("does not send on a decline", () => {
    expect(shouldSendAcceptanceEmail("pending", applied("declined"))).toBe(
      false,
    );
  });

  test("does not send when the decision was ignored", () => {
    expect(
      shouldSendAcceptanceEmail("pending", {
        outcome: "ignored",
        reason: "no application for user",
      }),
    ).toBe(false);
  });
});
