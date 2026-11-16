import { describe, expect, test } from "bun:test";

import {
  createWorkspaceRepository,
  isFirstPartyServiceUser,
} from "./createWorkspaceRepository";

import type { OrganizationClaim } from "@omnidotdev/providers";
import type { ResolvedUser } from "lib/auth/resolveUserFromToken";
import type { createRepository } from "./createRepository";

/** Keystone's seeded service user (lib/auth/serviceUsers) */
const product = {
  id: "svc-local",
  identityProviderId: "17362f35-7ff9-44e3-9fd3-99ed4adf36d9",
};

const claim = (id: string, roles = ["member"]): OrganizationClaim =>
  ({ id, name: "Acme", slug: "acme", type: "team", roles, teams: [] }) as const;

const member = (orgs: OrganizationClaim[]): ResolvedUser =>
  ({
    user: { id: "member-1", username: "alice" },
    organizations: orgs,
    scope: { permission: "write", repositories: null },
  }) as unknown as ResolvedUser;

interface Recorded {
  inserts: Array<{ table: string; values: Record<string, unknown> }>;
}

/**
 * Stub db: `organization` is the existing org row (or null), `repository` an
 * existing workspace repository with the product's grant
 */
const makeDb = (opts: {
  organization?: { id: string; slug: string | null } | null;
  repository?: {
    id: string;
    slug: string;
    owner: { username: string };
    collaborators: { permission: string }[];
  } | null;
  recorded: Recorded;
}) => {
  const tableName = (table: unknown) =>
    String(
      (table as Record<symbol, string>)[Symbol.for("drizzle:Name")] ?? "?",
    );

  return {
    query: {
      organizationTable: {
        findFirst: async () => opts.organization ?? null,
      },
      repositoryTable: {
        findFirst: async () => opts.repository ?? null,
      },
    },
    insert: (table: unknown) => ({
      values: (values: Record<string, unknown>) => {
        opts.recorded.inserts.push({ table: tableName(table), values });
        const chain = {
          returning: async () => [{ id: "org-new", slug: "acme" }],
        };
        return {
          onConflictDoNothing: () => chain,
          onConflictDoUpdate: async () => undefined,
        };
      },
    }),
  } as unknown as Parameters<typeof createWorkspaceRepository>[0]["db"];
};

const input = {
  idpOrganizationId: "idp-acme",
  name: "site-1",
  slug: "site-1",
};

const okCreate = (async () => ({
  rowId: "repo-1",
  slug: "site-1",
  ownerUsername: "alice",
  organizationSlug: "acme",
  error: null,
})) as unknown as typeof createRepository;

describe("isFirstPartyServiceUser", () => {
  test("recognizes seeded service users only", () => {
    expect(isFirstPartyServiceUser(product)).toBe(true);
    expect(isFirstPartyServiceUser({ identityProviderId: "someone" })).toBe(
      false,
    );
    expect(isFirstPartyServiceUser(null)).toBe(false);
  });
});

describe("createWorkspaceRepository", () => {
  test("refuses a caller that is not a first-party product", async () => {
    const recorded: Recorded = { inserts: [] };
    const result = await createWorkspaceRepository({
      observer: { id: "u", identityProviderId: "someone" },
      memberToken: "t",
      input,
      db: makeDb({ recorded }),
      resolveMember: async () => member([claim("idp-acme")]),
      create: okCreate,
    });
    expect(result.error).toBe("Unauthorized");
    expect(recorded.inserts).toEqual([]);
  });

  test("refuses without a member token or a valid member", async () => {
    const recorded: Recorded = { inserts: [] };
    const base = {
      observer: product,
      input,
      db: makeDb({ recorded }),
      create: okCreate,
    };
    expect(
      (
        await createWorkspaceRepository({
          ...base,
          memberToken: null,
          resolveMember: async () => member([claim("idp-acme")]),
        })
      ).error,
    ).toMatch(/member token/);
    expect(
      (
        await createWorkspaceRepository({
          ...base,
          memberToken: "t",
          resolveMember: async () => null,
        })
      ).error,
    ).toBe("Unauthorized");
  });

  test("refuses a workspace the member does not belong to", async () => {
    const recorded: Recorded = { inserts: [] };
    const result = await createWorkspaceRepository({
      observer: product,
      memberToken: "t",
      input,
      db: makeDb({ recorded }),
      resolveMember: async () => member([claim("idp-other")]),
      create: okCreate,
    });
    expect(result.error).toBe("Unauthorized");
    expect(recorded.inserts).toEqual([]);
  });

  test("creates the repository as the member, owned by the workspace, and grants the product write", async () => {
    const recorded: Recorded = { inserts: [] };
    let createdWith: Parameters<typeof createRepository>[0] | undefined;
    const result = await createWorkspaceRepository({
      observer: product,
      memberToken: "t",
      input,
      db: makeDb({ organization: null, recorded }),
      resolveMember: async () => member([claim("idp-acme", ["owner"])]),
      create: (async (args: Parameters<typeof createRepository>[0]) => {
        createdWith = args;
        return okCreate(args);
      }) as typeof createRepository,
    });

    expect(result.error).toBeNull();
    expect(result.rowId).toBe("repo-1");
    // created by the member, in the workspace's (new) organization row
    expect(createdWith?.observer).toMatchObject({ id: "member-1" });
    expect(createdWith?.input.organizationId).toBe("org-new");
    expect(recorded.inserts.map((i) => i.table)).toEqual([
      "organization",
      "organization_member",
      "repository_collaborator",
    ]);
    expect(recorded.inserts[2]?.values).toEqual({
      repositoryId: "repo-1",
      userId: "svc-local",
      permission: "write",
    });
  });

  test("returns the existing repository the product already writes to", async () => {
    const recorded: Recorded = { inserts: [] };
    let created = false;
    const result = await createWorkspaceRepository({
      observer: product,
      memberToken: "t",
      input,
      db: makeDb({
        organization: { id: "org-1", slug: "acme" },
        repository: {
          id: "repo-9",
          slug: "site-1",
          owner: { username: "bob" },
          collaborators: [{ permission: "write" }],
        },
        recorded,
      }),
      resolveMember: async () => member([claim("idp-acme")]),
      create: (async () => {
        created = true;
        return okCreate({} as never);
      }) as unknown as typeof createRepository,
    });

    expect(created).toBe(false);
    expect(result).toMatchObject({
      rowId: "repo-9",
      ownerUsername: "bob",
      organizationSlug: "acme",
      error: null,
    });
  });

  test("never adopts a workspace repository the product was not granted", async () => {
    const recorded: Recorded = { inserts: [] };
    const result = await createWorkspaceRepository({
      observer: product,
      memberToken: "t",
      input,
      db: makeDb({
        organization: { id: "org-1", slug: "acme" },
        repository: {
          id: "repo-9",
          slug: "site-1",
          owner: { username: "bob" },
          collaborators: [{ permission: "read" }],
        },
        recorded,
      }),
      resolveMember: async () => member([claim("idp-acme")]),
      create: okCreate,
    });

    expect(result.error).toMatch(/already exists/);
    expect(
      recorded.inserts.some((i) => i.table === "repository_collaborator"),
    ).toBe(false);
  });
});
