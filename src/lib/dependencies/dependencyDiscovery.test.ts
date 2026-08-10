import { describe, expect, test } from "bun:test";

import { parseNpmManifest, partitionDependencies } from "./dependencyDiscovery";

describe("parseNpmManifest", () => {
  test("collects runtime, dev, peer, and optional dependencies", () => {
    const manifest = parseNpmManifest(
      JSON.stringify({
        dependencies: { "@omnidotdev/sigil": "^1.2.0" },
        devDependencies: { biome: "^2.0.0" },
        peerDependencies: { react: ">=18" },
        optionalDependencies: { fsevents: "^2.3.0" },
      }),
    );

    expect(manifest.packageManager).toBe("npm");
    expect(manifest.dependencies).toEqual([
      { name: "@omnidotdev/sigil", versionConstraint: "^1.2.0" },
      { name: "biome", versionConstraint: "^2.0.0" },
      { name: "react", versionConstraint: ">=18" },
      { name: "fsevents", versionConstraint: "^2.3.0" },
    ]);
  });

  test("de-duplicates a package that appears in more than one group", () => {
    const manifest = parseNpmManifest(
      JSON.stringify({
        dependencies: { typescript: "^5.4.0" },
        devDependencies: { typescript: "^5.4.0" },
      }),
    );

    expect(manifest.dependencies).toEqual([
      { name: "typescript", versionConstraint: "^5.4.0" },
    ]);
  });

  test("skips entries whose version is not a string", () => {
    const manifest = parseNpmManifest(
      JSON.stringify({ dependencies: { weird: { version: "1.0.0" } } }),
    );

    expect(manifest.dependencies).toEqual([]);
  });

  test("returns no dependencies when the manifest declares none", () => {
    expect(
      parseNpmManifest(JSON.stringify({ name: "x" })).dependencies,
    ).toEqual([]);
  });

  test("throws on a manifest that is not valid JSON", () => {
    expect(() => parseNpmManifest("not json {")).toThrow();
  });
});

describe("partitionDependencies", () => {
  const manifest = {
    packageManager: "npm",
    dependencies: [
      { name: "sigil", versionConstraint: "^1.0.0" },
      { name: "internal-by-slug", versionConstraint: "^2.0.0" },
      { name: "left-pad", versionConstraint: "^1.3.0" },
    ],
  };
  const candidates = [
    { id: "repo-sigil", name: "sigil", slug: "sigil" },
    { id: "repo-internal", name: "Internal By Slug", slug: "internal-by-slug" },
    { id: "repo-self", name: "self", slug: "self" },
  ];

  test("resolves a dependency whose name matches a repository", () => {
    const { internal } = partitionDependencies(manifest, candidates, "repo-x");
    expect(internal).toContainEqual({
      targetRepositoryId: "repo-sigil",
      versionConstraint: "^1.0.0",
    });
  });

  test("resolves a dependency whose name matches a repository slug", () => {
    const { internal } = partitionDependencies(manifest, candidates, "repo-x");
    expect(internal).toContainEqual({
      targetRepositoryId: "repo-internal",
      versionConstraint: "^2.0.0",
    });
  });

  test("routes an unmatched dependency to external with the package manager", () => {
    const { external } = partitionDependencies(manifest, candidates, "repo-x");
    expect(external).toEqual([
      {
        packageManager: "npm",
        packageName: "left-pad",
        versionConstraint: "^1.3.0",
      },
    ]);
  });

  test("never creates a self-edge when a repository names itself", () => {
    const selfManifest = {
      packageManager: "npm",
      dependencies: [{ name: "self", versionConstraint: "^1.0.0" }],
    };
    const result = partitionDependencies(selfManifest, candidates, "repo-self");
    expect(result.internal).toEqual([]);
    expect(result.external).toEqual([]);
  });
});
