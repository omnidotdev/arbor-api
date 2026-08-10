import { describe, expect, test } from "bun:test";

import { computeBlastRadius } from "./blastRadius";

// An edge means sourceRepositoryId depends on targetRepositoryId.
const edge = (source: string, target: string) => ({
  sourceRepositoryId: source,
  targetRepositoryId: target,
});

describe("computeBlastRadius", () => {
  test("includes a direct dependent at depth 1", () => {
    const result = computeBlastRadius([edge("app", "lib")], "lib");
    expect(result).toEqual([{ repositoryId: "app", depth: 1 }]);
  });

  test("follows a dependency chain, deepening the distance", () => {
    // app depends on mid, mid depends on lib
    const result = computeBlastRadius(
      [edge("app", "mid"), edge("mid", "lib")],
      "lib",
    );
    expect(result).toContainEqual({ repositoryId: "mid", depth: 1 });
    expect(result).toContainEqual({ repositoryId: "app", depth: 2 });
  });

  test("reports the shortest distance when a repository is reachable two ways", () => {
    // app depends on lib directly AND through mid
    const result = computeBlastRadius(
      [edge("app", "lib"), edge("app", "mid"), edge("mid", "lib")],
      "lib",
    );
    expect(result).toContainEqual({ repositoryId: "app", depth: 1 });
    expect(result).toContainEqual({ repositoryId: "mid", depth: 1 });
  });

  test("excludes the root repository itself", () => {
    const result = computeBlastRadius([edge("app", "lib")], "lib");
    expect(result.some((entry) => entry.repositoryId === "lib")).toBe(false);
  });

  test("terminates on a dependency cycle", () => {
    // a depends on lib, b depends on a, a depends on b (cycle a<->b)
    const result = computeBlastRadius(
      [edge("a", "lib"), edge("b", "a"), edge("a", "b")],
      "lib",
    );
    const ids = result.map((entry) => entry.repositoryId).sort();
    expect(ids).toEqual(["a", "b"]);
  });

  test("ignores repositories that do not depend on the root", () => {
    const result = computeBlastRadius(
      [edge("app", "lib"), edge("unrelated", "other")],
      "lib",
    );
    expect(result.some((entry) => entry.repositoryId === "unrelated")).toBe(
      false,
    );
  });
});
