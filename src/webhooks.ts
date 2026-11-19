import { Elysia } from "elysia";

import vortexWebhook from "lib/beta/vortexWebhook";
import entitlementsWebhook from "lib/entitlements/webhooks";
import { idpWebhook } from "lib/idp";

/**
 * Webhooks Elysia instance (effectively used as a plugin).
 * @see https://hookdeck.com/webhooks/guides/what-are-webhooks-how-they-work
 *
 * Subscriptions and tier entitlements are owned by Aether: arbor consumes them
 * through the entitlements webhook, so there is no direct Stripe integration
 * here.
 */
const webhooks = new Elysia({ prefix: "/webhooks" })
  .use(entitlementsWebhook)
  .use(idpWebhook)
  .use(vortexWebhook);

export default webhooks;
