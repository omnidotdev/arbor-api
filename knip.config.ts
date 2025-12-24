import type { KnipConfig } from "knip";

/**
 * Knip configuration.
 * @see https://knip.dev/overview/configuration
 */
const knipConfig: KnipConfig = {
  ignore: [
    "**/generated/**",
    "src/lib/config/drizzle.config.ts",
    "src/lib/config/env.config.ts",
    "src/scripts/**",
    "src/lib/db/**",
    // auth plugin used when GraphQL is integrated
    "src/lib/graphql/**",
  ],
  ignoreDependencies: [
    "drizzle-kit",
    "drizzle-orm",
    "pg",
    "@types/pg",
    // used by auth plugin
    "@envelop/generic-auth",
    "@tanstack/query-core",
    "ms",
    "@types/ms",
  ],
  tags: ["-knipignore"],
};

export default knipConfig;
