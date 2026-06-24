import { describe, expect, test } from "bun:test";

import {
  __setOrganizationsForUser,
  __setResolveUserFromTokenForTests,
  authenticateGitRequest,
  canReadRepository,
  canWriteRepository,
} from "./gitAccess";

import type { OrganizationClaim } from "@omnidotdev/providers";
import type { SelectUser } from "lib/db/schema";

/** Build a minimal user row for tests */
const makeUser = (overrides: Partial<SelectUser> = {}): SelectUser =>
  ({
    id: "user-1",
    identityProviderId: "idp-1",
    name: "Test User",
    username: "test",
    avatarUrl: null,
    email: "test@example.com",
    bio: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }) as SelectUser;

/** Build a minimal repo summary for tests */
const makeRepo = (
  overrides: Partial<{
    id: string;
    visibility: "public" | "private";
    ownerId: string;
    organizationId: string | null;
  }> = {},
) => ({
  id: "repo-1",
  visibility: "private" as "public" | "private",
  ownerId: "owner-1",
  organizationId: null as string | null,
  ...overrides,
});

/**
 * Build a stub db whose repositoryTable.findFirst returns the given
 * collaborators, and organizationTable.findFirst returns the given org.
 */
const makeDb = (opts: {
  collaborators?: Array<{ userId: string; permission: string }>;
  organization?: { id: string; idpOrganizationId: string } | null;
}) =>
  ({
    query: {
      repositoryTable: {
        findFirst: async (_args: unknown) => ({
          collaborators: opts.collaborators ?? [],
        }),
      },
      organizationTable: {
        findFirst: async (_args: unknown) => opts.organization ?? null,
      },
    },
  }) as unknown as Parameters<typeof canReadRepository>[2];

const orgClaim = (
  id: string,
  roles: string[] = ["member"],
): OrganizationClaim => ({
  id,
  name: "Org",
  slug: "org",
  type: "team",
  roles,
  teams: [],
});

describe("authenticateGitRequest", () => {
  test("returns null when no Authorization header is present", async () => {
    const req = new Request("http://localhost/git/foo/bar/info/refs");
    const user = await authenticateGitRequest(req);
    expect(user).toBeNull();
  });

  test("parses a Bearer token and resolves the user", async () => {
    const user = makeUser();
    let seenToken: string | null = null;
    __setResolveUserFromTokenForTests(async (token) => {
      seenToken = token;
      return { user, organizations: [] };
    });

    const req = new Request("http://localhost/git/foo/bar/info/refs", {
      headers: { authorization: "Bearer my-access-token" },
    });
    const result = await authenticateGitRequest(req);

    expect(seenToken as string | null).toBe("my-access-token");
    expect(result?.id).toBe(user.id);

    __setResolveUserFromTokenForTests(null);
  });

  test("parses a Basic auth password as the token (git CLI style)", async () => {
    const user = makeUser();
    let seenToken: string | null = null;
    __setResolveUserFromTokenForTests(async (token) => {
      seenToken = token;
      return { user, organizations: [] };
    });

    // git sends base64(username:password); password is the access token
    const basic = Buffer.from("git:my-access-token").toString("base64");
    const req = new Request("http://localhost/git/foo/bar/info/refs", {
      headers: { authorization: `Basic ${basic}` },
    });
    const result = await authenticateGitRequest(req);

    expect(seenToken as string | null).toBe("my-access-token");
    expect(result?.id).toBe(user.id);

    __setResolveUserFromTokenForTests(null);
  });

  test("returns null when the token is invalid", async () => {
    __setResolveUserFromTokenForTests(async () => null);

    const req = new Request("http://localhost/git/foo/bar/info/refs", {
      headers: { authorization: "Bearer bad-token" },
    });
    const result = await authenticateGitRequest(req);
    expect(result).toBeNull();

    __setResolveUserFromTokenForTests(null);
  });
});

describe("canReadRepository", () => {
  test("public repo is readable anonymously", async () => {
    const repo = makeRepo({ visibility: "public" });
    expect(await canReadRepository(null, repo, makeDb({}))).toBe(true);
  });

  test("private repo is NOT readable anonymously (fail closed)", async () => {
    const repo = makeRepo({ visibility: "private" });
    expect(await canReadRepository(null, repo, makeDb({}))).toBe(false);
  });

  test("private repo is readable by its owner", async () => {
    const user = makeUser({ id: "owner-1" });
    const repo = makeRepo({ visibility: "private", ownerId: "owner-1" });
    expect(await canReadRepository(user, repo, makeDb({}))).toBe(true);
  });

  test("private repo is readable by a collaborator (any role)", async () => {
    const user = makeUser({ id: "collab-1" });
    const repo = makeRepo({ visibility: "private", ownerId: "owner-1" });
    const db = makeDb({
      collaborators: [{ userId: "collab-1", permission: "read" }],
    });
    expect(await canReadRepository(user, repo, db)).toBe(true);
  });

  test("private org repo is readable by an org member", async () => {
    const user = makeUser({ id: "member-1" });
    __setOrganizationsForUser(user, [orgClaim("idp-org-1", ["member"])]);
    const repo = makeRepo({
      visibility: "private",
      ownerId: "owner-1",
      organizationId: "org-1",
    });
    const db = makeDb({
      organization: { id: "org-1", idpOrganizationId: "idp-org-1" },
    });
    expect(await canReadRepository(user, repo, db)).toBe(true);
  });

  test("private repo is NOT readable by an authenticated non-member (fail closed)", async () => {
    const user = makeUser({ id: "stranger-1" });
    const repo = makeRepo({ visibility: "private", ownerId: "owner-1" });
    expect(await canReadRepository(user, repo, makeDb({}))).toBe(false);
  });
});

describe("canWriteRepository", () => {
  test("never writable anonymously", async () => {
    const repo = makeRepo({ visibility: "public" });
    expect(await canWriteRepository(null, repo, makeDb({}))).toBe(false);
  });

  test("writable by the owner", async () => {
    const user = makeUser({ id: "owner-1" });
    const repo = makeRepo({ ownerId: "owner-1" });
    expect(await canWriteRepository(user, repo, makeDb({}))).toBe(true);
  });

  test("writable by a collaborator with write permission", async () => {
    const user = makeUser({ id: "collab-1" });
    const repo = makeRepo({ ownerId: "owner-1" });
    const db = makeDb({
      collaborators: [{ userId: "collab-1", permission: "write" }],
    });
    expect(await canWriteRepository(user, repo, db)).toBe(true);
  });

  test("writable by a collaborator with admin permission", async () => {
    const user = makeUser({ id: "collab-1" });
    const repo = makeRepo({ ownerId: "owner-1" });
    const db = makeDb({
      collaborators: [{ userId: "collab-1", permission: "admin" }],
    });
    expect(await canWriteRepository(user, repo, db)).toBe(true);
  });

  test("NOT writable by a read-only collaborator (fail closed)", async () => {
    const user = makeUser({ id: "collab-1" });
    const repo = makeRepo({ ownerId: "owner-1" });
    const db = makeDb({
      collaborators: [{ userId: "collab-1", permission: "read" }],
    });
    expect(await canWriteRepository(user, repo, db)).toBe(false);
  });

  test("writable by an org member with admin/owner role", async () => {
    const user = makeUser({ id: "member-1" });
    __setOrganizationsForUser(user, [orgClaim("idp-org-1", ["admin"])]);
    const repo = makeRepo({ ownerId: "owner-1", organizationId: "org-1" });
    const db = makeDb({
      organization: { id: "org-1", idpOrganizationId: "idp-org-1" },
    });
    expect(await canWriteRepository(user, repo, db)).toBe(true);
  });

  test("NOT writable by an org member with only member role (fail closed)", async () => {
    const user = makeUser({ id: "member-1" });
    __setOrganizationsForUser(user, [orgClaim("idp-org-1", ["member"])]);
    const repo = makeRepo({ ownerId: "owner-1", organizationId: "org-1" });
    const db = makeDb({
      organization: { id: "org-1", idpOrganizationId: "idp-org-1" },
    });
    expect(await canWriteRepository(user, repo, db)).toBe(false);
  });
});
