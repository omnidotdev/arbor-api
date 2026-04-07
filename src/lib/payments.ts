import Stripe from "stripe";

import { STRIPE_API_KEY } from "lib/config/env.config";

if (!STRIPE_API_KEY) {
  console.warn("STRIPE_API_KEY not set, Stripe billing disabled");
}

/**
 * Payments client.
 * Constructed with empty key when unconfigured so the app boots; API calls
 * will fail at request time with an auth error.
 */
const payments = new Stripe(STRIPE_API_KEY ?? "");

export default payments;
