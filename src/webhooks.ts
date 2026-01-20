import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";

import app from "lib/config/app.config";
import { STRIPE_WEBHOOK_SECRET } from "lib/config/env.config";
import { dbPool as db } from "lib/db/db";
import { organizationTable } from "lib/db/schema";
import entitlementsWebhook from "lib/entitlements/webhooks";
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

    try {
      const body = await request.text();

      const event = await payments.webhooks.constructEventAsync(
        body,
        signature,
        STRIPE_WEBHOOK_SECRET as string,
      );

      switch (event.type) {
        case "customer.subscription.created": {
          if (event.data.object.metadata.omniProduct !== productName) break;

          const subscription = await payments.subscriptions.retrieve(
            event.data.object.id,
          );

          const organizationId = subscription.metadata.organizationId;

          // Cache subscription ID for reference (tier managed by Aether)
          if (subscription.status === "active")
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

          // Clear cached subscription ID (tier managed by Aether)
          if (subscription.status === "canceled")
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
      console.error(err);
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
  .use(entitlementsWebhook);

export default webhooks;
