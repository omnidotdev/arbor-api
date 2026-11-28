import { describe, expect, test } from "bun:test";

import { resolveStorageOwner } from "./storageOwner";

/** A db stub whose user lookup answers `username` and records the queried id */
const userDb = (username: string | null) => {
  const lookups: string[] = [];
  const db = {
    query: {
      userTable: {
        findFirst: async (args: {
          where: (
            table: { id: string },
            ops: { eq: (column: string, value: string) => string },
          ) => string;
        }) => {
          lookups.push(
            args.where({ id: "id" }, { eq: (_column, value) => value }),
          );
          return username ? { username } : undefined;
        },
      },
    },
  } as unknown as Parameters<typeof resolveStorageOwner>[1];
  return { db, lookups };
};

describe("resolveStorageOwner", () => {
  test("an organization repository is stored under its owner's username, not the org slug", async () => {
    const { db, lookups } = userDb(null);
    const owner = await resolveStorageOwner(
      {
        ownerId: "u1",
        owner: { username: "brian" },
        organization: { slug: "omni" },
      } as Parameters<typeof resolveStorageOwner>[0],
      db,
    );
    expect(owner).toBe("brian");
    expect(lookups).toEqual([]);
  });

  test("looks the owner up by id when the relation is not loaded, even with an organization", async () => {
    const { db, lookups } = userDb("brian");
    const owner = await resolveStorageOwner(
      { ownerId: "u1", organizationId: "org1" } as Parameters<
        typeof resolveStorageOwner
      >[0],
      db,
    );
    expect(owner).toBe("brian");
    expect(lookups).toEqual(["u1"]);
  });

  test("is null when no owner username can be found", async () => {
    expect(await resolveStorageOwner({ ownerId: "u1" }, userDb(null).db)).toBe(
      null,
    );
    expect(await resolveStorageOwner({}, userDb("x").db)).toBe(null);
  });
});
