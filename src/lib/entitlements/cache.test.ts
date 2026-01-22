import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { getCached, invalidateCache, setCached } from "./cache";

describe("entitlements cache", () => {
  beforeEach(() => {
    // Clear cache before each test
    invalidateCache("*");
  });

  afterEach(() => {
    invalidateCache("*");
  });

  describe("getCached / setCached", () => {
    test("returns null for non-existent keys", () => {
      expect(getCached("nonexistent")).toBeNull();
    });

    test("stores and retrieves values", () => {
      setCached("test-key", { foo: "bar" }, 1);
      const result = getCached<{ foo: string }>("test-key");
      expect(result).not.toBeNull();
      expect(result?.foo).toBe("bar");
    });

    test("respects version checking", () => {
      setCached("versioned-key", { data: "v1" }, 1);

      // Correct version returns value
      const result = getCached<{ data: string }>("versioned-key", 1);
      expect(result).not.toBeNull();
      expect(result?.data).toBe("v1");

      // Wrong version returns null (stale)
      expect(getCached("versioned-key", 2)).toBeNull();
    });

    test("expires entries after TTL", async () => {
      // Set with very short TTL (10ms)
      setCached("expiring-key", { data: "expires" }, 1, 10);

      const result = getCached<{ data: string }>("expiring-key");
      expect(result).not.toBeNull();
      expect(result?.data).toBe("expires");

      // Wait for expiry
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(getCached("expiring-key")).toBeNull();
    });
  });

  describe("invalidateCache", () => {
    test("invalidates exact key match", () => {
      setCached("org:123", { tier: "free" }, 1);
      setCached("org:456", { tier: "team" }, 1);

      invalidateCache("org:123");

      expect(getCached("org:123")).toBeNull();
      const result = getCached<{ tier: string }>("org:456");
      expect(result).not.toBeNull();
      expect(result?.tier).toBe("team");
    });

    test("invalidates keys matching prefix pattern", () => {
      setCached("org:123:limits", { max_repos: 5 }, 1);
      setCached("org:123:tier", { tier: "free" }, 1);
      setCached("org:456:limits", { max_repos: 10 }, 1);

      invalidateCache("org:123:*");

      expect(getCached("org:123:limits")).toBeNull();
      expect(getCached("org:123:tier")).toBeNull();
      const result = getCached<{ max_repos: number }>("org:456:limits");
      expect(result).not.toBeNull();
      expect(result?.max_repos).toBe(10);
    });

    test("wildcard * invalidates all keys with that prefix", () => {
      setCached("organization:a", { data: 1 }, 1);
      setCached("organization:b", { data: 2 }, 1);
      setCached("user:x", { data: 3 }, 1);

      invalidateCache("organization:*");

      expect(getCached("organization:a")).toBeNull();
      expect(getCached("organization:b")).toBeNull();
      const result = getCached<{ data: number }>("user:x");
      expect(result).not.toBeNull();
      expect(result?.data).toBe(3);
    });
  });
});
