import { describe, expect, test } from "bun:test";

import { transferRepository } from "./transferRepository";
import { TRANSFER_ROLE_MESSAGE } from "./transferWorkspaceRepository";

import type { OrganizationClaim } from "@omnidotdev/providers";

const claim = (id: string, roles = ["owner"]): OrganizationClaim =>
  ({
    id,
    name: id,
    slug: `${id}-slug`,
    type: "team",
    roles,
    teams: [],
  }) as const;

type Row = Record<string, unknown>;

const tableName = (table: unknown) =>
  String((table as Record<symbol, string>)[Symbol.for("drizzle:Name")] ?? "?");

/**
 * Stub db: `repository` is the repository looked up by id (with its owner and
 * organization); other repository reads find nothing (no clash, slug free)
 */
const makeDb = (
  repository: Row | null,
  writes: Array<{ op: string; table: string; values?: Row }>,
) => {
  let repoReads = 0;
  const writer = (op: string) => (table: unknown) => ({
    values: (values: Row) => {
      writes.push({ op, table: tableName(table), values });
      return {
        onConflictDoNothing: () => ({
          returning: async () => [{ id: "org-b", slug: "b-slug" }],
        }),
        onConflictDoUpdate: async () => undefined,
      };
    },
    set: (values: Row) => ({
      where: async () => {
        writes.push({ op, table: tableName(table), values });
      },
    }),
    where: async () => {
      writes.push({ op, table: tableName(table) });
    },
  });
  return {
    query: {
      repositoryTable: {
        findFirst: async () => (repoReads++ === 0 ? repository : null),
        findMany: async () => [],
      },
      organizationTable: {
        findFirst: async () => ({ id: "org-b", slug: "b-slug" }),
      },
    },
    insert: writer("insert"),
    transaction: async (fn: (tx: unknown) => Promise<void>) =>
      fn({
        update: writer("update"),
        delete: writer("delete"),
        insert: writer("insert"),
      }),
  } as unknown as Parameters<typeof transferRepository>[0]["db"];
};

const orgRepo = (overrides: Row = {}): Row => ({
  id: "repo-1",
  slug: "site-x",
  ownerId: "user-alice",
  visibility: "public",
  owner: { username: "alice" },
  organization: { id: "org-a", idpOrganizationId: "idp-a" },
  ...overrides,
});

const run = (
  repository: Row | null,
  organizations: OrganizationClaim[],
  opts: { dryRun?: boolean; who?: { id: string; username: string } } = {},
) => {
  const writes: Array<{ op: string; table: string; values?: Row }> = [];
  const moves: string[] = [];
  const result = transferRepository({
    observer: opts.who ?? { id: "user-bob", username: "bob" },
    organizations,
    input: {
      rowId: "repo-1",
      toIdpOrganizationId: "idp-b",
      dryRun: opts.dryRun,
    },
    db: makeDb(repository, writes),
    relocate: async (owner, slug, newOwner) => {
      moves.push(`${owner}/${slug} -> ${newOwner}/${slug}`);
      return true;
    },
    checkLimit: async () => true,
  });
  return { result, writes, moves };
};

describe("transferRepository", () => {
  test("an owner or admin of both workspaces moves it and becomes its owner", async () => {
    const { result, writes, moves } = run(orgRepo(), [
      claim("idp-a", ["admin"]),
      claim("idp-b"),
    ]);
    const r = await result;

    expect(r.error).toBeNull();
    expect(r.ownerUsername).toBe("bob");
    expect(r.organizationSlug).toBe("b-slug");
    expect(moves).toEqual(["alice/site-x -> bob/site-x"]);
    expect(writes.find((w) => w.op === "update")?.values).toMatchObject({
      ownerId: "user-bob",
      organizationId: "org-b",
    });
    expect(
      writes.find((w) => w.op === "insert" && w.table === "repository_redirect")
        ?.values,
    ).toEqual({
      ownerUsername: "alice",
      slug: "site-x",
      organizationId: "org-a",
      repositoryId: "repo-1",
    });
  });

  test("a member without the role on either side cannot", async () => {
    for (const orgs of [
      [claim("idp-a", ["member"]), claim("idp-b")],
      [claim("idp-a"), claim("idp-b", ["member"])],
      [claim("idp-a")],
    ]) {
      const { result, writes, moves } = run(orgRepo(), orgs);
      expect((await result).error).toBe(TRANSFER_ROLE_MESSAGE);
      expect(writes).toEqual([]);
      expect(moves).toEqual([]);
    }
  });

  test("an outsider learns nothing about the repository", async () => {
    const { result } = run(orgRepo(), [claim("idp-b")]);
    expect((await result).error).toBe("Repository not found");
    expect((await run(null, [claim("idp-b")]).result).error).toBe(
      "Repository not found",
    );
  });

  test("a personal repository moves into a workspace for its owner only", async () => {
    const personal = orgRepo({
      organization: null,
      ownerId: "user-bob",
      owner: { username: "bob" },
    });
    const mine = run(personal, [claim("idp-b")]);
    const r = await mine.result;
    expect(r.error).toBeNull();
    // Same owner: the path stays, nothing moves on disk
    expect(mine.moves).toEqual([]);

    const theirs = run(personal, [claim("idp-b")], {
      who: { id: "user-eve", username: "eve" },
    });
    expect((await theirs.result).error).toBe("Repository not found");
  });

  test("a dry run checks everything and changes nothing", async () => {
    const { result, writes, moves } = run(
      orgRepo(),
      [claim("idp-a"), claim("idp-b")],
      { dryRun: true },
    );
    expect((await result).error).toBeNull();
    expect(writes).toEqual([]);
    expect(moves).toEqual([]);
  });

  test("moving into the workspace it is already in is refused", async () => {
    const { result } = run(
      orgRepo({ organization: { id: "org-b", idpOrganizationId: "idp-b" } }),
      [claim("idp-b")],
    );
    expect((await result).error).toBe(
      "The repository is already in that workspace",
    );
  });
});
