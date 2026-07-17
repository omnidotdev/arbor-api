import { Elysia } from "elysia";

/**
 * Simple in-memory rate limiter with sliding window.
 * For production, consider using Redis for distributed rate limiting.
 */

interface RateLimitConfig {
  /** Maximum requests allowed per window */
  max: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Custom key generator (default: IP address) */
  keyGenerator?: (request: Request) => string;
  /** Skip rate limiting for certain requests */
  skip?: (request: Request) => boolean;
  /** Message to return when rate limited */
  message?: string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const defaultConfig: RateLimitConfig = {
  max: 100,
  windowMs: 60_000, // 1 minute
  message: "Too many requests, please try again later",
};

/**
 * Create a rate limiter with the given configuration.
 */
const createRateLimiter = (config: Partial<RateLimitConfig> = {}) => {
  const options = { ...defaultConfig, ...config };
  const store = new Map<string, RateLimitEntry>();

  // Cleanup expired entries periodically
  const cleanup = () => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) {
        store.delete(key);
      }
    }
  };

  // Run cleanup every minute
  setInterval(cleanup, 60_000);

  const getKey = (request: Request): string => {
    if (options.keyGenerator) {
      return options.keyGenerator(request);
    }

    // Default: use IP from headers (common patterns)
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      // String.split always yields at least one element, so this is present. The
      // check is what proves it, and never falls through in practice
      const [firstForwarded] = forwarded.split(",");
      if (firstForwarded !== undefined) return firstForwarded.trim();
    }

    const realIp = request.headers.get("x-real-ip");
    if (realIp) {
      return realIp;
    }

    // Fallback to a default key (shouldn't happen in production with proxy)
    return "unknown";
  };

  const checkLimit = (
    key: string,
  ): { allowed: boolean; remaining: number; resetAt: number } => {
    const now = Date.now();
    let entry = store.get(key);

    // Create new entry or reset if window expired
    if (!entry || entry.resetAt < now) {
      entry = {
        count: 0,
        resetAt: now + options.windowMs,
      };
      store.set(key, entry);
    }

    entry.count++;

    return {
      allowed: entry.count <= options.max,
      remaining: Math.max(0, options.max - entry.count),
      resetAt: entry.resetAt,
    };
  };

  return { getKey, checkLimit, options };
};

/**
 * Rate limiting middleware for Elysia.
 *
 * @example
 * ```ts
 * app.use(rateLimit({ max: 100, windowMs: 60_000 }))
 * ```
 */
export const rateLimit = (config: Partial<RateLimitConfig> = {}) => {
  const { getKey, checkLimit, options } = createRateLimiter(config);

  return new Elysia({ name: "rate-limit" }).derive(
    { as: "global" },
    ({ request, set }) => {
      // Skip if configured
      if (options.skip?.(request)) {
        return {};
      }

      const key = getKey(request);
      const { allowed, remaining, resetAt } = checkLimit(key);

      // Add rate limit headers
      set.headers["X-RateLimit-Limit"] = String(options.max);
      set.headers["X-RateLimit-Remaining"] = String(remaining);
      set.headers["X-RateLimit-Reset"] = String(Math.ceil(resetAt / 1000));

      if (!allowed) {
        set.status = 429;
        set.headers["Retry-After"] = String(
          Math.ceil((resetAt - Date.now()) / 1000),
        );
        throw new Error(options.message);
      }

      return {};
    },
  );
};

/**
 * Git-specific rate limiter with higher limits for git operations.
 * Git operations (clone, fetch, push) are more expensive and less frequent.
 * @knipignore - exported for git routes
 */
export const gitRateLimit = (config: Partial<RateLimitConfig> = {}) => {
  return rateLimit({
    max: 30, // Lower limit for expensive git operations
    windowMs: 60_000,
    message: "Too many git operations, please try again later",
    ...config,
  });
};

/**
 * GraphQL rate limiter with moderate limits.
 * @knipignore - exported for graphql routes
 */
export const graphqlRateLimit = (config: Partial<RateLimitConfig> = {}) => {
  return rateLimit({
    max: 100,
    windowMs: 60_000,
    message: "Too many requests, please try again later",
    ...config,
  });
};
