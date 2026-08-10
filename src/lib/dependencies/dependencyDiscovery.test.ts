import { describe, expect, test } from "bun:test";

import {
  parseCargoManifest,
  parseGoManifest,
  parseNpmManifest,
  parsePipManifest,
  partitionDependencies,
} from "./dependencyDiscovery";

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

describe("parseCargoManifest", () => {
  test("collects normal, dev, and build dependencies", () => {
    const manifest = parseCargoManifest(
      [
        "[dependencies]",
        'serde = "1.0"',
        "[dev-dependencies]",
        'criterion = "0.5"',
        "[build-dependencies]",
        'cc = "1.0"',
      ].join("\n"),
    );

    expect(manifest.packageManager).toBe("cargo");
    expect(manifest.dependencies).toEqual([
      { name: "serde", versionConstraint: "1.0" },
      { name: "criterion", versionConstraint: "0.5" },
      { name: "cc", versionConstraint: "1.0" },
    ]);
  });

  test("reads the version out of a dependency given as a table", () => {
    const manifest = parseCargoManifest(
      '[dependencies]\ntokio = { version = "1", features = ["full"] }',
    );
    expect(manifest.dependencies).toEqual([
      { name: "tokio", versionConstraint: "1" },
    ]);
  });

  test("keeps a dependency that declares no version (git or path)", () => {
    const manifest = parseCargoManifest(
      '[dependencies]\nlocal = { path = "../local" }',
    );
    expect(manifest.dependencies).toEqual([
      { name: "local", versionConstraint: null },
    ]);
  });

  test("de-duplicates a crate that appears in more than one section", () => {
    const manifest = parseCargoManifest(
      '[dependencies]\nserde = "1.0"\n[dev-dependencies]\nserde = "1.0"',
    );
    expect(manifest.dependencies).toEqual([
      { name: "serde", versionConstraint: "1.0" },
    ]);
  });

  test("returns no dependencies when the manifest declares none", () => {
    expect(parseCargoManifest('[package]\nname = "x"').dependencies).toEqual(
      [],
    );
  });

  test("throws on a manifest that is not valid TOML", () => {
    expect(() => parseCargoManifest('key = "unterminated')).toThrow();
  });
});

describe("parseGoManifest", () => {
  test("collects a require block and a single-line require, ignoring module/go", () => {
    const manifest = parseGoManifest(
      [
        "module example.com/m",
        "go 1.21",
        "require github.com/pkg/errors v0.9.1",
        "require (",
        "\tgolang.org/x/sync v0.5.0",
        "\tgolang.org/x/text v0.14.0 // indirect",
        ")",
      ].join("\n"),
    );

    expect(manifest.packageManager).toBe("go");
    expect(manifest.dependencies).toEqual([
      { name: "github.com/pkg/errors", versionConstraint: "v0.9.1" },
      { name: "golang.org/x/sync", versionConstraint: "v0.5.0" },
      { name: "golang.org/x/text", versionConstraint: "v0.14.0" },
    ]);
  });

  test("returns no dependencies when none are required", () => {
    expect(
      parseGoManifest("module example.com/m\ngo 1.21").dependencies,
    ).toEqual([]);
  });
});

describe("parsePipManifest", () => {
  test("parses pinned, ranged, and unversioned requirements", () => {
    const manifest = parsePipManifest(
      ["requests==2.31.0", "Flask>=2.0,<3.0", "urllib3"].join("\n"),
    );

    expect(manifest.packageManager).toBe("pip");
    expect(manifest.dependencies).toEqual([
      { name: "requests", versionConstraint: "==2.31.0" },
      { name: "Flask", versionConstraint: ">=2.0,<3.0" },
      { name: "urllib3", versionConstraint: null },
    ]);
  });

  test("strips extras and environment markers from the name and version", () => {
    const manifest = parsePipManifest(
      'celery[redis]==5.3.0 ; python_version >= "3.8"',
    );
    expect(manifest.dependencies).toEqual([
      { name: "celery", versionConstraint: "==5.3.0" },
    ]);
  });

  test("skips comments, blank lines, and option or VCS lines", () => {
    const manifest = parsePipManifest(
      [
        "# a comment",
        "",
        "-e git+https://example.com/x.git",
        "-r other.txt",
        "requests==2.31.0  # inline comment",
      ].join("\n"),
    );
    expect(manifest.dependencies).toEqual([
      { name: "requests", versionConstraint: "==2.31.0" },
    ]);
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
