import { describe, expect, test } from "bun:test";

import { isValidRefName, parseRefName } from "./git.service";

describe("parseRefName", () => {
  test("splits a branch or tag name into its kind and short name", () => {
    expect(parseRefName("refs/heads/feature/x")).toEqual({
      kind: "branch",
      shortName: "feature/x",
    });
    expect(parseRefName("refs/tags/v1.0.0")).toEqual({
      kind: "tag",
      shortName: "v1.0.0",
    });
  });

  test("never lets a name address a ref of the other kind", () => {
    for (const crafted of [
      // a "tag" that is really the default branch, and the mirror
      "refs/tags/refs/heads/master",
      "refs/heads/refs/tags/v1",
      "refs/heads/refs/heads/main",
      "refs/tags/refs/",
      "refs/heads/",
      "refs/tags/",
      "refs/heads/HEAD",
      "refs/heads/-x",
      "refs/remotes/origin/main",
      "refs/arbor/merge-intent/x",
      "main",
    ]) {
      expect({ crafted, parsed: parseRefName(crafted) }).toEqual({
        crafted,
        parsed: null,
      });
    }
  });

  test("refuses any name git's check-ref-format would", () => {
    for (const invalid of [
      "a..b",
      "a b",
      "a~1",
      "a^",
      "a:b",
      "a?",
      "a*",
      "a[",
      "a\\b",
      "a/",
      "a.",
      "a.lock",
      "x/a.lock/b",
      ".hidden",
      "x/.hidden",
      "a@{1}",
      "a//b",
      "a\u0001",
      "a\u007f",
    ]) {
      expect({ invalid, ok: isValidRefName(`refs/heads/${invalid}`) }).toEqual({
        invalid,
        ok: false,
      });
      expect(parseRefName(`refs/heads/${invalid}`)).toBeNull();
    }
    expect(isValidRefName("@")).toBe(false);
    expect(isValidRefName("refs/heads/release-1.2")).toBe(true);
  });
});
