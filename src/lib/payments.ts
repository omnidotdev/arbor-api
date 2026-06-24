import Stripe from "stripe";

import { STRIPE_API_KEY } from "lib/config/env.config";

/**
 * Construct a Stripe client, or `null` when no API key is configured.
 *
 * Stripe's constructor throws when given an empty key ("Neither apiKey nor
 * config.authenticator provided"), which would crash the server at boot. To
 * keep Stripe an optional integration that degrades gracefully, we only build
 * the client when a key is present and otherwise return `null`.
 */
export const createPaymentsClient = (
  apiKey: string | undefined,
): Stripe | null => (apiKey ? new Stripe(apiKey) : null);

/** Whether the Stripe billing integration is configured */
export const isPaymentsEnabled = !!STRIPE_API_KEY;

if (!isPaymentsEnabled) {
  console.warn("STRIPE_API_KEY not set, Stripe billing disabled");
}

/**
 * Payments client, or `null` when Stripe is not configured.
 *
 * Callers that hit Stripe (webhooks, checkout) must handle the disabled state
 * (e.g. return a clear error) rather than dereferencing `null`.
 */
const payments = createPaymentsClient(STRIPE_API_KEY);

export default payments;
