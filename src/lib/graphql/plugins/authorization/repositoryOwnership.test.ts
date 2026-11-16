import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { repositoryPatchChangesOwnership } from "./repositoryOwnership";

describe("repositoryPatchChangesOwnership", () => {
  test("an ordinary edit does not change ownership", () => {
    expect(repositoryPatchChangesOwnership({ description: "x" })).toBe(false);
    expect(
      repositoryPatchChangesOwnership({ visibility: "private", name: "n" }),
    ).toBe(false);
    expect(repositoryPatchChangesOwnership(undefined)).toBe(false);
    expect(repositoryPatchChangesOwnership(null)).toBe(false);
  });

  test("moving into an organization, out of one, or to another user is a transfer", () => {
    expect(repositoryPatchChangesOwnership({ organizationId: "org-x" })).toBe(
      true,
    );
    expect(repositoryPatchChangesOwnership({ organizationId: null })).toBe(
      true,
    );
    expect(repositoryPatchChangesOwnership({ ownerId: "user-x" })).toBe(true);
  });
});

/**
 * The generated schema is the API surface, so assert on it directly: these are
 * the paths that let a caller put a repository in an organization they do not
 * hold a role in
 */
describe("generated schema", () => {
  const schema = readFileSync(
    join(import.meta.dir, "../../../../generated/graphql/schema.graphql"),
    "utf8",
  );

  test("exposes no mutation that writes organization membership", () => {
    expect(schema).not.toMatch(
      /^\s+(create|update|delete)OrganizationMember\(/m,
    );
  });

  test("RepositoryPatch cannot carry an owner or organization", () => {
    const patch = schema.match(/^input RepositoryPatch \{([^}]*)\}/m)?.[1];
    expect(patch).toBeDefined();
    expect(patch).not.toMatch(/\bownerId\b/);
    expect(patch).not.toMatch(/\borganizationId\b/);
  });

  test("the hidden raw createRepository stays hidden", () => {
    expect(schema).not.toMatch(/^\s+createRepository\(/m);
  });
});
