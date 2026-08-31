import { describe, expect, mock, test } from "bun:test";

import { createCachedCounter } from "./applicantCount";

describe("createCachedCounter", () => {
  test("caches within the TTL and refetches after it elapses", async () => {
    let clock = 0;
    const fetchCount = mock(async () => 7);
    const counter = createCachedCounter(fetchCount, {
      ttlMs: 30_000,
      now: () => clock,
    });

    // first call fetches
    expect(await counter()).toBe(7);
    // second call inside the TTL is served from cache
    clock = 29_999;
    expect(await counter()).toBe(7);
    expect(fetchCount).toHaveBeenCalledTimes(1);

    // once the TTL elapses it fetches again
    clock = 30_001;
    expect(await counter()).toBe(7);
    expect(fetchCount).toHaveBeenCalledTimes(2);
  });

  test("reflects a changed count on the next fetch after expiry", async () => {
    let clock = 0;
    let value = 1;
    const counter = createCachedCounter(async () => value, {
      ttlMs: 1_000,
      now: () => clock,
    });

    expect(await counter()).toBe(1);
    value = 42;
    // still cached
    expect(await counter()).toBe(1);
    clock = 2_000;
    expect(await counter()).toBe(42);
  });
});
