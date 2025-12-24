import { Elysia, t } from "elysia";

import app from "lib/config/app.config";
import { STRIPE_WEBHOOK_SECRET } from "lib/config/env.config";
import getPayments from "lib/payments";

/**
 * Webhooks Elysia instance (effectively used as a plugin).
 * @see https://hookdeck.com/webhooks/guides/what-are-webhooks-how-they-work
 */
const webhooks = new Elysia({ prefix: "/webhooks" }).post(
  "/stripe",
  async ({ request, headers, status }) => {
    const productName = app.name.toLowerCase();
    const signature = headers["stripe-signature"];

    if (!signature) return status(400, "Missing signature");

    try {
      const body = await request.text();
      const payments = getPayments();

      const event = await payments.webhooks.constructEventAsync(
        body,
        signature,
        STRIPE_WEBHOOK_SECRET as string,
      );

      switch (event.type) {
        case "customer.subscription.created": {
          // TODO: handle subscription created
          if (event.data.object.metadata.omniProduct !== productName) break;

          // const subscription = await payments.subscriptions.retrieve(
          //   event.data.object.id,
          // );

          break;
        }
        case "customer.subscription.updated": {
          // TODO: handle subscription updated
          if (event.data.object.metadata.omniProduct !== productName) break;

          break;
        }
        case "customer.subscription.deleted": {
          // TODO: handle subscription deleted
          if (event.data.object.metadata.omniProduct !== productName) break;

          break;
        }
        default:
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

export default webhooks;
