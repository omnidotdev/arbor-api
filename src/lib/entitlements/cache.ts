/**
 * Simple TTL cache for entitlements.
 * Invalidated via webhook when entitlements change.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Invalidate cache entries matching a pattern.
 * Supports wildcards (*) at the end of the pattern.
 */
export const invalidateCache = (pattern: string): void => {
  if (pattern.endsWith("*")) {
    const prefix = pattern.slice(0, -1);
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) {
        cache.delete(key);
      }
    }
  } else {
    cache.delete(pattern);
  }
};
