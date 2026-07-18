import { beforeEach, describe, expect, mock, test } from "bun:test";

/**
 * Route-level authorization tests for the Smart-HTTP git endpoints.
 *
 * These verify the visibility / authentication / authorization gating
 * (no info leak for private repos, 401/403 for writes) without a live
 * IDP or database. The git protocol services and access checks are
 * stubbed at the `lib/git` module boundary.
 */

type RepoSummary = {
  id: string;
  visibility: "public" | "private";
  ownerId: string;
  organizationId: string | null;
} | null;

// Mutable test state controlling the stubbed boundary
const state: {
  repo: RepoSummary;
  canRead: boolean;
  canWrite: boolean;
  authedUser: { id: string } | null;
} = {
  repo: null,
  canRead: false,
  canWrite: false,
  authedUser: null,
};

const noopResult = { success: true, data: new Uint8Array([1, 2, 3]) };

mock.module("lib/git", () => ({
  repositoryService: {
    exists: async () => state.repo !== null,
  },
  gitService: {
    listBranches: async () => [{ name: "master" }],
    getLog: async () => [],
    getTree: async () => [],
    getFileContent: async () => "content",
    getFileRaw: async () => Buffer.from("content"),
  },
  advertiseRefs: async () => noopResult,
  uploadPack: async () => noopResult,
  receivePack: async () => noopResult,
  getServiceContentType: () => "application/x-git-upload-pack-advertisement",
  getServiceResultContentType: () => "application/x-git-upload-pack-result",
  parseGitService: (s?: string) =>
    s === "git-upload-pack" || s === "git-receive-pack" ? s : null,
  // git access boundary
  resolveRepositorySummary: async () => state.repo,
  authenticateGitRequest: async () => state.authedUser,
  canReadRepository: async () => state.canRead,
  canWriteRepository: async () => state.canWrite,
}));

// NB: mock.module registrations are global and the first registration for a
// module wins for the whole suite run, so this stub must expose every
// storage.config export any module links against (e.g. repository.service),
// not only the two this file uses
mock.module("lib/git/storage.config", () => ({
  gitStorageConfig: {
    repositoriesPath: "/var/lib/arbor/repos",
    maxRepoSize: 0,
    defaultBranch: "master",
  },
  getRepositoryPath: (owner: string, repo: string) =>
    `/var/lib/arbor/repos/${owner}/${repo}.git`,
  ensureReposDirectory: async () => {},
  ensureOwnerDirectory: async () => {},
  getRepositorySize: async () => 0,
  getOrganizationStorageBytes: async () => 0,
  invalidateRepositorySizeCache: () => {},
}));

mock.module("lib/entitlements", () => ({
  isWithinLimit: async () => true,
}));

mock.module("lib/db/db", () => ({
  dbPool: {},
}));

mock.module("lib/graphql/plugins/authorization/constants", () => ({
  FEATURE_KEYS: { MAX_STORAGE_BYTES: "max_storage_bytes" },
  billingBypassOrgIds: [],
}));

// Import AFTER mocks are registered
const { Elysia } = await import("elysia");
const gitRoutes = (await import("./git.routes")).default;

const makeApp = () => new Elysia().use(gitRoutes);

const reset = () => {
  state.repo = null;
  state.canRead = false;
  state.canWrite = false;
  state.authedUser = null;
};

beforeEach(reset);

describe("git routes read authorization", () => {
  test("public repo read is allowed anonymously => 200", async () => {
    state.repo = {
      id: "r1",
      visibility: "public",
      ownerId: "o1",
      organizationId: null,
    };
    state.canRead = true;

    const res = await makeApp().handle(
      new Request("http://localhost/git/alice/repo/branches"),
    );
    expect(res.status).toBe(200);
  });

  test("private repo read is 404 for anonymous (no info leak)", async () => {
    state.repo = {
      id: "r1",
      visibility: "private",
      ownerId: "o1",
      organizationId: null,
    };
    state.canRead = false;
    state.authedUser = null;

    const res = await makeApp().handle(
      new Request("http://localhost/git/alice/repo/branches"),
    );
    expect(res.status).toBe(404);
  });

  test("private repo read is 200 for the owner", async () => {
    state.repo = {
      id: "r1",
      visibility: "private",
      ownerId: "o1",
      organizationId: null,
    };
    state.authedUser = { id: "o1" };
    state.canRead = true;

    const res = await makeApp().handle(
      new Request("http://localhost/git/alice/repo/branches", {
        headers: { authorization: "Bearer tok" },
      }),
    );
    expect(res.status).toBe(200);
  });

  test("private repo read is 404 for authenticated non-member (no info leak)", async () => {
    state.repo = {
      id: "r1",
      visibility: "private",
      ownerId: "o1",
      organizationId: null,
    };
    state.authedUser = { id: "stranger" };
    state.canRead = false;

    const res = await makeApp().handle(
      new Request("http://localhost/git/alice/repo/branches", {
        headers: { authorization: "Bearer tok" },
      }),
    );
    expect(res.status).toBe(404);
  });

  test("private repo upload-pack info/refs is 404 for anonymous", async () => {
    state.repo = {
      id: "r1",
      visibility: "private",
      ownerId: "o1",
      organizationId: null,
    };
    state.canRead = false;

    const res = await makeApp().handle(
      new Request(
        "http://localhost/git/alice/repo/info/refs?service=git-upload-pack",
      ),
    );
    expect(res.status).toBe(404);
  });
});

describe("git routes write authorization", () => {
  test("receive-pack info/refs anonymous => 401 with WWW-Authenticate", async () => {
    state.repo = {
      id: "r1",
      visibility: "public",
      ownerId: "o1",
      organizationId: null,
    };
    state.authedUser = null;
    state.canWrite = false;

    const res = await makeApp().handle(
      new Request(
        "http://localhost/git/alice/repo/info/refs?service=git-receive-pack",
      ),
    );
    expect(res.status).toBe(401);
    expect(res.headers.get("WWW-Authenticate")).toBe('Basic realm="Arbor"');
  });

  test("git-receive-pack anonymous => 401 with WWW-Authenticate", async () => {
    state.repo = {
      id: "r1",
      visibility: "public",
      ownerId: "o1",
      organizationId: null,
    };
    state.authedUser = null;
    state.canWrite = false;

    const res = await makeApp().handle(
      new Request("http://localhost/git/alice/repo/git-receive-pack", {
        method: "POST",
        body: new Uint8Array([0]),
      }),
    );
    expect(res.status).toBe(401);
    expect(res.headers.get("WWW-Authenticate")).toBe('Basic realm="Arbor"');
  });

  test("git-receive-pack authenticated non-writer => 403", async () => {
    state.repo = {
      id: "r1",
      visibility: "public",
      ownerId: "o1",
      organizationId: null,
    };
    state.authedUser = { id: "reader" };
    state.canWrite = false;

    const res = await makeApp().handle(
      new Request("http://localhost/git/alice/repo/git-receive-pack", {
        method: "POST",
        body: new Uint8Array([0]),
        headers: { authorization: "Bearer tok" },
      }),
    );
    expect(res.status).toBe(403);
  });

  test("git-receive-pack owner/writer => proceeds (200)", async () => {
    state.repo = {
      id: "r1",
      visibility: "public",
      ownerId: "o1",
      organizationId: null,
    };
    state.authedUser = { id: "o1" };
    state.canWrite = true;

    const res = await makeApp().handle(
      new Request("http://localhost/git/alice/repo/git-receive-pack", {
        method: "POST",
        body: new Uint8Array([0]),
        headers: { authorization: "Bearer tok" },
      }),
    );
    expect(res.status).toBe(200);
  });

  test("private repo receive-pack anonymous => 401 (write check precedes read masking)", async () => {
    state.repo = {
      id: "r1",
      visibility: "private",
      ownerId: "o1",
      organizationId: null,
    };
    state.authedUser = null;
    state.canWrite = false;

    const res = await makeApp().handle(
      new Request("http://localhost/git/alice/repo/git-receive-pack", {
        method: "POST",
        body: new Uint8Array([0]),
      }),
    );
    expect(res.status).toBe(401);
  });
});
