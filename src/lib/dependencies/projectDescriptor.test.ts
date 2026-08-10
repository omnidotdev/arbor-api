import { describe, expect, test } from "bun:test";

import {
  parseProjectDescriptor,
  resolveDescriptorProjectIds,
} from "./projectDescriptor";

describe("parseProjectDescriptor", () => {
  test("reads the declared project slugs", () => {
    expect(
      parseProjectDescriptor('{ "projects": ["platform", "shared-libs"] }'),
    ).toEqual(["platform", "shared-libs"]);
  });

  test("lowercases, trims, and de-duplicates slugs", () => {
    expect(
      parseProjectDescriptor('{ "projects": ["Platform", " platform ", "X"] }'),
    ).toEqual(["platform", "x"]);
  });

  test("ignores non-string entries", () => {
    expect(
      parseProjectDescriptor('{ "projects": ["a", 3, null, "b"] }'),
    ).toEqual(["a", "b"]);
  });

  test("returns nothing when projects is missing or not an array", () => {
    expect(parseProjectDescriptor('{ "name": "x" }')).toEqual([]);
    expect(parseProjectDescriptor('{ "projects": "platform" }')).toEqual([]);
  });

  test("throws on a descriptor that is not valid JSON", () => {
    expect(() => parseProjectDescriptor("not json {")).toThrow();
  });
});

describe("resolveDescriptorProjectIds", () => {
  const candidates = [
    { id: "p-platform", slug: "platform" },
    { id: "p-libs", slug: "shared-libs" },
  ];

  test("resolves declared slugs to the matching project ids", () => {
    expect(
      resolveDescriptorProjectIds(["platform", "shared-libs"], candidates),
    ).toEqual(["p-platform", "p-libs"]);
  });

  test("ignores a declared slug with no matching project", () => {
    expect(
      resolveDescriptorProjectIds(["platform", "ghost"], candidates),
    ).toEqual(["p-platform"]);
  });

  test("matches case-insensitively and de-duplicates", () => {
    expect(
      resolveDescriptorProjectIds(["PLATFORM", "platform"], candidates),
    ).toEqual(["p-platform"]);
  });
});
