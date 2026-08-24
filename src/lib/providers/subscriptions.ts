import {
  VORTEX_API_KEY,
  VORTEX_API_URL,
  WEBHOOK_TARGET_URL,
} from "lib/config/env.config";
import events from "lib/providers";

/**
 * Boot-time Vortex webhook subscription registration.
 *
 * arbor consumes Bifrost's decision events to flip the local tester_application
 * row, so it subscribes Vortex to deliver bifrost.application.decided to its
 * /webhooks/vortex receiver. Idempotent: it checks the existing subscriptions by
 * name and only creates one when absent, so repeated boots do not duplicate it.
 * Guarded by the Vortex env and a public target URL, so an unconfigured
 * environment simply skips registration.
 *
 * The subscription's signing secret is returned only on creation; the operator
 * sets it as VORTEX_WEBHOOK_SECRET (via the Vortex dashboard) so the receiver can
 * verify deliveries. It is never logged.
 */

const SUBSCRIPTION_NAME = "arbor-application-decisions";

const ensureVortexSubscriptions = async (): Promise<void> => {
  // events disabled or no public target: nothing to register
  if (!(VORTEX_API_URL && VORTEX_API_KEY && WEBHOOK_TARGET_URL)) return;
  if (!(events.listSubscriptions && events.subscribe)) return;

  try {
    const existing = await events.listSubscriptions();
    if (
      existing.some((subscription) => subscription.name === SUBSCRIPTION_NAME)
    )
      return;

    await events.subscribe({
      name: SUBSCRIPTION_NAME,
      typePattern: "bifrost.application.decided",
      targetUrl: WEBHOOK_TARGET_URL,
      signatureHeader: "x-vortex-signature",
      payloadMode: "envelope",
    });

    console.warn(
      `[Events] Created Vortex subscription "${SUBSCRIPTION_NAME}". Set VORTEX_WEBHOOK_SECRET to its signing secret (from the Vortex dashboard) to verify deliveries.`,
    );
  } catch (err) {
    // never block boot on subscription registration
    console.warn("[Events] Failed to ensure Vortex subscription:", err);
  }
};

export default ensureVortexSubscriptions;
