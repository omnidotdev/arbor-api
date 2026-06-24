import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";

import app from "lib/config/app.config";
import { STRIPE_WEBHOOK_SECRET } from "lib/config/env.config";
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
 * Webhooks Elysia instance (effectively used as a plugin).
 * @see https://hookdeck.com/webhooks/guides/what-are-webhooks-how-they-work
 */
const webhooks = new Elysia({ prefix: "/webhooks" })
  .use(stripeWebhook)
  .use(entitlementsWebhook)
  .use(idpWebhook);

export default webhooks;
