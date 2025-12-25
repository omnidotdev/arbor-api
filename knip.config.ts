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
  ],
  ignoreDependencies: ["drizzle-kit", "drizzle-orm", "pg"],
  tags: ["-knipignore"],
};

export default knipConfig;
