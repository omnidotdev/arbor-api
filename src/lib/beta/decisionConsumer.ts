import { eq } from "drizzle-orm";

import { testerApplicationTable } from "lib/db/schema";

/**
 * Consumer for the bifrost.application.decided event.
 *
 * Bifrost owns the cross-product review queue; when staff approve or decline an
 * arbor tester application it emits bifrost.application.decided, which arbor
 * receives (signature-verified) at /webhooks/vortex and applies here: the local
 * tester_application row's status is flipped, so "approved" grants closed-beta
 * access (see lib/beta/whitelist) and "declined" blocks with a reviewer note the
 * applicant can see before re-applying.
 *
 * Pure and dependency-injected so it is unit testable independent of the HTTP
 * route. Fail-closed and idempotent: unknown products, unknown decisions, and
 * missing rows are ignored (never throw), and re-delivering the same decision
 * simply re-writes the same values.
 */

/** The two terminal decisions a staff reviewer can make. */
type ApplicationDecision = "approved" | "declined";

const DECISIONS: ReadonlySet<string> = new Set(["approved", "declined"]);

/** The decision event's data payload (the `data` field of the CloudEvent). */
interface DecisionPayload {
  /** The product the application targets, "arbor" for our rows */
  product?: string;
  /** Bifrost's own application id, carried for tracing (arbor keys on userId) */
  sourceApplicationId?: string;
  /** The arbor user the decision is about */
  userId?: string;
  /** The staff decision */
  decision?: string;
  /** Optional reviewer note, the decline reason shown to the applicant */
  note?: string | null;
}

/**
 * The subset of the db this handler needs: a single update returning the rows it
 * touched. Structurally typed (loose write chain) so the concrete drizzle db is
 * assignable and the handler stays unit testable with a fake db.
 */
interface DecisionConsumerDb {
  update(table: any): any;
}

export interface ApplyDecisionArgs {
  db: DecisionConsumerDb;
  payload: DecisionPayload;
  /** Injectable clock so the decision timestamp is deterministic in tests. */
  now?: () => Date;
}

/** Outcome of processing one decision event. */
export type DecisionResult =
  | { outcome: "applied"; status: ApplicationDecision }
  | { outcome: "ignored"; reason: string };

/**
 * Apply a verified decision to the local tester_application row.
 *
 * The caller (the webhook route) is responsible for verifying the HMAC
 * signature before this runs; this function trusts its input is authentic but
 * still validates its shape and fails closed on anything unexpected.
 */
export const applyDecision = async ({
  db,
  payload,
  now = () => new Date(),
}: ApplyDecisionArgs): Promise<DecisionResult> => {
  // ignore decisions for other products sharing the same event stream
  if (payload.product !== "arbor") {
    return { outcome: "ignored", reason: "not an arbor decision" };
  }

  if (!payload.userId) {
    console.warn("[arbor] Decision event missing userId, ignoring");
    return { outcome: "ignored", reason: "missing userId" };
  }

  if (!payload.decision || !DECISIONS.has(payload.decision)) {
    console.warn(
      `[arbor] Decision event with unknown decision "${payload.decision}", ignoring`,
    );
    return { outcome: "ignored", reason: "unknown decision" };
  }

  const status = payload.decision as ApplicationDecision;
  const decidedAt = now();

  const affected = await db
    .update(testerApplicationTable)
    .set({
      status,
      // approval clears any prior decline note; a decline records the reason
      reviewerNote: payload.note ?? null,
      updatedAt: decidedAt,
    })
    .where(eq(testerApplicationTable.userId, payload.userId))
    .returning();

  // no local application for this user: nothing to flip. Not an error (the
  // decision may predate the row, or target a user who never applied here)
  if (!affected || affected.length === 0) {
    console.warn(
      `[arbor] Decision event for user with no application, ignoring`,
    );
    return { outcome: "ignored", reason: "no application for user" };
  }

  return { outcome: "applied", status };
};
