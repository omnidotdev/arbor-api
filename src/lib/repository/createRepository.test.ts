import { describe, expect, test } from "bun:test";

import { createRepository } from "./createRepository";

import type { OrganizationClaim } from "@omnidotdev/providers";

const orgClaim = (
  id: string,
  roles: string[] = ["member"],
): OrganizationClaim =>
  ({ id, name: "Org", slug: "org", type: "team", roles, teams: [] }) as const;

/**
 * Stub db. `organization` is the row returned for an organization lookup, and
 * `inserted` captures what the repository insert was given.
 */
const makeDb = (opts: {
  organization?: {
    id: string;
    idpOrganizationId: string;
    repositories: { visibility: string }[];
  } | null;
  insertFails?: boolean;
  captured?: { values?: Record<string, unknown>; deleted?: string[] };
}) => {
  const deleted: string[] = [];
  if (opts.captured) opts.captured.deleted = deleted;

  return {
    query: {
      organizationTable: {
        findFirst: async () => opts.organization ?? null,
      },
      repositoryTable: {
        findFirst: async () => ({
          id: "repo-1",
          slug: "my-repo",
          owner: { username: "alice" },
          organization: null,
        }),
      },
    },
    insert: () => ({
      values: (values: Record<string, unknown>) => {
        if (opts.captured) opts.captured.values = values;
        return {
          returning: async () =>
            opts.insertFails ? [] : [{ id: "repo-1", slug: values.slug }],
        };
      },
    }),
    delete: () => ({
      where: (arg: unknown) => {
        deleted.push(String(arg));
        return Promise.resolve();
      },
    }),
  } as unknown as Parameters<typeof createRepository>[0]["db"];
};

const baseInput = {
  name: "My Repo",
  slug: "my-repo",
  visibility: "public" as const,
};

describe("createRepository", () => {
  test("rejects an unauthenticated caller", async () => {
    const result = await createRepository({
      observer: null,
      organizations: [],
      input: baseInput,
      db: makeDb({}),
      initStorage: async () => true,
    });

    expect(result.error).toBe("Unauthorized");
  });

  test("creates a personal repository and initializes its storage", async () => {
    const captured: { values?: Record<string, unknown> } = {};
    const initialized: string[] = [];

    const result = await createRepository({
      observer: { id: "user-1" },
      organizations: [],
      input: baseInput,
      db: makeDb({ captured }),
      initStorage: async (owner, slug) => {
        initialized.push(owner, slug);
        return true;
      },
    });

    expect(result.error).toBeNull();
    expect(result.rowId).toBe("repo-1");
    // ownership is pinned to the observer, never taken from input
    expect(captured.values?.ownerId).toBe("user-1");
    expect(initialized).toEqual(["alice", "my-repo"]);
  });

  test("refuses an organization the caller is not a member of", async () => {
    const result = await createRepository({
      observer: { id: "user-1" },
      organizations: [orgClaim("idp-other")],
      input: { ...baseInput, organizationId: "org-1" },
      db: makeDb({
        organization: {
          id: "org-1",
          idpOrganizationId: "idp-org-1",
          repositories: [],
        },
      }),
      initStorage: async () => true,
    });

    expect(result.error).toBe("Unauthorized");
  });

  test("refuses a private repository over the plan limit", async () => {
    const result = await createRepository({
      observer: { id: "user-1" },
      organizations: [orgClaim("idp-org-1")],
      input: { ...baseInput, visibility: "private", organizationId: "org-1" },
      db: makeDb({
        organization: {
          id: "org-1",
          idpOrganizationId: "idp-org-1",
          repositories: [{ visibility: "private" }],
        },
      }),
      initStorage: async () => true,
      checkLimit: async () => false,
    });

    expect(result.error).toMatch(/private repositories/i);
  });

  test("a public repository does not count against the private limit", async () => {
    let limitChecked = false;

    const result = await createRepository({
      observer: { id: "user-1" },
      organizations: [orgClaim("idp-org-1")],
      input: { ...baseInput, visibility: "public", organizationId: "org-1" },
      db: makeDb({
        organization: {
          id: "org-1",
          idpOrganizationId: "idp-org-1",
          repositories: [],
        },
      }),
      initStorage: async () => true,
      checkLimit: async () => {
        limitChecked = true;
        return false;
      },
    });

    expect(limitChecked).toBe(false);
    expect(result.error).toBeNull();
  });

  test("removes the row when storage initialization fails", async () => {
    const captured: { values?: Record<string, unknown>; deleted?: string[] } =
      {};

    const result = await createRepository({
      observer: { id: "user-1" },
      organizations: [],
      input: baseInput,
      db: makeDb({ captured }),
      initStorage: async () => false,
    });

    expect(result.error).toMatch(/initialize/i);
    // without this the row survives with no storage behind it, and the slug
    // stays taken by a repository that can never be cloned
    expect(captured.deleted?.length).toBe(1);
  });
});
