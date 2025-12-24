import Stripe from "stripe";

import { STRIPE_API_KEY } from "lib/config/env.config";

/**
 * Payments client (lazily initialized).
 */
let _payments: Stripe | null = null;

const getPayments = (): Stripe => {
  if (!_payments) {
    if (!STRIPE_API_KEY) {
      throw new Error("STRIPE_API_KEY is not configured");
    }
    _payments = new Stripe(STRIPE_API_KEY);
  }
  return _payments;
};

export default getPayments;
