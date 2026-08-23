import { createHmac, timingSafeEqual } from "node:crypto";

import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";

import { applyDecision } from "lib/beta/decisionConsumer";
import app from "lib/config/app.config";
import {
  STRIPE_WEBHOOK_SECRET,
  VORTEX_WEBHOOK_SECRET,
} from "lib/config/env.config";
import { dbPool as db } from "lib/db/db";
import { organizationTable } from "lib/db/schema";
import entitlementsWebhook from "lib/entitlements/webhooks";
import { idpWebhook } from "lib/idp";
import payments from "lib/payments";

/**
 * Stripe webhook handler.
 *
 * Note: Tier/entitlements are now managed by Aether. This webhook only caches
 * the subscription ID for reference. Actual tier limits are enforced via
 * Aether's entitlements service.
 */
const stripeWebhook = new Elysia().post(
  "/stripe",
  async ({ request, headers, status }) => {
    const productName = app.name.toLowerCase();
    const signature = headers["stripe-signature"];

    if (!signature) return status(400, "Missing signature");

    // Stripe is an optional integration; when no API key is configured the
    // client is null. Fail loudly with a non-2xx so Stripe retries and the
    // misconfiguration is surfaced rather than crashing on a null deref.
    if (!payments) {
      console.error(
        "[Stripe Webhook] STRIPE_API_KEY not set, Stripe billing disabled",
      );
      return status(503, "Stripe billing not configured");
    }

    // A missing signing secret means we cannot verify ANY event. Fail loudly
    // with a non-2xx so Stripe retries (and surfaces the misconfiguration)
    // rather than silently treating unverifiable events as consumed.
    if (!STRIPE_WEBHOOK_SECRET) {
      console.error(
        "[Stripe Webhook] STRIPE_WEBHOOK_SECRET not set, cannot verify event",
      );
      return status(500, "Webhook signing secret not configured");
    }

    try {
      const body = await request.text();

      const event = await payments.webhooks.constructEventAsync(
        body,
        signature,
        STRIPE_WEBHOOK_SECRET,
      );

      switch (event.type) {
        case "customer.subscription.created": {
          if (event.data.object.metadata.omniProduct !== productName) break;

          const subscription = await payments.subscriptions.retrieve(
            event.data.object.id,
          );

          const organizationId = subscription.metadata.organizationId;

          // A subscription created without an organizationId is a billing
          // integration error, not a no-op. Surface it loudly so Stripe
          // retries and the gap is noticed rather than silently swallowed.
          if (!organizationId) {
            console.error(
              `[Stripe Webhook] subscription ${subscription.id} created without organizationId metadata`,
            );
            return status(500, "Subscription missing organizationId metadata");
          }

          // Cache subscription ID for reference (tier managed by Aether).
          // Writing the same id is idempotent, so safe under Stripe retries.
          // Note: created events also fire as `incomplete`/`trialing`; only
          // cache once the subscription is in a non-terminal billable state so
          // we don't persist a subscription that never activated.
          if (
            subscription.status === "active" ||
            subscription.status === "trialing"
          )
            await db
              .update(organizationTable)
              .set({ subscriptionId: subscription.id })
              .where(eq(organizationTable.id, organizationId));

          break;
        }
        case "customer.subscription.deleted": {
          if (event.data.object.metadata.omniProduct !== productName) break;

          const subscription = await payments.subscriptions.retrieve(
            event.data.object.id,
          );

          const organizationId = subscription.metadata.organizationId;

          if (!organizationId) {
            console.error(
              `[Stripe Webhook] subscription ${subscription.id} deleted without organizationId metadata`,
            );
            return status(500, "Subscription missing organizationId metadata");
          }

          // Clear the cached subscription ID. A `customer.subscription.deleted`
          // event is itself the terminal signal, so clear unconditionally
          // rather than gating on an exact status string that Stripe may not
          // always report (clearing is idempotent under retries).
          await db
            .update(organizationTable)
            .set({ subscriptionId: null })
            .where(eq(organizationTable.id, organizationId));

          break;
        }
        default:
          // Other subscription events (updated, etc.) are handled by Aether
          break;
      }

      return status(200, "Webhook event consumed");
    } catch (err) {
      // Never swallow: log loudly and return non-2xx so Stripe retries the
      // event instead of dropping it.
      console.error("[Stripe Webhook] Failed to process event:", err);
      return status(500, "Internal Server Error");
    }
  },
  {
    headers: t.Object({
      "stripe-signature": t.String(),
    }),
  },
);

/**
 * Verify an HMAC-SHA256 hex signature over the raw request body.
 *
 * Mirrors the entitlements/idp receivers and matches Vortex's delivery signing
 * (hex-encoded HMAC-SHA256 of the exact body bytes, keyed by the subscription's
 * hmacSecret). Constant-time comparison; any malformed input verifies false.
 */
const verifyVortexSignature = (
  payload: string,
  signature: string,
  secret: string,
): boolean => {
  try {
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    const signatureBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");

    if (signatureBuffer.length !== expectedBuffer.length) return false;

    return timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch {
    return false;
  }
};

/**
 * Extract the CloudEvent `data` from a delivered body, handling both Vortex
 * payload modes: "envelope" delivers `{ type, source, data, ... }`, "data"
 * delivers the data object directly. Returns the inner data either way.
 */
const extractEventData = (body: unknown): Record<string, unknown> => {
  if (
    body &&
    typeof body === "object" &&
    "data" in body &&
    typeof (body as { data: unknown }).data === "object" &&
    (body as { data: unknown }).data !== null
  ) {
    return (body as { data: Record<string, unknown> }).data;
  }
  return (body ?? {}) as Record<string, unknown>;
};

/**
 * Vortex webhook receiver.
 *
 * Consumes bifrost.application.decided (and ignores anything else) to flip the
 * local tester_application row when staff approve or decline a closed-beta
 * applicant. Signature-gated service-to-service: a missing/invalid signature is
 * rejected 401 and never processed; a malformed but authentic body is logged
 * and dropped with 200 (retrying would not help); an unexpected/infra failure
 * returns 500 so Vortex retries.
 */
const vortexWebhook = new Elysia().post(
  "/vortex",
  async ({ request, headers, status }) => {
    // Vortex delivery is signed; without a configured secret we cannot verify
    // any event, so fail loudly rather than process an unverifiable payload
    if (!VORTEX_WEBHOOK_SECRET) {
      console.error(
        "[Vortex Webhook] VORTEX_WEBHOOK_SECRET not set, cannot verify event",
      );
      return status(503, "Webhook signing secret not configured");
    }

    const signature = headers["x-vortex-signature"];
    if (!signature) return status(401, "Missing signature");

    try {
      const rawBody = await request.text();

      if (!verifyVortexSignature(rawBody, signature, VORTEX_WEBHOOK_SECRET)) {
        return status(401, "Invalid signature");
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        // authentic but unparseable: dropping is correct, a retry cannot fix it
        console.warn("[Vortex Webhook] Malformed JSON body, dropping");
        return status(200, "Ignored");
      }

      const result = await applyDecision({
        db,
        payload: extractEventData(parsed),
      });

      return status(200, result.outcome === "applied" ? "Applied" : "Ignored");
    } catch (err) {
      // unexpected/infra failure: return non-2xx so Vortex retries the delivery
      console.error("[Vortex Webhook] Failed to process event:", err);
      return status(500, "Internal Server Error");
    }
  },
);

/**
 * Webhooks Elysia instance (effectively used as a plugin).
 * @see https://hookdeck.com/webhooks/guides/what-are-webhooks-how-they-work
 */
const webhooks = new Elysia({ prefix: "/webhooks" })
  .use(stripeWebhook)
  .use(entitlementsWebhook)
  .use(idpWebhook)
  .use(vortexWebhook);

export default webhooks;
