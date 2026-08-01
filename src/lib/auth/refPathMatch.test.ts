import { describe, expect, test } from "bun:test";

import { matchesAnyGlob, matchesGlob } from "./refPathMatch";

describe("matchesGlob", () => {
  test("an exact pattern matches only that value", () => {
    expect(matchesGlob("refs/heads/main", "refs/heads/main")).toBe(true);
    expect(matchesGlob("refs/heads/main", "refs/heads/mainline")).toBe(false);
  });

  test("a single star matches within one segment but not across slashes", () => {
    expect(matchesGlob("refs/heads/agent/*", "refs/heads/agent/foo")).toBe(
      true,
    );
    expect(matchesGlob("refs/heads/agent/*", "refs/heads/agent/foo/bar")).toBe(
      false,
    );
  });

  test("a double star matches across slashes", () => {
    expect(matchesGlob("refs/heads/agent/**", "refs/heads/agent/foo")).toBe(
      true,
    );
    expect(matchesGlob("refs/heads/agent/**", "refs/heads/agent/foo/bar")).toBe(
      true,
    );
  });

  test("a path prefix glob confines to a subtree", () => {
    expect(matchesGlob("src/**", "src/index.ts")).toBe(true);
    expect(matchesGlob("src/**", "src/lib/git/hook.ts")).toBe(true);
    expect(matchesGlob("src/**", "test/index.ts")).toBe(false);
  });

  test("a subtree glob does not match a sibling with a shared prefix", () => {
    expect(matchesGlob("src/**", "src-gen/index.ts")).toBe(false);
  });

  test("an extension glob matches within a segment only", () => {
    expect(matchesGlob("*.ts", "index.ts")).toBe(true);
    expect(matchesGlob("*.ts", "src/index.ts")).toBe(false);
  });

  test("regex metacharacters in the pattern are treated literally", () => {
    expect(matchesGlob("refs/heads/v1.0", "refs/heads/v1.0")).toBe(true);
    // the dot is literal, so it must not act as a regex wildcard
    expect(matchesGlob("refs/heads/v1.0", "refs/heads/v1x0")).toBe(false);
  });
});

describe("matchesAnyGlob", () => {
  test("matches when any pattern matches", () => {
    expect(
      matchesAnyGlob(["refs/heads/agent/*", "refs/tags/*"], "refs/tags/v1.0.0"),
    ).toBe(true);
  });

  test("does not match when no pattern matches", () => {
    expect(matchesAnyGlob(["refs/heads/agent/*"], "refs/heads/master")).toBe(
      false,
    );
  });

  test("an empty pattern list matches nothing, so it fails closed", () => {
    expect(matchesAnyGlob([], "refs/heads/anything")).toBe(false);
  });
});
