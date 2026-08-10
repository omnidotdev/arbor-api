import { describe, expect, test } from "bun:test";

import { computeVersionDrift } from "./versionDrift";

const dep = (
  repositoryId: string,
  packageName: string,
  versionConstraint: string | null,
  packageManager = "npm",
) => ({ repositoryId, packageManager, packageName, versionConstraint });

describe("computeVersionDrift", () => {
  test("reports a package used at different versions across repositories", () => {
    const drift = computeVersionDrift([
      dep("a", "react", "^18.0.0"),
      dep("b", "react", "^17.0.0"),
    ]);

    expect(drift).toEqual([
      {
        packageManager: "npm",
        packageName: "react",
        versions: [
          { versionConstraint: "^17.0.0", repositoryIds: ["b"] },
          { versionConstraint: "^18.0.0", repositoryIds: ["a"] },
        ],
      },
    ]);
  });

  test("excludes a package everyone pins to the same version", () => {
    expect(
      computeVersionDrift([
        dep("a", "react", "^18.0.0"),
        dep("b", "react", "^18.0.0"),
      ]),
    ).toEqual([]);
  });

  test("groups the repositories on each version, most-used first", () => {
    const drift = computeVersionDrift([
      dep("a", "left-pad", "1.3.0"),
      dep("b", "left-pad", "1.3.0"),
      dep("c", "left-pad", "1.2.0"),
    ]);

    expect(drift[0]?.versions).toEqual([
      { versionConstraint: "1.3.0", repositoryIds: ["a", "b"] },
      { versionConstraint: "1.2.0", repositoryIds: ["c"] },
    ]);
  });

  test("keeps packages from different managers separate", () => {
    const drift = computeVersionDrift([
      dep("a", "serde", "1.0", "cargo"),
      dep("b", "serde", "2.0", "cargo"),
      dep("c", "serde", "1.0", "npm"),
    ]);
    // only the cargo serde drifts; the npm one appears once
    expect(drift).toHaveLength(1);
    expect(drift[0]?.packageManager).toBe("cargo");
  });

  test("treats an unpinned dependency as its own version", () => {
    const drift = computeVersionDrift([
      dep("a", "react", "^18.0.0"),
      dep("b", "react", null),
    ]);
    expect(drift[0]?.versions).toContainEqual({
      versionConstraint: null,
      repositoryIds: ["b"],
    });
  });

  test("de-duplicates a repository listed twice for the same package version", () => {
    const drift = computeVersionDrift([
      dep("a", "react", "^18.0.0"),
      dep("a", "react", "^18.0.0"),
      dep("b", "react", "^17.0.0"),
    ]);
    const v18 = drift[0]?.versions.find(
      (v) => v.versionConstraint === "^18.0.0",
    );
    expect(v18?.repositoryIds).toEqual(["a"]);
  });
});
