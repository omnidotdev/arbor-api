import { describe, expect, test } from "bun:test";

import { deriveUseArborGit } from "./env.config";

describe("deriveUseArborGit", () => {
  test("on when flag=true and service url present", () => {
    expect(deriveUseArborGit("true", "arbor-git:50051")).toBe(true);
  });
  test("off when service url missing", () => {
    expect(deriveUseArborGit("true", "")).toBe(false);
  });
  test("off when flag not exactly 'true'", () => {
    expect(deriveUseArborGit("1", "arbor-git:50051")).toBe(false);
  });
});
