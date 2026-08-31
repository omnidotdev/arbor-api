import { createBillingProvider } from "@omnidotdev/providers/billing";
import { createEventsProvider } from "@omnidotdev/providers/events";
import { createNotificationProvider } from "@omnidotdev/providers/notifications";

import {
  BILLING_BASE_URL,
  BILLING_SERVICE_API_KEY,
  HERALD_API_KEY,
  HERALD_API_URL,
  NOTIFICATION_FROM_EMAIL,
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

/**
 * Transactional email provider (Herald). Falls back to a noop provider that logs
 * to stdout when Herald is not configured, so the beta lifecycle emails degrade
 * gracefully (no send) in unconfigured environments.
 */
export const notifications = createNotificationProvider(
  HERALD_API_URL && HERALD_API_KEY
    ? {
        provider: "herald",
        apiUrl: HERALD_API_URL,
        apiKey: HERALD_API_KEY,
        defaultFrom: NOTIFICATION_FROM_EMAIL ?? "Arbor <arbor@send.omni.dev>",
      }
    : {},
);

export default events;
