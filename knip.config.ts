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
  ],
  ignoreDependencies: ["drizzle-kit", "drizzle-orm", "pg", "@types/pg"],
  tags: ["-knipignore"],
};

export default knipConfig;
