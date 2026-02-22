import type { KnipConfig } from "knip";

/**
 * Knip configuration.
 * @see https://knip.dev/overview/configuration
 */
const knipConfig: KnipConfig = {
  ignore: [
    "**/generated/**",
    "src/scripts/**",
    "src/lib/config/drizzle.config.ts",
    "src/lib/config/env.config.ts",
    "src/lib/config/graphile.config.ts",
    "src/lib/db/db.ts",
    "src/lib/db/schema/**",
    "src/lib/db/util/**",
    "src/lib/git/**",
    "src/lib/graphql/**",
    "src/lib/payments.ts",
    "src/webhooks.ts",
  ],
  ignoreDependencies: [
    "drizzle-kit",
    // Conditionally used when SEARCH_ENABLED=true
    "@omnidotdev/search",
  ],
  rules: {
    unlisted: "off",
  },
  tags: ["-knipignore"],
};

export default knipConfig;
