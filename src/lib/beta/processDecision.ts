import {
  composeAcceptanceEmail,
  shouldSendAcceptanceEmail,
} from "lib/beta/betaEmails";
import { applyDecision } from "lib/beta/decisionConsumer";

import type { EmailParams } from "@omnidotdev/providers/notifications";
import type { DecisionResult } from "lib/beta/decisionConsumer";

/**
 * The db surface this flow needs: the prior application status (to detect a
 * real approve transition), the applicant's email, and the applyDecision write
 * chain. Structurally typed (loose) so the concrete drizzle db is assignable and
 * the flow stays unit testable with a fake db.
 */
interface ProcessDecisionDb {
  query: {
    testerApplicationTable: {
      findFirst(config?: unknown): PromiseLike<{ status: string } | undefined>;
    };
    userTable: {
      findFirst(config?: unknown): PromiseLike<{ email: string } | undefined>;
    };
  };
  update(table: unknown): unknown;
}

interface ProcessApplicationDecisionArgs {
  db: ProcessDecisionDb;
  /** The decision event's `data` payload (see decisionConsumer). */
  payload: Record<string, unknown>;
  /** Best-effort email sender (notifications.sendEmail); never expected to throw. */
  notify: (params: EmailParams) => Promise<unknown>;
  /** Public base URL of the arbor app, linked in the acceptance email. */
  appUrl: string;
  /** Injectable clock, forwarded to applyDecision. */
  now?: () => Date;
}

/**
 * Apply a beta decision and, on a real transition into "approved", email the
 * applicant that they're in.
 *
 * Wraps the pure applyDecision (which owns the row flip) with the side effect of
 * an acceptance email. The prior status is read before applying so a re-delivered
 * decision for an already-approved row does not send a duplicate. The send is
 * best-effort: a mail failure is swallowed so Vortex is not asked to retry a
 * delivery whose decision was already applied.
 */
export const processApplicationDecision = async ({
  db,
  payload,
  notify,
  appUrl,
  now,
}: ProcessApplicationDecisionArgs): Promise<DecisionResult> => {
  const userId =
    typeof payload.userId === "string" ? payload.userId : undefined;

  const prior = userId
    ? await db.query.testerApplicationTable.findFirst({
        where: (
          table: { userId: unknown },
          { eq }: { eq: (a: unknown, b: unknown) => unknown },
        ) => eq(table.userId, userId),
      })
    : undefined;

  const result = await applyDecision({ db: db as never, payload, now });

  if (userId && shouldSendAcceptanceEmail(prior?.status ?? null, result)) {
    try {
      const user = await db.query.userTable.findFirst({
        where: (
          table: { id: unknown },
          { eq }: { eq: (a: unknown, b: unknown) => unknown },
        ) => eq(table.id, userId),
      });
      if (user?.email) {
        await notify(composeAcceptanceEmail({ to: user.email, appUrl }));
      }
    } catch (err) {
      // acceptance email is best-effort: the decision is already applied, so a
      // mail failure must not turn into a webhook 500 (which would redeliver)
      console.warn("[arbor] Failed to send acceptance email:", err);
    }
  }

  return result;
};
