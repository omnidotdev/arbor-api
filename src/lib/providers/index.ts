import { createBillingProvider } from "@omnidotdev/providers/billing";
import { createEventsProvider } from "@omnidotdev/providers/events";

import {
  BILLING_BASE_URL,
  BILLING_SERVICE_API_KEY,
  VORTEX_API_KEY,
  VORTEX_API_URL,
} from "lib/config/env.config";

export const billing = createBillingProvider(
  BILLING_BASE_URL
    ? {
        provider: "aether",
        baseUrl: BILLING_BASE_URL,
        serviceApiKey: BILLING_SERVICE_API_KEY,
        appId: "arbor",
      }
    : {},
);

/** @knipignore */
const events = createEventsProvider(
  VORTEX_API_URL && VORTEX_API_KEY
    ? {
        provider: "http",
        baseUrl: VORTEX_API_URL,
        apiKey: VORTEX_API_KEY,
        source: "omni.arbor",
      }
    : {},
);

export default events;
