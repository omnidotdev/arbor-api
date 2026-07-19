import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { z } from "zod";

import appConfig from "lib/config/app.config";
import { dbPool } from "lib/db/db";
import { pullRequestTable, repositoryCollaboratorTable } from "lib/db/schema";
import {
  canReadRepository,
  gitService,
  resolveRepositorySummary,
} from "lib/git";

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { RepositorySummary } from "lib/git";
import type { McpCaller } from "./auth";

/** Version reported to MCP clients in the server handshake */
const MCP_SERVER_VERSION = "0.1.0";

/** Default page size for list tools, and the hard ceiling a caller may request */
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

/**
 * Upper bound on repositories scanned when building a caller-visible list.
 *
 * Candidate rows are filtered through the same access gate the git routes use,
 * so a private repository can never leak; this only bounds the work done per
 * request.
 */
const CANDIDATE_SCAN_LIMIT = 500;

/**
 * Generic "not visible" message.
 *
 * A repository the caller may not read is reported identically to one that does
 * not exist, so a tool never reveals the existence of a private repository.
 */
const NOT_FOUND_MESSAGE = "Repository not found or not accessible";

/** Wrap arbitrary data as a successful structured tool result */
const jsonResult = (data: unknown): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
});

/** Wrap a message as a tool error result */
const errorResult = (message: string): CallToolResult => ({
  content: [{ type: "text", text: message }],
  isError: true,
});

/**
 * Resolve a repository and enforce read access for the caller.
 *
 * Returns the repository summary when the caller may read it, or null (with no
 * distinction between missing and forbidden) otherwise.
 */
const gateRead = async (
  caller: McpCaller,
  owner: string,
  repo: string,
): Promise<RepositorySummary | null> => {
  const repository = await resolveRepositorySummary(owner, repo);
  if (!repository) return null;

  if (!(await canReadRepository(caller.user, repository))) return null;

  return repository;
};

/** Clamp a caller-requested limit into the supported range */
const clampLimit = (limit: number | undefined): number =>
  Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

/**
 * Shape a repository row for tool output.
 *
 * `owner` is the on-disk/URL owner username and `fullName` is the
 * `owner/slug` identifier other tools accept.
 */
const shapeRepository = (repository: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  visibility: string;
  defaultBranch: string;
  updatedAt: string;
  owner: { username: string };
}) => ({
  id: repository.id,
  name: repository.name,
  slug: repository.slug,
  owner: repository.owner.username,
  fullName: `${repository.owner.username}/${repository.slug}`,
  description: repository.description,
  visibility: repository.visibility,
  defaultBranch: repository.defaultBranch,
  updatedAt: repository.updatedAt,
});

/**
 * Build a first-party Arbor MCP server bound to an authenticated caller.
 *
 * Every tool scopes its results to what `caller.user` may see, reusing the same
 * read-access gate as the Smart-HTTP git routes. The server is stateless and
 * built per request, so the caller is captured directly in each tool closure.
 */
export const createArborMcpServer = (caller: McpCaller): McpServer => {
  const server = new McpServer({
    name: `${appConfig.name.toLowerCase()}-mcp`,
    version: MCP_SERVER_VERSION,
  });

  // ============================================================
  // Repositories
  // ============================================================

  server.registerTool(
    "list_repositories",
    {
      title: "List repositories",
      description:
        "List repositories visible to the authenticated caller (public repositories, plus private repositories the caller owns, collaborates on, or can access through an organization)",
      inputSchema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_LIMIT)
          .optional()
          .describe("Maximum repositories to return (default 30, max 100)"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ limit }) => {
      const collaborations = await dbPool
        .select({ repositoryId: repositoryCollaboratorTable.repositoryId })
        .from(repositoryCollaboratorTable)
        .where(eq(repositoryCollaboratorTable.userId, caller.user.id));

      const collaboratorRepoIds = collaborations.map((row) => row.repositoryId);

      // Candidate set: anything that could plausibly be visible. Org repos are
      // included wholesale and narrowed by the per-row access gate below, which
      // evaluates the caller's organization membership
      const candidates = await dbPool.query.repositoryTable.findMany({
        where: (table, { eq: eqOp, or: orOp, isNotNull }) =>
          orOp(
            eqOp(table.visibility, "public"),
            eqOp(table.ownerId, caller.user.id),
            isNotNull(table.organizationId),
            collaboratorRepoIds.length
              ? inArray(table.id, collaboratorRepoIds)
              : undefined,
          ),
        with: { owner: { columns: { username: true } } },
        orderBy: (table) => [desc(table.updatedAt)],
        limit: CANDIDATE_SCAN_LIMIT,
      });

      const visible: ReturnType<typeof shapeRepository>[] = [];
      const max = clampLimit(limit);

      for (const repository of candidates) {
        if (visible.length >= max) break;
        const summary: RepositorySummary = {
          id: repository.id,
          visibility: repository.visibility,
          ownerId: repository.ownerId,
          organizationId: repository.organizationId,
        };
        if (await canReadRepository(caller.user, summary)) {
          visible.push(shapeRepository(repository));
        }
      }

      return jsonResult({ repositories: visible, count: visible.length });
    },
  );

  server.registerTool(
    "get_repository",
    {
      title: "Get repository",
      description: "Get details for a single repository by owner and slug",
      inputSchema: {
        owner: z.string().describe("Owner username"),
        repo: z.string().describe("Repository slug"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ owner, repo }) => {
      const gate = await gateRead(caller, owner, repo);
      if (!gate) return errorResult(NOT_FOUND_MESSAGE);

      const repository = await dbPool.query.repositoryTable.findFirst({
        where: (table, { eq: eqOp }) => eqOp(table.id, gate.id),
        with: { owner: { columns: { username: true } } },
      });

      if (!repository) return errorResult(NOT_FOUND_MESSAGE);

      return jsonResult(shapeRepository(repository));
    },
  );

  server.registerTool(
    "search_repositories",
    {
      title: "Search repositories",
      description:
        "Search repositories the caller can access by name, slug, or description",
      inputSchema: {
        query: z.string().min(1).describe("Search term"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_LIMIT)
          .optional()
          .describe("Maximum repositories to return (default 30, max 100)"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ query, limit }) => {
      const term = `%${query}%`;

      const candidates = await dbPool.query.repositoryTable.findMany({
        where: (table) =>
          or(
            ilike(table.name, term),
            ilike(table.slug, term),
            ilike(table.description, term),
          ),
        with: { owner: { columns: { username: true } } },
        orderBy: (table) => [desc(table.updatedAt)],
        limit: CANDIDATE_SCAN_LIMIT,
      });

      const visible: ReturnType<typeof shapeRepository>[] = [];
      const max = clampLimit(limit);

      for (const repository of candidates) {
        if (visible.length >= max) break;
        const summary: RepositorySummary = {
          id: repository.id,
          visibility: repository.visibility,
          ownerId: repository.ownerId,
          organizationId: repository.organizationId,
        };
        if (await canReadRepository(caller.user, summary)) {
          visible.push(shapeRepository(repository));
        }
      }

      return jsonResult({ repositories: visible, count: visible.length });
    },
  );

  // ============================================================
  // Git browsing
  // ============================================================

  server.registerTool(
    "list_branches",
    {
      title: "List branches",
      description: "List the branches of a repository",
      inputSchema: {
        owner: z.string().describe("Owner username"),
        repo: z.string().describe("Repository slug"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ owner, repo }) => {
      const gate = await gateRead(caller, owner, repo);
      if (!gate) return errorResult(NOT_FOUND_MESSAGE);

      const branches = await gitService.listBranches(owner, repo);
      return jsonResult({ branches, count: branches.length });
    },
  );

  server.registerTool(
    "list_tree",
    {
      title: "List tree",
      description:
        "List directory entries at a path and ref (branch, tag, or commit SHA) in a repository",
      inputSchema: {
        owner: z.string().describe("Owner username"),
        repo: z.string().describe("Repository slug"),
        ref: z.string().describe("Branch, tag, or commit SHA"),
        path: z
          .string()
          .optional()
          .describe("Directory path, empty or omitted for the repository root"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ owner, repo, ref, path }) => {
      const gate = await gateRead(caller, owner, repo);
      if (!gate) return errorResult(NOT_FOUND_MESSAGE);

      const entries = await gitService.getTree(owner, repo, ref, path ?? "");
      return jsonResult({
        path: path ?? "",
        ref,
        entries,
        count: entries.length,
      });
    },
  );

  server.registerTool(
    "read_file",
    {
      title: "Read file",
      description:
        "Read the text content of a file at a path and ref in a repository. Binary files are reported but their bytes are not returned",
      inputSchema: {
        owner: z.string().describe("Owner username"),
        repo: z.string().describe("Repository slug"),
        ref: z.string().describe("Branch, tag, or commit SHA"),
        path: z.string().min(1).describe("File path within the repository"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ owner, repo, ref, path }) => {
      const gate = await gateRead(caller, owner, repo);
      if (!gate) return errorResult(NOT_FOUND_MESSAGE);

      const content = await gitService.getFileContent(owner, repo, ref, path);
      const raw = await gitService.getFileRaw(owner, repo, ref, path);

      if (content === null && raw === null) {
        return errorResult("File not found");
      }

      const isBinary = content === null && raw !== null;

      return jsonResult({
        path,
        ref,
        isBinary,
        size: raw?.length ?? 0,
        content: isBinary ? null : content,
      });
    },
  );

  // ============================================================
  // Pull requests
  // ============================================================

  server.registerTool(
    "list_pull_requests",
    {
      title: "List pull requests",
      description:
        "List the pull requests of a repository, optionally by state",
      inputSchema: {
        owner: z.string().describe("Owner username"),
        repo: z.string().describe("Repository slug"),
        state: z
          .enum(["open", "closed", "merged"])
          .optional()
          .describe("Filter by pull request state"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_LIMIT)
          .optional()
          .describe("Maximum pull requests to return (default 30, max 100)"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ owner, repo, state, limit }) => {
      const gate = await gateRead(caller, owner, repo);
      if (!gate) return errorResult(NOT_FOUND_MESSAGE);

      const rows = await dbPool
        .select({
          number: pullRequestTable.number,
          title: pullRequestTable.title,
          description: pullRequestTable.description,
          state: pullRequestTable.state,
          sourceBranch: pullRequestTable.sourceBranch,
          targetBranch: pullRequestTable.targetBranch,
          createdAt: pullRequestTable.createdAt,
          updatedAt: pullRequestTable.updatedAt,
          mergedAt: pullRequestTable.mergedAt,
          closedAt: pullRequestTable.closedAt,
        })
        .from(pullRequestTable)
        .where(
          state
            ? and(
                eq(pullRequestTable.repositoryId, gate.id),
                eq(pullRequestTable.state, state),
              )
            : eq(pullRequestTable.repositoryId, gate.id),
        )
        .orderBy(desc(pullRequestTable.number))
        .limit(clampLimit(limit));

      return jsonResult({ pullRequests: rows, count: rows.length });
    },
  );

  server.registerTool(
    "get_pull_request",
    {
      title: "Get pull request",
      description: "Get a single pull request by repository and number",
      inputSchema: {
        owner: z.string().describe("Owner username"),
        repo: z.string().describe("Repository slug"),
        number: z.number().int().min(1).describe("Pull request number"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ owner, repo, number }) => {
      const gate = await gateRead(caller, owner, repo);
      if (!gate) return errorResult(NOT_FOUND_MESSAGE);

      const pullRequest = await dbPool.query.pullRequestTable.findFirst({
        where: (table, { eq: eqOp, and: andOp }) =>
          andOp(eqOp(table.repositoryId, gate.id), eqOp(table.number, number)),
        with: {
          author: { columns: { username: true } },
          authoredByAgent: { columns: { name: true, slug: true } },
        },
      });

      if (!pullRequest) return errorResult("Pull request not found");

      return jsonResult(pullRequest);
    },
  );

  return server;
};
