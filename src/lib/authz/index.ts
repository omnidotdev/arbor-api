/**
 * Authorization module for Arbor.
 *
 * Provides functions for PostGraphile plugins to check permissions via PDP (Warden).
 *
 * IMPORTANT: This module is designed to be used via dynamic import inside
 * EXPORTABLE sideEffect callbacks. Do NOT import and pass functions directly
 * to EXPORTABLE as they reference native globals (fetch, AbortSignal) which
 * graphile-export cannot serialize.
 *
 * Usage in plugins:
 * ```ts
 * sideEffect([$input], async ([input]) => {
 *   const { checkPermission } = await import("lib/authz");
 *   const allowed = await checkPermission(...);
 * });
 * ```
 */

// Re-export for EXPORTABLE compatibility in plugins
export { AUTHZ_API_URL, AUTHZ_ENABLED } from "lib/config/env.config";

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 5000;

/** Circuit breaker failure threshold before opening */
const CIRCUIT_BREAKER_THRESHOLD = 5;

/** Circuit breaker cooldown in milliseconds before half-open */
const CIRCUIT_BREAKER_COOLDOWN_MS = 30000;

/**
 * Circuit breaker for AuthZ PDP calls.
 * Fails closed (denies access) when circuit is open to prevent security bypass.
 */
class CircuitBreaker {
  private failures = 0;
  private state: "closed" | "open" | "half-open" = "closed";
  private lastFailure = 0;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailure > CIRCUIT_BREAKER_COOLDOWN_MS) {
        this.state = "half-open";
      } else {
        throw new Error("AuthZ PDP unavailable - circuit open (fail-closed)");
      }
    }

    try {
      const result = await fn();
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private reset(): void {
    this.failures = 0;
    this.state = "closed";
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      this.state = "open";
    }
  }
}

// Singleton circuit breaker instance for permission checks
const circuitBreaker = new CircuitBreaker();

/**
 * Check if a user has permission on a resource.
 *
 * Uses two-layer caching:
 * 1. Request-scoped cache (passed as parameter) - avoids duplicate calls within same request
 * 2. TTL cache (module-level) - avoids duplicate calls across requests
 *
 * Returns true if authorized, false otherwise.
 * Returns true (permissive) when authz is disabled.
 * Throws error (fail-closed) when PDP is unavailable.
 *
 * NOTE: Import this function dynamically inside sideEffect callbacks to avoid
 * graphile-export serialization issues with native globals.
 */
export async function checkPermission(
  authzEnabled: string | undefined,
  authzProviderUrl: string | undefined,
  userId: string,
  resourceType: string,
  resourceId: string,
  permission: string,
  requestCache?: Map<string, boolean>,
): Promise<boolean> {
  // Permissive when disabled
  if (authzEnabled !== "true") return true;
  if (!authzProviderUrl) return true;

  // Import cache functions inline to avoid circular dependencies
  const { buildPermissionCacheKey, getCachedPermission, setCachedPermission } =
    await import("./cache");

  const cacheKey = buildPermissionCacheKey(
    userId,
    resourceType,
    resourceId,
    permission,
  );

  // Layer 1: Check request-scoped cache first
  if (requestCache?.has(cacheKey)) {
    return requestCache.get(cacheKey)!;
  }

  // Layer 2: Check TTL cache
  const cachedResult = getCachedPermission(cacheKey);
  if (cachedResult !== null) {
    // Also populate request cache for subsequent checks
    requestCache?.set(cacheKey, cachedResult);
    return cachedResult;
  }

  try {
    const allowed = await circuitBreaker.execute(async () => {
      const response = await fetch(`${authzProviderUrl}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: `user:${userId}`,
          relation: permission,
          object: `${resourceType}:${resourceId}`,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`AuthZ check failed: ${response.status}`);
      }

      const result = (await response.json()) as { allowed: boolean };
      return result.allowed;
    });

    // Store in both caches
    requestCache?.set(cacheKey, allowed);
    setCachedPermission(cacheKey, allowed);

    return allowed;
  } catch (error) {
    // Fail-closed: deny access when PDP is unavailable
    throw error;
  }
}
