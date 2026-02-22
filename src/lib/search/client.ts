import { OmniSearch, indexes } from "@omnidotdev/search";

import {
  MEILISEARCH_MASTER_KEY,
  MEILISEARCH_URL,
  isSearchEnabled,
} from "lib/config/env.config";

/**
 * Meilisearch client for Arbor.
 * Only initialized if SEARCH_ENABLED is true and credentials are present.
 */
export const search = isSearchEnabled
  ? new OmniSearch({
      host: MEILISEARCH_URL!,
      masterKey: MEILISEARCH_MASTER_KEY!,
    })
  : null;

/**
 * Arbor index configurations.
 */
export const arborIndexes = indexes.arbor;

/**
 * Initialize Arbor search indexes.
 * Should be called during application bootstrap.
 */
export async function initializeSearchIndexes(): Promise<void> {
  if (!search) {
    return;
  }

  try {
    await search.configureIndex(arborIndexes.repositories);
    await search.configureIndex(arborIndexes.users);
    await search.configureIndex(arborIndexes.issues);
  } catch (error) {
    console.error("[Search] Failed to initialize indexes:", error);
    // Don't throw - search is non-critical
  }
}
