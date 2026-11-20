import { describe, expect, test } from "bun:test";

import {
  TRANSFER_ROLE_MESSAGE,
  transferWorkspaceRepository,
} from "./transferWorkspaceRepository";

import type { OrganizationClaim } from "@omnidotdev/providers";
import type { ResolvedUser } from "lib/auth/resolveUserFromToken";

/** Keystone's seeded service user (lib/auth/serviceUsers) */
const product = {
  id: "svc-keystone",
  identityProviderId: "17362f35-7ff9-44e3-9fd3-99ed4adf36d9",
};

const claim = (id: string, roles = ["owner"]): OrganizationClaim =>
  ({ id, name: id, slug: id, type: "team", roles, teams: [] }) as const;

const member = (
  orgs: OrganizationClaim[],
  user = { id: "user-bob", username: "bob" },
): ResolvedUser =>
  ({
    user,
    organizations: orgs,
    scope: { permission: "write", repositories: null },
  }) as unknown as ResolvedUser;

type Row = Record<string, unknown>;

/** A predicate built by a `where` callback, evaluated against plain rows */
type Pred = { col: string; val: unknown } | { all: Pred[] };
const ops = {
  eq: (col: string, val: unknown): Pred => ({ col, val }),
  and: (...all: Pred[]): Pred => ({ all }),
};
const columns = new Proxy({}, { get: (_t, key) => String(key) });
const matches = (row: Row, pred: Pred): boolean =>
  "all" in pred
    ? pred.all.every((p) => matches(row, p))
    : row[pred.col] === pred.val;

type Where = (table: unknown, o: typeof ops) => Pred;

interface World {
  organizations: Row[];
  repositories: Row[];
  writes: Array<{ op: string; table: string; values?: Row }>;
  failTransaction?: boolean;
}

const tableName = (table: unknown) =>
  String((table as Record<symbol, string>)[Symbol.for("drizzle:Name")] ?? "?");

const makeDb = (world: World) => {
  const find = (rows: Row[]) => ({
    findFirst: async (opts: {
      where: Where;
      with?: { collaborators?: { where: Where } };
    }) => {
      const row = rows.find((r) => matches(r, opts.where(columns, ops)));
      if (!row) return null;
      const collabWhere = opts.with?.collaborators?.where;
      return {
        ...row,
        collaborators: collabWhere
          ? ((row.collaborators as Row[]) ?? []).filter((c) =>
              matches(c, collabWhere(columns, ops)),
            )
          : row.collaborators,
      };
    },
    findMany: async (opts: { where: Where }) =>
      rows.filter((r) => matches(r, opts.where(columns, ops))),
  });
  const writer = (op: string) => (table: unknown) => {
    const record = (values?: Row) =>
      world.writes.push({ op, table: tableName(table), values });
    return {
      values: (values: Row) => {
        record(values);
        const chain = {
          returning: async () =>
            tableName(table) === "organization"
              ? world.organizations.some(
                  (o) => o.idpOrganizationId === values.idpOrganizationId,
                )
                ? []
                : [{ id: `org-${values.idpOrganizationId}`, slug: values.slug }]
              : [],
        };
        return {
          onConflictDoNothing: () => chain,
          onConflictDoUpdate: async () => undefined,
        };
      },
      set: (values: Row) => ({
        where: async () => {
          record(values);
        },
      }),
      where: async () => {
        record();
      },
    };
  };
  return {
    query: {
      organizationTable: find(world.organizations),
      repositoryTable: find(world.repositories),
    },
    insert: writer("insert"),
    transaction: async (fn: (tx: unknown) => Promise<void>) => {
      if (world.failTransaction) throw new Error("db down");
      await fn({
        update: writer("update"),
        delete: writer("delete"),
        insert: writer("insert"),
      });
    },
  } as unknown as Parameters<typeof transferWorkspaceRepository>[0]["db"];
};

const site = (overrides: Row = {}): Row => ({
  id: "repo-1",
  slug: "site-x",
  ownerId: "user-alice",
  organizationId: "org-a",
  visibility: "public",
  owner: { username: "alice" },
  collaborators: [{ userId: "svc-keystone", permission: "write" }],
  ...overrides,
});

const world = (overrides: Partial<World> = {}): World => ({
  organizations: [
    { id: "org-a", idpOrganizationId: "idp-a", slug: "a" },
    { id: "org-b", idpOrganizationId: "idp-b", slug: "b" },
  ],
  repositories: [site()],
  writes: [],
  ...overrides,
});

const input = {
  fromIdpOrganizationId: "idp-a",
  toIdpOrganizationId: "idp-b",
  slug: "site-x",
};

const run = (
  w: World,
  opts: {
    who?: ResolvedUser;
    observer?: typeof product | null;
    dryRun?: boolean;
    relocate?: (o: string, s: string, n: string) => Promise<boolean>;
  } = {},
) => {
  const moves: string[] = [];
  const result = transferWorkspaceRepository({
    observer: opts.observer === undefined ? product : opts.observer,
    memberToken: "member-token",
    input: { ...input, dryRun: opts.dryRun },
    db: makeDb(w),
    resolveMember: async () =>
      opts.who ?? member([claim("idp-a"), claim("idp-b", ["admin"])]),
    relocate:
      opts.relocate ??
      (async (owner, slug, newOwner) => {
        moves.push(`${owner}/${slug} -> ${newOwner}/${slug}`);
        return true;
      }),
    checkLimit: async () => true,
  });
  return { result, moves };
};

describe("transferWorkspaceRepository", () => {
  test("moves the repository, its storage, and keeps the old path", async () => {
    const w = world();
    const { result, moves } = run(w);
    const r = await result;

    expect(r.error).toBeNull();
    expect(r.ownerUsername).toBe("bob");
    expect(r.previousOwnerUsername).toBe("alice");
    expect(r.organizationSlug).toBe("b");
    expect(moves).toEqual(["alice/site-x -> bob/site-x"]);

    const update = w.writes.find((x) => x.op === "update");
    expect(update?.table).toBe("repository");
    expect(update?.values).toMatchObject({
      ownerId: "user-bob",
      organizationId: "org-b",
    });
    const redirect = w.writes.find(
      (x) => x.op === "insert" && x.table === "repository_redirect",
    );
    expect(redirect?.values).toEqual({
      ownerUsername: "alice",
      slug: "site-x",
      organizationId: "org-a",
      repositoryId: "repo-1",
    });
  });

  test("the same owner keeps its path: no storage move, no redirect", async () => {
    const w = world();
    const { result, moves } = run(w, {
      who: member([claim("idp-a"), claim("idp-b")], {
        id: "user-alice",
        username: "alice",
      }),
    });
    const r = await result;
    expect(r.error).toBeNull();
    expect(moves).toEqual([]);
    expect(w.writes.some((x) => x.table === "repository_redirect")).toBe(false);
  });

  test("takes an owner or admin of both workspaces", async () => {
    for (const orgs of [
      [claim("idp-a"), claim("idp-b", ["member"])],
      [claim("idp-a", ["member"]), claim("idp-b")],
    ]) {
      const w = world();
      const { result, moves } = run(w, { who: member(orgs) });
      expect((await result).error).toBe(TRANSFER_ROLE_MESSAGE);
      expect(moves).toEqual([]);
      expect(w.writes).toEqual([]);
    }
    const w = world();
    const { result } = run(w, { who: member([claim("idp-a")]) });
    expect((await result).error).toBe("Unauthorized");
  });

  test("only a first-party product moves, and only what it manages", async () => {
    expect((await run(world(), { observer: null }).result).error).toBe(
      "Unauthorized",
    );
    const w = world({ repositories: [site({ collaborators: [] })] });
    const { result, moves } = run(w);
    expect((await result).error).toBe("Repository not found");
    expect(moves).toEqual([]);
  });

  test("a dry run checks everything and changes nothing", async () => {
    const w = world();
    const { result, moves } = run(w, { dryRun: true });
    const r = await result;
    expect(r.error).toBeNull();
    expect(r.ownerUsername).toBe("bob");
    expect(moves).toEqual([]);
    expect(w.writes).toEqual([]);
  });

  test("resumes: a repository already in the target is done", async () => {
    const w = world({
      repositories: [
        site({ organizationId: "org-b", owner: { username: "bob" } }),
      ],
    });
    const { result, moves } = run(w);
    const r = await result;
    expect(r.error).toBeNull();
    expect(r.ownerUsername).toBe("bob");
    expect(moves).toEqual([]);
    expect(w.writes.some((x) => x.op === "update")).toBe(false);
  });

  test("refuses a name taken in the target, or on the member's own path", async () => {
    const taken = world({
      repositories: [
        site(),
        site({ id: "repo-2", organizationId: "org-b", collaborators: [] }),
      ],
    });
    expect((await run(taken).result).error).toContain("already exists");

    const ownPath = world({
      repositories: [
        site(),
        site({ id: "repo-3", organizationId: null, ownerId: "user-bob" }),
      ],
    });
    const { result, moves } = run(ownPath);
    expect((await result).error).toContain("already have a repository");
    expect(moves).toEqual([]);
  });

  test("a failed storage move changes nothing", async () => {
    const w = world();
    const { result } = run(w, { relocate: async () => false });
    expect((await result).error).toBe("Failed to move the repository");
    expect(w.writes.some((x) => x.op === "update")).toBe(false);
  });

  test("a failed write puts storage back", async () => {
    const w = world({ failTransaction: true });
    const { result, moves } = run(w);
    expect((await result).error).toBe("Failed to move the repository");
    expect(moves).toEqual([
      "alice/site-x -> bob/site-x",
      "bob/site-x -> alice/site-x",
    ]);
  });
});
