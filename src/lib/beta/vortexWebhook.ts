import { Elysia } from "elysia";

import { applyDecision } from "lib/beta/decisionConsumer";
import { VORTEX_WEBHOOK_SECRET } from "lib/config/env.config";
import { verifyHmacSignature } from "lib/crypto";
import { dbPool } from "lib/db/db";

import type { DecisionResult } from "lib/beta/decisionConsumer";

/**
 * Vortex webhook receiver for closed-beta decisions.
 *
 * Consumes bifrost.application.decided (and ignores anything else) to flip the
 * local tester_application row when staff approve or decline a closed-beta
 * applicant. Signature-gated service-to-service, so it sits outside the GraphQL
 * pipeline. The verify/parse/route decision is a pure, dependency-injected
 * handleVortexDelivery so it is unit tested with an injected apply (no module
 * mocks, which bun applies globally); the Elysia route is a thin adapter.
 */

/** Event types this receiver acts on: any product's application decision. */
const DECIDED_TYPE_SUFFIX = ".application.decided";

/**
 * Extract the CloudEvent `type` and `data` from a delivered body, handling both
 * Vortex payload modes: "envelope" delivers `{ type, source, data, ... }`,
 * "data" delivers the data object directly (type then unknown).
 */
const extractEvent = (
  body: unknown,
): { type: string | null; data: Record<string, unknown> } => {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const type = typeof record.type === "string" ? record.type : null;
    if (typeof record.data === "object" && record.data !== null) {
      return { type, data: record.data as Record<string, unknown> };
    }
    return { type, data: record };
  }
  return { type: null, data: {} };
};

/** An HTTP result for the route adapter to return. */
interface DeliveryResult {
  status: number;
  body: string;
}

/**
 * Pure verify/parse/route-decision for one Vortex delivery.
 *
 * Verifies the HMAC signature (401 on missing/invalid, never processed), applies
 * `*.application.decided` via the injected `apply`, and drops anything else with
 * 200. A malformed authentic body is dropped (200, a retry cannot help); an
 * error from `apply` returns 500 so Vortex retries. Never leaks internal detail.
 */
export const handleVortexDelivery = async ({
  rawBody,
  signature,
  secret,
  apply,
}: {
  rawBody: string;
  signature: string | undefined;
  secret: string | undefined;
  apply: (payload: Record<string, unknown>) => Promise<DecisionResult>;
}): Promise<DeliveryResult> => {
  // Vortex delivery is signed; without a configured secret we cannot verify any
  // event, so fail loudly rather than process an unverifiable payload
  if (!secret) {
    console.error(
      "[Vortex Webhook] VORTEX_WEBHOOK_SECRET not set, cannot verify event",
    );
    return { status: 503, body: "Webhook signing secret not configured" };
  }

  if (!signature) return { status: 401, body: "Missing signature" };

  if (!verifyHmacSignature(rawBody, signature, secret)) {
    return { status: 401, body: "Invalid signature" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    console.warn("[Vortex Webhook] Malformed JSON body, dropping");
    return { status: 200, body: "Ignored" };
  }

  const { type, data } = extractEvent(parsed);

  // only decision events are acted on; ignore other event types
  if (type && !type.endsWith(DECIDED_TYPE_SUFFIX)) {
    return { status: 200, body: "Ignored" };
  }

  try {
    const result = await apply(data);
    return {
      status: 200,
      body: result.outcome === "applied" ? "Applied" : "Ignored",
    };
  } catch (err) {
    // an apply/db failure is retryable: 500 so Vortex redelivers
    console.error("[Vortex Webhook] Failed to apply decision:", err);
    return { status: 500, body: "Internal Server Error" };
  }
};

/**
 * Vortex webhook receiver route. Thin adapter: reads the raw body and delegates
 * the decision to handleVortexDelivery, backing apply with the live db.
 */
const vortexWebhook = new Elysia().post(
  "/vortex",
  async ({ request, headers, status }) => {
    let rawBody: string;
    try {
      rawBody = await request.text();
    } catch (err) {
      console.error("[Vortex Webhook] Failed to read body:", err);
      return status(500, "Internal Server Error");
    }

    const { status: code, body } = await handleVortexDelivery({
      rawBody,
      signature: headers["x-vortex-signature"],
      secret: VORTEX_WEBHOOK_SECRET,
      apply: (payload) => applyDecision({ db: dbPool, payload }),
    });

    return status(code, body);
  },
);

export default vortexWebhook;
