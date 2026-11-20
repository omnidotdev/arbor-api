import { describe, expect, test } from "bun:test";

import { resolveMovedRepository } from "./resolveMovedRepository";

type Row = Record<string, unknown>;

/**
 * Stub db answering the resolver's three reads in order: the redirect (with
 * the repository it points at), whether a repository still lives at the old
 * path, and the caller's collaborator row
 */
const makeDb = (answers: {
  moved?: Row;
  stillThere?: boolean;
  collaborator?: boolean;
}) => {
  const queue: Row[][] = [
    answers.moved ? [answers.moved] : [],
    answers.stillThere ? [{ id: "other" }] : [],
    answers.collaborator ? [{ userId: "u1" }] : [],
  ];
  const chain = (): unknown =>
    new Proxy(
      {},
      {
        get: (_t, key) =>
          key === "limit" ? async () => queue.shift() ?? [] : () => chain(),
      },
    );
  return { select: () => chain() } as unknown as Parameters<
    typeof resolveMovedRepository
  >[0]["db"];
};

const moved = (overrides: Row = {}): Row => ({
  id: "repo-1",
  slug: "site-x",
  visibility: "private",
  ownerId: "owner-bob",
  ownerUsername: "bob",
  organizationSlug: "studio",
  organizationIdpId: "idp-studio",
  ...overrides,
});

const run = (
  db: ReturnType<typeof makeDb>,
  who: { id: string } | null = { id: "u1" },
  organizations: { id: string }[] = [],
) =>
  resolveMovedRepository({
    ownerSlug: "claude",
    repoSlug: "site-x",
    observer: who,
    organizations,
    db,
  });

describe("resolveMovedRepository", () => {
  test("nothing moved away from the path", async () => {
    expect(await run(makeDb({}))).toBeNull();
  });

  test("a repository still living at the path wins", async () => {
    expect(
      await run(
        makeDb({ moved: moved({ visibility: "public" }), stillThere: true }),
      ),
    ).toBeNull();
  });

  test("a member of the new workspace is sent there", async () => {
    expect(
      await run(makeDb({ moved: moved() }), { id: "u1" }, [
        { id: "idp-studio" },
      ]),
    ).toEqual({ ownerSlug: "studio", repoSlug: "site-x" });
  });

  test("the owner and collaborators are sent there", async () => {
    expect(await run(makeDb({ moved: moved() }), { id: "owner-bob" })).toEqual({
      ownerSlug: "studio",
      repoSlug: "site-x",
    });
    expect(await run(makeDb({ moved: moved(), collaborator: true }))).toEqual({
      ownerSlug: "studio",
      repoSlug: "site-x",
    });
  });

  test("a private repository reveals nothing to anyone else", async () => {
    expect(await run(makeDb({ moved: moved() }))).toBeNull();
    expect(await run(makeDb({ moved: moved() }), null)).toBeNull();
  });

  test("a public repository is found by anyone, a personal one at its owner", async () => {
    expect(
      await run(
        makeDb({
          moved: moved({ visibility: "public", organizationSlug: null }),
        }),
        null,
      ),
    ).toEqual({ ownerSlug: "bob", repoSlug: "site-x" });
  });
});
