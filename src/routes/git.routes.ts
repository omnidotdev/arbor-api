import { Elysia, t } from "elysia";

import {
  advertiseRefs,
  getServiceContentType,
  getServiceResultContentType,
  gitService,
  parseGitService,
  receivePack,
  repositoryService,
  uploadPack,
} from "lib/git";

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
  // Raw File Downloads (Binary)
  // ============================================================

  /**
   * Get raw file content (for download).
   * Returns binary data with appropriate Content-Type header.
   */
  .get(
    "/:owner/:repo/raw/:ref/*",
    async ({ params, set }) => {
      const { owner, repo, ref } = params;
      const path = params["*"] || "";

      const exists = await repositoryService.exists(owner, repo);
      if (!exists) {
        set.status = 404;
        return { error: "Repository not found" };
      }

      const content = await gitService.getFileRaw(owner, repo, ref, path);

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
    async ({ params, query, set }) => {
      const { owner } = params;
      // Remove .git suffix if present
      const repo = params.repo.replace(/\.git$/, "");
      const service = parseGitService(query.service);

      if (!service) {
        set.status = 400;
        return { error: "Invalid or missing service parameter" };
      }

      const exists = await repositoryService.exists(owner, repo);
      if (!exists) {
        set.status = 404;
        return { error: "Repository not found" };
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

      const exists = await repositoryService.exists(owner, repo);
      if (!exists) {
        set.status = 404;
        return { error: "Repository not found" };
      }

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
   */
  .post(
    "/:owner/:repo/git-receive-pack",
    async ({ params, request, set }) => {
      const { owner } = params;
      const repo = params.repo.replace(/\.git$/, "");

      const exists = await repositoryService.exists(owner, repo);
      if (!exists) {
        set.status = 404;
        return { error: "Repository not found" };
      }

      const body = Buffer.from(await request.arrayBuffer());
      const result = await receivePack(owner, repo, body);

      if (!result.success) {
        set.status = 500;
        return { error: "Receive pack failed" };
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

    // Default
    default: "application/octet-stream",
  };

  return contentTypes[ext || ""] || contentTypes.default;
}

export default gitRoutes;
