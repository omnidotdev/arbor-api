import { describe, expect, test } from "bun:test";

import { buildReceivePackHookEnv } from "./smart-http.service";

describe("buildReceivePackHookEnv", () => {
  test("injects nothing when there are no bounds to enforce", () => {
    expect(buildReceivePackHookEnv(null)).toEqual({});
  });

  test("passes ref patterns as JSON and omits an unconfined path dimension", () => {
    const env = buildReceivePackHookEnv({
      refPatterns: ["refs/heads/agent/*"],
      pathPatterns: null,
    });
    expect(env.ARBOR_REF_PATTERNS).toBe(JSON.stringify(["refs/heads/agent/*"]));
    expect(env.ARBOR_PATH_PATTERNS).toBeUndefined();
  });

  test("passes both dimensions when both are confined", () => {
    const env = buildReceivePackHookEnv({
      refPatterns: ["refs/heads/agent/*"],
      pathPatterns: ["src/**"],
    });
    expect(env.ARBOR_REF_PATTERNS).toBe(JSON.stringify(["refs/heads/agent/*"]));
    expect(env.ARBOR_PATH_PATTERNS).toBe(JSON.stringify(["src/**"]));
  });

  test("passes a path-only confinement with no ref dimension", () => {
    const env = buildReceivePackHookEnv({
      refPatterns: null,
      pathPatterns: ["src/**"],
    });
    expect(env.ARBOR_REF_PATTERNS).toBeUndefined();
    expect(env.ARBOR_PATH_PATTERNS).toBe(JSON.stringify(["src/**"]));
  });
});
