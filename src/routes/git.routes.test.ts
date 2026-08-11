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

// Confine a scope to whole repositories (no ref/path limits)
const repos = (
  ids: string[],
): { repositoryId: string; refPatterns: null; pathPatterns: null }[] =>
  ids.map((repositoryId) => ({
    repositoryId,
    refPatterns: null,
    pathPatterns: null,
  }));

// Mutable test state controlling the stubbed boundary
const state: {
  repo: RepoSummary;
  canRead: boolean;
  canWrite: boolean;
  authedUser: { id: string } | null;
  scope: {
    permission: "read" | "write";
    repositories: ReturnType<typeof repos> | null;
  };
  // Default-branch HEAD before/after a push, to model whether it advanced
  headBefore: string;
  headAfter: string;
} = {
  repo: null,
  canRead: false,
  canWrite: false,
  authedUser: null,
  scope: { permission: "write", repositories: null },
  headBefore: "head-sha",
  headAfter: "head-sha",
};

// getHead is called twice per receive-pack (before, then after); alternate
let headCall = 0;

// Records auto-triggered dependency discovery and project sync so a push can assert
const discoverCalls: string[] = [];
const reconcileCalls: string[] = [];
// CloudEvents emitted during a request (a successful push emits one)
const emittedEvents: { type: string; data?: unknown }[] = [];

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
    getHead: async () =>
      headCall++ % 2 === 0 ? state.headBefore : state.headAfter,
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
  authenticateGitRequest: async () =>
    state.authedUser ? { user: state.authedUser, scope: state.scope } : null,
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

// mock.module registrations are global for the whole suite run, so this stub
// must expose every runtime export of lib/dependencies that any module links
// against (mcp/server and the graphql plugins import repositoryBlastRadius and
// the pure helpers), not only the one this file exercises
mock.module("lib/dependencies", () => ({
  discoverDependencies: async (args: { input: { repositoryId: string } }) => {
    discoverCalls.push(args.input.repositoryId);
    return { internalDependencies: 0, externalDependencies: 0, error: null };
  },
  reconcileProjectMembership: async (args: {
    input: { repositoryId: string };
  }) => {
    reconcileCalls.push(args.input.repositoryId);
    return { linkedProjects: 0, error: null };
  },
  repositoryBlastRadius: async () => [],
  computeBlastRadius: () => [],
  parseNpmManifest: () => ({ packageManager: "npm", dependencies: [] }),
  parseCargoManifest: () => ({ packageManager: "cargo", dependencies: [] }),
  parseGoManifest: () => ({ packageManager: "go", dependencies: [] }),
  parsePipManifest: () => ({ packageManager: "pip", dependencies: [] }),
  partitionDependencies: () => ({ internal: [], external: [] }),
  parseProjectDescriptor: () => [],
  resolveDescriptorProjectIds: () => [],
}));

mock.module("lib/entitlements", () => ({
  isWithinLimit: async () => true,
}));

// Capture emitted CloudEvents (a push emits arbor.repository.pushed). billing is
// exported by lib/providers too, so the whole-module stub must expose it
mock.module("lib/providers", () => ({
  default: {
    emit: async (event: { type: string; data?: unknown }) => {
      emittedEvents.push(event);
    },
  },
  billing: {},
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
  state.scope = { permission: "write", repositories: null };
  // Default: HEAD unchanged by a push, so discovery is not auto-triggered
  state.headBefore = "head-sha";
  state.headAfter = "head-sha";
  headCall = 0;
  discoverCalls.length = 0;
  reconcileCalls.length = 0;
  emittedEvents.length = 0;
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

  test("git-receive-pack emits arbor.repository.pushed on a successful push", async () => {
    state.repo = {
      id: "r1",
      visibility: "public",
      ownerId: "o1",
      organizationId: null,
    };
    state.authedUser = { id: "o1" };
    state.canWrite = true;
    // model the default branch advancing
    state.headBefore = "old-sha";
    state.headAfter = "new-sha";

    await makeApp().handle(
      new Request("http://localhost/git/alice/repo/git-receive-pack", {
        method: "POST",
        body: new Uint8Array([0]),
        headers: { authorization: "Bearer tok" },
      }),
    );

    const pushed = emittedEvents.find(
      (event) => event.type === "arbor.repository.pushed",
    );
    expect(pushed).toBeDefined();
    expect(pushed?.data).toMatchObject({
      repositoryId: "r1",
      owner: "alice",
      name: "repo",
      tip: "new-sha",
      advancedDefaultBranch: true,
    });
  });

  test("a push that advances the default branch auto-scans dependencies", async () => {
    state.repo = {
      id: "r1",
      visibility: "public",
      ownerId: "o1",
      organizationId: null,
    };
    state.authedUser = { id: "o1" };
    state.canWrite = true;
    // HEAD moved, so the default branch advanced
    state.headBefore = "old-sha";
    state.headAfter = "new-sha";

    const res = await makeApp().handle(
      new Request("http://localhost/git/alice/repo/git-receive-pack", {
        method: "POST",
        body: new Uint8Array([0]),
        headers: { authorization: "Bearer tok" },
      }),
    );

    expect(res.status).toBe(200);
    expect(discoverCalls).toEqual(["r1"]);
    expect(reconcileCalls).toEqual(["r1"]);
  });

  test("a push that does not move the default branch does not scan", async () => {
    state.repo = {
      id: "r1",
      visibility: "public",
      ownerId: "o1",
      organizationId: null,
    };
    state.authedUser = { id: "o1" };
    state.canWrite = true;
    // HEAD unchanged (e.g. a push to a feature branch)
    state.headBefore = "same-sha";
    state.headAfter = "same-sha";

    const res = await makeApp().handle(
      new Request("http://localhost/git/alice/repo/git-receive-pack", {
        method: "POST",
        body: new Uint8Array([0]),
        headers: { authorization: "Bearer tok" },
      }),
    );

    expect(res.status).toBe(200);
    expect(discoverCalls).toEqual([]);
    expect(reconcileCalls).toEqual([]);
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

describe("git routes token scope enforcement", () => {
  const repo = {
    id: "r1",
    visibility: "private" as const,
    ownerId: "o1",
    organizationId: null,
  };

  test("a token confined to another repository cannot read this one => 404", async () => {
    state.repo = repo;
    state.canRead = true;
    state.authedUser = { id: "o1" };
    // owner-level access, but the credential is confined elsewhere
    state.scope = { permission: "write", repositories: repos(["other-repo"]) };

    const res = await makeApp().handle(
      new Request(
        "http://localhost/git/alice/repo/info/refs?service=git-upload-pack",
        { headers: { authorization: "Bearer arbor_pat_x" } },
      ),
    );

    // same 404 as a nonexistent repo, so a confined token learns nothing
    expect(res.status).toBe(404);
  });

  test("a token confined to this repository can read it => 200", async () => {
    state.repo = repo;
    state.canRead = true;
    state.authedUser = { id: "o1" };
    state.scope = { permission: "read", repositories: repos(["r1"]) };

    const res = await makeApp().handle(
      new Request(
        "http://localhost/git/alice/repo/info/refs?service=git-upload-pack",
        { headers: { authorization: "Bearer arbor_pat_x" } },
      ),
    );

    expect(res.status).toBe(200);
  });

  test("a read-only token cannot push => 403", async () => {
    state.repo = repo;
    state.canWrite = true;
    state.authedUser = { id: "o1" };
    state.scope = { permission: "read", repositories: null };

    const res = await makeApp().handle(
      new Request("http://localhost/git/alice/repo/git-receive-pack", {
        method: "POST",
        body: new Uint8Array([0]),
        headers: { authorization: "Bearer arbor_pat_x" },
      }),
    );

    expect(res.status).toBe(403);
  });

  test("a read-only token can still fetch => 200", async () => {
    state.repo = repo;
    state.canRead = true;
    state.authedUser = { id: "o1" };
    state.scope = { permission: "read", repositories: null };

    const res = await makeApp().handle(
      new Request("http://localhost/git/alice/repo/git-upload-pack", {
        method: "POST",
        body: new Uint8Array([0]),
        headers: { authorization: "Bearer arbor_pat_x" },
      }),
    );

    expect(res.status).toBe(200);
  });

  test("a token confined elsewhere cannot push here => 403", async () => {
    state.repo = repo;
    state.canWrite = true;
    state.authedUser = { id: "o1" };
    state.scope = { permission: "write", repositories: repos(["other-repo"]) };

    const res = await makeApp().handle(
      new Request("http://localhost/git/alice/repo/git-receive-pack", {
        method: "POST",
        body: new Uint8Array([0]),
        headers: { authorization: "Bearer arbor_pat_x" },
      }),
    );

    expect(res.status).toBe(403);
  });

  test("the receive-pack advertisement is refused for a read-only token => 403", async () => {
    state.repo = repo;
    state.canWrite = true;
    state.authedUser = { id: "o1" };
    state.scope = { permission: "read", repositories: null };

    const res = await makeApp().handle(
      new Request(
        "http://localhost/git/alice/repo/info/refs?service=git-receive-pack",
        { headers: { authorization: "Bearer arbor_pat_x" } },
      ),
    );

    expect(res.status).toBe(403);
  });
});
