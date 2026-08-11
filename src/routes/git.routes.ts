import { Elysia, t } from "elysia";

import {
  scopeAllowsRepository,
  scopeAllowsWrite,
  scopeBoundsForRepository,
} from "lib/auth/tokenScope";
import { dbPool } from "lib/db/db";
import {
  discoverDependencies,
  reconcileProjectMembership,
} from "lib/dependencies";
import { isWithinLimit } from "lib/entitlements";
import {
  advertiseRefs,
  authenticateGitRequest,
  canReadRepository,
  canWriteRepository,
  getServiceContentType,
  getServiceResultContentType,
  gitService,
  parseGitService,
  receivePack,
  resolveRepositorySummary,
  uploadPack,
} from "lib/git";
import {
  getOrganizationStorageBytes,
  invalidateRepositorySizeCache,
} from "lib/git/storage.config";
import {
  FEATURE_KEYS,
  billingBypassOrgIds,
} from "lib/graphql/plugins/authorization/constants";

import type { AuthenticatedGitCaller } from "lib/git";

/** WWW-Authenticate header value prompting the git CLI for credentials */
const GIT_AUTH_REALM = 'Basic realm="Arbor"';

/** Standard 404 body, identical for missing and access-denied private repos */
const NOT_FOUND = { error: "Repository not found" } as const;

/** Minimal shape of Elysia's `set` used by the access gates */
interface GitSet {
  status?: number | string;
  headers: Record<string, string | number>;
}

/**
 * Outcome of a read-access gate. When `authorized` is false, the handler must
 * return the provided body (and the status has already been set).
 */
type ReadGate =
  | {
      authorized: true;
      repository: Awaited<ReturnType<typeof resolveRepositorySummary>>;
    }
  | { authorized: false; body: typeof NOT_FOUND };

/**
 * Gate a READ endpoint.
 *
 * Resolves the repository row, authenticates the caller, and enforces
 * `canReadRepository`. For private repos the caller lacks access to (or that
 * do not exist) the response is 404 with no information leak.
 */
const gateRead = async (
  owner: string,
  repo: string,
  request: Request,
  set: GitSet,
): Promise<ReadGate> => {
  const repository = await resolveRepositorySummary(owner, repo);

  if (!repository) {
    set.status = 404;
    return { authorized: false, body: NOT_FOUND };
  }

  const caller = await authenticateGitRequest(request);

  // A credential confined to other repositories is treated exactly like one
  // with no access at all, so a scoped token cannot probe for what exists
  if (caller && !scopeAllowsRepository(caller.scope, repository.id)) {
    set.status = 404;
    return { authorized: false, body: NOT_FOUND };
  }

  if (!(await canReadRepository(caller?.user ?? null, repository))) {
    // Do not reveal existence of private repos
    set.status = 404;
    return { authorized: false, body: NOT_FOUND };
  }

  return { authorized: true, repository };
};

/**
 * Outcome of a write-access gate.
 */
type WriteGate =
  | {
      authorized: true;
      repository: NonNullable<
        Awaited<ReturnType<typeof resolveRepositorySummary>>
      >;
      /** The authenticated caller, carried so the push can read its scope bounds */
      caller: AuthenticatedGitCaller;
    }
  | { authorized: false; body: { error: string } };

/**
 * Gate a WRITE endpoint.
 *
 * Requires valid credentials (401 with `WWW-Authenticate` otherwise so the git
 * CLI prompts) and write access (403 when authenticated but insufficient).
 * A nonexistent repository returns 404.
 */
const gateWrite = async (
  owner: string,
  repo: string,
  request: Request,
  set: GitSet,
): Promise<WriteGate> => {
  const repository = await resolveRepositorySummary(owner, repo);

  if (!repository) {
    set.status = 404;
    return { authorized: false, body: NOT_FOUND };
  }

  const caller = await authenticateGitRequest(request);

  if (!caller) {
    set.status = 401;
    set.headers["WWW-Authenticate"] = GIT_AUTH_REALM;
    return { authorized: false, body: { error: "Authentication required" } };
  }

  // The credential's own limits are checked before the user's permissions: a
  // read-only or differently-confined token is refused even when its owner
  // could write here. 403 rather than 404 because the caller already proved
  // they hold a valid credential for this account
  if (!scopeAllowsWrite(caller.scope)) {
    set.status = 403;
    return {
      authorized: false,
      body: { error: "This token is read-only" },
    };
  }

  if (!scopeAllowsRepository(caller.scope, repository.id)) {
    set.status = 403;
    return {
      authorized: false,
      body: { error: "This token is not authorized for this repository" },
    };
  }

  if (!(await canWriteRepository(caller.user, repository))) {
    set.status = 403;
    return {
      authorized: false,
      body: { error: "You do not have write access to this repository" },
    };
  }

  return { authorized: true, repository, caller };
};

/**
 * Git REST API routes.
 *
 * Only binary/protocol endpoints that cannot be served via GraphQL:
 * - Git Smart HTTP protocol (clone/fetch/push)
 * - Raw file downloads (binary content with proper MIME types)
 *
 * All other git operations (browsing, commits, branches, tags) are
 * available via GraphQL on the Repository type.
 */
const gitRoutes = new Elysia({ prefix: "/git" })
  // ============================================================
  // Repository Browsing API
  // ============================================================

  /**
   * List branches for a repository.
   * GET /:owner/:repo/branches
   */
  .get(
    "/:owner/:repo/branches",
    async ({ params, request, set }) => {
      const { owner, repo } = params;

      const gate = await gateRead(owner, repo, request, set);
      if (!gate.authorized) return gate.body;

      const branches = await gitService.listBranches(owner, repo);
      return branches;
    },
    {
      params: t.Object({
        owner: t.String(),
        repo: t.String(),
      }),
    },
  )

  /**
   * Get commit log for a ref.
   * GET /:owner/:repo/commits/:ref
   */
  .get(
    "/:owner/:repo/commits/:ref",
    async ({ params, query, request, set }) => {
      const { owner, repo, ref } = params;
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 100);
      const skip = (page - 1) * limit;

      const gate = await gateRead(owner, repo, request, set);
      if (!gate.authorized) return gate.body;

      const commits = await gitService.getLog(owner, repo, ref, {
        depth: limit,
        skip,
      });

      return commits;
    },
    {
      params: t.Object({
        owner: t.String(),
        repo: t.String(),
        ref: t.String(),
      }),
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    },
  )

  /**
   * Get tree (directory listing) at a ref and optional path.
   * GET /:owner/:repo/tree/:ref
   * GET /:owner/:repo/tree/:ref/*
   */
  .get(
    "/:owner/:repo/tree/:ref",
    async ({ params, request, set }) => {
      const { owner, repo, ref } = params;

      const gate = await gateRead(owner, repo, request, set);
      if (!gate.authorized) return gate.body;

      const tree = await gitService.getTree(owner, repo, ref, "");
      return tree;
    },
    {
      params: t.Object({
        owner: t.String(),
        repo: t.String(),
        ref: t.String(),
      }),
    },
  )

  .get(
    "/:owner/:repo/tree/:ref/*",
    async ({ params, request, set }) => {
      const { owner, repo, ref } = params;
      const path = params["*"] || "";

      const gate = await gateRead(owner, repo, request, set);
      if (!gate.authorized) return gate.body;

      const tree = await gitService.getTree(owner, repo, ref, path);
      return tree;
    },
    {
      params: t.Object({
        owner: t.String(),
        repo: t.String(),
        ref: t.String(),
        "*": t.String(),
      }),
    },
  )

  /**
   * Get the last commit that touched each tree entry at a ref and optional path.
   * GET /:owner/:repo/tree-commits/:ref
   * GET /:owner/:repo/tree-commits/:ref/*
   */
  .get(
    "/:owner/:repo/tree-commits/:ref",
    async ({ params, request, set }) => {
      const { owner, repo, ref } = params;

      const gate = await gateRead(owner, repo, request, set);
      if (!gate.authorized) return gate.body;

      const commits = await gitService.getTreeLastCommits(owner, repo, ref, "");
      return commits;
    },
    {
      params: t.Object({
        owner: t.String(),
        repo: t.String(),
        ref: t.String(),
      }),
    },
  )

  .get(
    "/:owner/:repo/tree-commits/:ref/*",
    async ({ params, request, set }) => {
      const { owner, repo, ref } = params;
      const path = params["*"] || "";

      const gate = await gateRead(owner, repo, request, set);
      if (!gate.authorized) return gate.body;

      const commits = await gitService.getTreeLastCommits(
        owner,
        repo,
        ref,
        path,
      );
      return commits;
    },
    {
      params: t.Object({
        owner: t.String(),
        repo: t.String(),
        ref: t.String(),
        "*": t.String(),
      }),
    },
  )

  /**
   * Get blob (file content) at a ref and path.
   * GET /:owner/:repo/blob/:ref/*
   */
  .get(
    "/:owner/:repo/blob/:ref/*",
    async ({ params, request, set }) => {
      const { owner, repo, ref } = params;
      const path = params["*"] || "";

      if (!path) {
        set.status = 400;
        return { error: "Path is required" };
      }

      const gate = await gateRead(owner, repo, request, set);
      if (!gate.authorized) return gate.body;

      const content = await gitService.getFileContent(owner, repo, ref, path);
      const raw = await gitService.getFileRaw(owner, repo, ref, path);

      if (content === null && raw === null) {
        set.status = 404;
        return { error: "File not found" };
      }

      const isBinary = content === null && raw !== null;

      return {
        content: isBinary ? null : content,
        encoding: isBinary ? "base64" : "utf-8",
        size: raw?.length ?? 0,
        isBinary,
      };
    },
    {
      params: t.Object({
        owner: t.String(),
        repo: t.String(),
        ref: t.String(),
        "*": t.String(),
      }),
    },
  )

  // ============================================================
  // Raw File Downloads (Binary)
  // ============================================================

  /**
   * Get raw file content (for download).
   * Returns binary data with appropriate Content-Type header.
   */
  .get(
    "/:owner/:repo/raw/:ref/*",
    async ({ params, request, set }) => {
      const { owner, repo, ref } = params;
      const path = params["*"] || "";

      const gate = await gateRead(owner, repo, request, set);
      if (!gate.authorized) return gate.body;

      // Resolve `ref` as a commit ref plus path first; fall back to treating it
      // as a blob oid directly (diff image bytes are addressed by blob oid, and
      // the path segment is only carried for content-type detection)
      const content =
        (await gitService.getFileRaw(owner, repo, ref, path)) ??
        (await gitService.getBlobRawByOid(owner, repo, ref));

      if (content === null) {
        set.status = 404;
        return { error: "File not found" };
      }

      // Determine content type from file extension
      const ext = path.split(".").pop()?.toLowerCase();
      const contentType = getContentType(ext);

      set.headers["content-type"] = contentType;
      set.headers["content-disposition"] =
        `inline; filename="${path.split("/").pop()}"`;

      return new Response(new Uint8Array(content));
    },
    {
      params: t.Object({
        owner: t.String(),
        repo: t.String(),
        ref: t.String(),
        "*": t.String(),
      }),
    },
  )

  // ============================================================
  // Git Smart HTTP Protocol
  // ============================================================

  /**
   * Advertise refs - used by git clone/fetch/pull/push to discover refs.
   * GET /:owner/:repo/info/refs?service=git-upload-pack
   * GET /:owner/:repo/info/refs?service=git-receive-pack
   *
   * Note: Git clients typically use .git suffix in URL but we handle
   * both with and without for flexibility.
   */
  .get(
    "/:owner/:repo/info/refs",
    async ({ params, query, request, set }) => {
      const { owner } = params;
      // Remove .git suffix if present
      const repo = params.repo.replace(/\.git$/, "");
      const service = parseGitService(query.service);

      if (!service) {
        set.status = 400;
        return { error: "Invalid or missing service parameter" };
      }

      // git-receive-pack advertisement precedes a push, so it requires write
      // access; git-upload-pack advertisement precedes a fetch/clone (read)
      if (service === "git-receive-pack") {
        const gate = await gateWrite(owner, repo, request, set);
        if (!gate.authorized) return gate.body;
      } else {
        const gate = await gateRead(owner, repo, request, set);
        if (!gate.authorized) return gate.body;
      }

      const result = await advertiseRefs(owner, repo, service);

      if (!result.success) {
        set.status = 500;
        return { error: "Failed to advertise refs" };
      }

      set.headers["content-type"] = getServiceContentType(service);
      set.headers["cache-control"] = "no-cache";

      return new Response(new Uint8Array(result.data));
    },
    {
      params: t.Object({
        owner: t.String(),
        repo: t.String(),
      }),
      query: t.Object({
        service: t.Optional(t.String()),
      }),
    },
  )

  /**
   * git-upload-pack - used by git clone/fetch/pull.
   * POST /:owner/:repo/git-upload-pack
   */
  .post(
    "/:owner/:repo/git-upload-pack",
    async ({ params, request, set }) => {
      const { owner } = params;
      const repo = params.repo.replace(/\.git$/, "");

      const gate = await gateRead(owner, repo, request, set);
      if (!gate.authorized) return gate.body;

      const body = Buffer.from(await request.arrayBuffer());
      const result = await uploadPack(owner, repo, body);

      if (!result.success) {
        set.status = 500;
        return { error: "Upload pack failed" };
      }

      set.headers["content-type"] =
        getServiceResultContentType("git-upload-pack");
      set.headers["cache-control"] = "no-cache";

      return new Response(new Uint8Array(result.data));
    },
    {
      params: t.Object({
        owner: t.String(),
        repo: t.String(),
      }),
    },
  )

  /**
   * git-receive-pack - used by git push.
   * POST /:owner/:repo/git-receive-pack
   *
   * Enforces `max_storage_bytes` entitlement for organization repos
   * before accepting the push.
   */
  .post(
    "/:owner/:repo/git-receive-pack",
    async ({ params, request, set }) => {
      const { owner } = params;
      const repo = params.repo.replace(/\.git$/, "");

      // Write authorization runs BEFORE the storage-limit check
      const gate = await gateWrite(owner, repo, request, set);
      if (!gate.authorized) return gate.body;

      const repository = gate.repository;

      // Check storage limits for organization repos
      if (repository.organizationId) {
        const currentBytes = await getOrganizationStorageBytes(
          repository.organizationId,
          dbPool,
        );

        const withinLimit = await isWithinLimit(
          { organizationId: repository.organizationId },
          FEATURE_KEYS.MAX_STORAGE_BYTES,
          currentBytes,
          billingBypassOrgIds,
        );

        if (!withinLimit) {
          set.status = 403;
          return {
            error:
              "Storage limit exceeded for your plan. Upgrade to push more data",
          };
        }
      }

      // Enforce the credential's ref/path bounds against the actual pushed
      // objects via the pre-receive hook. Null bounds (unconfined, or confined
      // only at repository level) leaves the push exactly as before
      const bounds = scopeBoundsForRepository(gate.caller.scope, repository.id);

      // The default branch tip before the push, to detect whether this push
      // advanced it (HEAD resolves through the default branch to a commit)
      const headBefore = await gitService
        .getHead(owner, repo)
        .catch(() => null);

      const body = Buffer.from(await request.arrayBuffer());
      const result = await receivePack(
        owner,
        repo,
        body,
        bounds,
        gate.caller.user.id,
      );

      if (!result.success) {
        set.status = 500;
        return { error: "Receive pack failed" };
      }

      // Invalidate size cache after successful push
      invalidateRepositorySizeCache(owner, repo);

      // Keep the graph self-maintaining: when a push advances the default
      // branch, re-scan the repository's manifests and its project descriptor.
      // Both are best-effort and fire-and-forget, so they never delay or fail
      // the push, and each re-checks write access
      const headAfter = await gitService.getHead(owner, repo).catch(() => null);
      if (headAfter && headAfter !== headBefore) {
        void discoverDependencies({
          observer: { id: gate.caller.user.id },
          db: dbPool,
          input: { repositoryId: repository.id },
        }).catch((error) =>
          console.error("[git] auto dependency discovery failed:", error),
        );
        void reconcileProjectMembership({
          observer: { id: gate.caller.user.id },
          db: dbPool,
          input: { repositoryId: repository.id },
        }).catch((error) =>
          console.error("[git] auto project membership sync failed:", error),
        );
      }

      set.headers["content-type"] =
        getServiceResultContentType("git-receive-pack");
      set.headers["cache-control"] = "no-cache";

      return new Response(new Uint8Array(result.data));
    },
    {
      params: t.Object({
        owner: t.String(),
        repo: t.String(),
      }),
    },
  );

/**
 * Get content type for a file extension.
 */
const DEFAULT_CONTENT_TYPE = "application/octet-stream";

function getContentType(ext?: string): string {
  const contentTypes: Record<string, string> = {
    // Text
    txt: "text/plain",
    md: "text/markdown",
    html: "text/html",
    css: "text/css",
    csv: "text/csv",

    // Code
    js: "text/javascript",
    ts: "text/typescript",
    jsx: "text/javascript",
    tsx: "text/typescript",
    json: "application/json",
    xml: "application/xml",
    yaml: "text/yaml",
    yml: "text/yaml",
    toml: "text/toml",

    // Images
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
    ico: "image/x-icon",

    // Documents
    pdf: "application/pdf",

    // Archives
    zip: "application/zip",
    gz: "application/gzip",
    tar: "application/x-tar",
  };

  // The lookup is by an arbitrary extension, so it is genuinely optional. The
  // default is a constant rather than another entry in the map, so the compiler
  // can see the function always returns a string
  return contentTypes[ext || ""] ?? DEFAULT_CONTENT_TYPE;
}

export default gitRoutes;
