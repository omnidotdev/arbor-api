import { describe, expect, test } from "bun:test";

import { UNRESTRICTED_SCOPE } from "lib/auth/tokenScope";
import {
  __setOrganizationsForUser,
  __setResolveUserFromPatForTests,
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

describe("authenticateGitRequest scope", () => {
  test("surfaces the resolved credential's scope alongside the user", async () => {
    const user = makeUser();
    __setResolveUserFromPatForTests(async () => ({
      user,
      organizations: [],
      scope: {
        permission: "read",
        repositories: [
          { repositoryId: "repo-1", refPatterns: null, pathPatterns: null },
        ],
      },
    }));

    const req = new Request("http://localhost/git/foo/bar/info/refs", {
      headers: { authorization: "Bearer arbor_pat_scoped" },
    });
    const result = await authenticateGitRequest(req);

    expect(result?.user.id).toBe(user.id);
    expect(result?.scope.permission).toBe("read");
    expect(result?.scope.repositories).toEqual([
      { repositoryId: "repo-1", refPatterns: null, pathPatterns: null },
    ]);

    __setResolveUserFromPatForTests(null);
  });

  test("surfaces the caller's organization claims", async () => {
    const user = makeUser();
    __setResolveUserFromPatForTests(async () => ({
      user,
      organizations: [orgClaim("idp-org-1", ["admin"])],
      scope: UNRESTRICTED_SCOPE,
    }));

    const req = new Request("http://localhost/git/foo/bar/info/refs", {
      headers: { authorization: "Bearer arbor_pat_org" },
    });
    const result = await authenticateGitRequest(req);

    // needed by callers that make membership decisions, e.g. creating a
    // repository inside an organization over MCP
    expect(result?.organizations.map((org) => org.id)).toEqual(["idp-org-1"]);

    __setResolveUserFromPatForTests(null);
  });

  test("an IDP session token carries unrestricted scope", async () => {
    const user = makeUser();
    __setResolveUserFromTokenForTests(async () => ({
      user,
      organizations: [],
      scope: { permission: "write", repositories: null },
    }));

    const req = new Request("http://localhost/git/foo/bar/info/refs", {
      headers: { authorization: "Bearer session-token" },
    });
    const result = await authenticateGitRequest(req);

    expect(result?.scope.permission).toBe("write");
    expect(result?.scope.repositories).toBeNull();

    __setResolveUserFromTokenForTests(null);
  });
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
      return { user, organizations: [], scope: UNRESTRICTED_SCOPE };
    });

    const req = new Request("http://localhost/git/foo/bar/info/refs", {
      headers: { authorization: "Bearer my-access-token" },
    });
    const result = await authenticateGitRequest(req);

    expect(seenToken as string | null).toBe("my-access-token");
    expect(result?.user.id).toBe(user.id);

    __setResolveUserFromTokenForTests(null);
  });

  test("parses a Basic auth password as the token (git CLI style)", async () => {
    const user = makeUser();
    let seenToken: string | null = null;
    __setResolveUserFromTokenForTests(async (token) => {
      seenToken = token;
      return { user, organizations: [], scope: UNRESTRICTED_SCOPE };
    });

    // git sends base64(username:password); password is the access token
    const basic = Buffer.from("git:my-access-token").toString("base64");
    const req = new Request("http://localhost/git/foo/bar/info/refs", {
      headers: { authorization: `Basic ${basic}` },
    });
    const result = await authenticateGitRequest(req);

    expect(seenToken as string | null).toBe("my-access-token");
    expect(result?.user.id).toBe(user.id);

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

  test("routes an arbor_pat_ token to the PAT resolver, not the JWT resolver", async () => {
    const patUser = makeUser({ id: "pat-user" });
    let patToken: string | null = null;
    let jwtCalled = false;
    __setResolveUserFromPatForTests(async (token) => {
      patToken = token;
      return { user: patUser, organizations: [], scope: UNRESTRICTED_SCOPE };
    });
    __setResolveUserFromTokenForTests(async () => {
      jwtCalled = true;
      return null;
    });

    // git sends the PAT as the Basic-auth password
    const basic = Buffer.from("test:arbor_pat_secret").toString("base64");
    const req = new Request("http://localhost/git/foo/bar/info/refs", {
      headers: { authorization: `Basic ${basic}` },
    });
    const result = await authenticateGitRequest(req);

    expect(patToken as string | null).toBe("arbor_pat_secret");
    expect(jwtCalled).toBe(false);
    expect(result?.user.id).toBe(patUser.id);

    __setResolveUserFromPatForTests(null);
    __setResolveUserFromTokenForTests(null);
  });

  test("routes a non-PAT token to the JWT resolver, not the PAT resolver", async () => {
    let patCalled = false;
    let jwtToken: string | null = null;
    const jwtUser = makeUser({ id: "jwt-user" });
    __setResolveUserFromPatForTests(async () => {
      patCalled = true;
      return null;
    });
    __setResolveUserFromTokenForTests(async (token) => {
      jwtToken = token;
      return { user: jwtUser, organizations: [], scope: UNRESTRICTED_SCOPE };
    });

    const req = new Request("http://localhost/git/foo/bar/info/refs", {
      headers: { authorization: "Bearer session-jwt" },
    });
    const result = await authenticateGitRequest(req);

    expect(jwtToken as string | null).toBe("session-jwt");
    expect(patCalled).toBe(false);
    expect(result?.user.id).toBe(jwtUser.id);

    __setResolveUserFromPatForTests(null);
    __setResolveUserFromTokenForTests(null);
  });

  test("returns null when a PAT does not resolve", async () => {
    __setResolveUserFromPatForTests(async () => null);

    const basic = Buffer.from("test:arbor_pat_bad").toString("base64");
    const req = new Request("http://localhost/git/foo/bar/info/refs", {
      headers: { authorization: `Basic ${basic}` },
    });
    const result = await authenticateGitRequest(req);
    expect(result).toBeNull();

    __setResolveUserFromPatForTests(null);
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
