import { createEventsProvider } from "@omnidotdev/providers";

import { VORTEX_API_KEY, VORTEX_API_URL } from "lib/config/env.config";

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
