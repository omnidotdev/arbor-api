import { describe, expect, test } from "bun:test";

import {
  buildReceivePackHookEnv,
  uploadPackStream,
} from "./smart-http.service";

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

describe("uploadPackStream in-process fallback", () => {
  // The backend is uninitialized in tests, so this exercises the in-process
  // `git-upload-pack` path. Pointing it at a repo that does not exist on disk
  // makes the real plumbing exit non-zero.
  test("throws (does not complete cleanly) when git-upload-pack exits non-zero", async () => {
    const run = async () => {
      const chunks: Buffer[] = [];
      for await (const chunk of uploadPackStream(
        "arbor-nonexistent-owner",
        "arbor-nonexistent-repo",
        Buffer.from("0000"),
      )) {
        chunks.push(chunk);
      }
      return chunks;
    };

    // the non-zero exit must surface as a thrown error after stdout drains, so a
    // truncated pack is never delivered as a successful clone. The error is the
    // authoritative exit-code failure, not a transport-level stdin EPIPE
    await expect(run()).rejects.toThrow(/exited with code/);
  });
});
