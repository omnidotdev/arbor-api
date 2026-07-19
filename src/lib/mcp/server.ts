import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";

import appConfig from "lib/config/app.config";
import { dbPool } from "lib/db/db";
import {
  changeTable,
  pullRequestCommentTable,
  pullRequestTable,
  repositoryCollaboratorTable,
  stackTable,
  verificationCheckTable,
} from "lib/db/schema";
import {
  canReadRepository,
  canWriteRepository,
  gitService,
  resolveRepositorySummary,
} from "lib/git";
import { pullRequestCommentTopic } from "lib/graphql/plugins/subscriptions/topic";
import { stackService } from "lib/stack";

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

/**
 * Generic "not writable" message.
 *
 * A repository the caller may not write is reported identically to one that does
 * not exist, so a write tool never reveals the existence of a private repository
 * or the caller's exact permission level.
 */
const NOT_WRITABLE_MESSAGE = "Repository not found or not writable";

/**
 * Resolve a repository and enforce write access for the caller.
 *
 * Returns the repository summary when the caller may write to it, or null (with
 * no distinction between missing and forbidden) otherwise. Reuses the same
 * write gate as the Smart-HTTP git routes and the GraphQL mutations.
 */
const gateWrite = async (
  caller: McpCaller,
  owner: string,
  repo: string,
): Promise<RepositorySummary | null> => {
  const repository = await resolveRepositorySummary(owner, repo);
  if (!repository) return null;

  if (!(await canWriteRepository(caller.user, repository))) return null;

  return repository;
};

/**
 * Enforce write access for the caller against a repository resolved by id.
 *
 * Used by the stack and change tools, which reach the repository through a stack
 * or change row rather than an owner/slug pair. Returns the summary when the
 * caller may write, or null otherwise (missing and forbidden are indistinguishable).
 */
const gateWriteByRepositoryId = async (
  caller: McpCaller,
  repositoryId: string,
): Promise<RepositorySummary | null> => {
  const row = await dbPool.query.repositoryTable.findFirst({
    where: (table, { eq: eqOp }) => eqOp(table.id, repositoryId),
    columns: {
      id: true,
      visibility: true,
      ownerId: true,
      organizationId: true,
    },
  });
  if (!row) return null;

  const summary: RepositorySummary = {
    id: row.id,
    visibility: row.visibility,
    ownerId: row.ownerId,
    organizationId: row.organizationId,
  };

  if (!(await canWriteRepository(caller.user, summary))) return null;

  return summary;
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

  // ============================================================
  // Write tools
  //
  // Every tool below mutates and is gated on WRITE access to the target
  // repository (gateWrite / gateWriteByRepositoryId), reusing the same access
  // rules as the Smart-HTTP git routes and the GraphQL mutations. Actions are
  // authored by caller.user and, when the credential is an agent access token,
  // attributed to caller.agent on the columns that carry agent attribution
  // (pull requests and stacks). No tool performs destructive git.
  // ============================================================

  server.registerTool(
    "create_pull_request",
    {
      title: "Create pull request",
      description:
        "Open a pull request from a source branch into a target branch. Requires write access to the repository. Both branches must already exist",
      inputSchema: {
        owner: z.string().describe("Owner username"),
        repo: z.string().describe("Repository slug"),
        title: z.string().min(1).describe("Pull request title"),
        sourceBranch: z
          .string()
          .min(1)
          .describe("Branch the changes come from"),
        targetBranch: z
          .string()
          .min(1)
          .describe("Branch the changes merge into"),
        description: z
          .string()
          .optional()
          .describe("Pull request description (Markdown)"),
      },
      annotations: { readOnlyHint: false },
    },
    async ({ owner, repo, title, sourceBranch, targetBranch, description }) => {
      const gate = await gateWrite(caller, owner, repo);
      if (!gate) return errorResult(NOT_WRITABLE_MESSAGE);

      if (sourceBranch === targetBranch) {
        return errorResult("Source and target branches must differ");
      }

      // Validate both branches exist before creating the record, so a pull
      // request never references a branch that is not there
      const branches = await gitService.listBranches(owner, repo);
      const branchNames = new Set(branches.map((branch) => branch.name));
      if (!branchNames.has(sourceBranch)) {
        return errorResult("Source branch not found");
      }
      if (!branchNames.has(targetBranch)) {
        return errorResult("Target branch not found");
      }

      try {
        // Per-repository pull request number, mirroring the number the GraphQL
        // create path expects the client to supply
        const [row] = await dbPool
          .select({
            max: sql<number>`coalesce(max(${pullRequestTable.number}), 0)`,
          })
          .from(pullRequestTable)
          .where(eq(pullRequestTable.repositoryId, gate.id));

        const number = (row?.max ?? 0) + 1;

        const [created] = await dbPool
          .insert(pullRequestTable)
          .values({
            number,
            repositoryId: gate.id,
            authorId: caller.user.id,
            authoredByAgentId: caller.agent?.id ?? null,
            title,
            description: description ?? null,
            sourceBranch,
            targetBranch,
          })
          .returning({
            id: pullRequestTable.id,
            number: pullRequestTable.number,
          });

        if (!created) return errorResult("Failed to create pull request");

        return jsonResult({ id: created.id, number: created.number });
      } catch (err) {
        console.error("[MCP] create_pull_request failed:", err);
        return errorResult("Failed to create pull request");
      }
    },
  );

  server.registerTool(
    "comment_on_pull_request",
    {
      title: "Comment on pull request",
      description:
        "Add a comment to a pull request as the authenticated caller. Requires write access to the repository",
      inputSchema: {
        owner: z.string().describe("Owner username"),
        repo: z.string().describe("Repository slug"),
        number: z.number().int().min(1).describe("Pull request number"),
        body: z.string().min(1).describe("Comment body (Markdown)"),
      },
      annotations: { readOnlyHint: false },
    },
    async ({ owner, repo, number, body }) => {
      const gate = await gateWrite(caller, owner, repo);
      if (!gate) return errorResult(NOT_WRITABLE_MESSAGE);

      const pullRequest = await dbPool.query.pullRequestTable.findFirst({
        where: (table, { eq: eqOp, and: andOp }) =>
          andOp(eqOp(table.repositoryId, gate.id), eqOp(table.number, number)),
        columns: { id: true },
      });

      if (!pullRequest) return errorResult("Pull request not found");

      try {
        const [created] = await dbPool
          .insert(pullRequestCommentTable)
          .values({
            pullRequestId: pullRequest.id,
            authorId: caller.user.id,
            body,
          })
          .returning({ id: pullRequestCommentTable.id });

        if (!created) return errorResult("Failed to add comment");

        // Best-effort realtime publish onto the pull request's comment channel,
        // matching the GraphQL comment mutation so subscribers see MCP-authored
        // comments too. Never fails the tool
        await dbPool
          .execute(
            sql`select pg_notify(${pullRequestCommentTopic(
              pullRequest.id,
            )}, ${JSON.stringify({ id: created.id, action: "CREATED" })})`,
          )
          .catch((error) =>
            console.error("[MCP] comment notify failed:", error),
          );

        return jsonResult({ id: created.id });
      } catch (err) {
        console.error("[MCP] comment_on_pull_request failed:", err);
        return errorResult("Failed to add comment");
      }
    },
  );

  server.registerTool(
    "create_stack",
    {
      title: "Create stack",
      description:
        "Create a stack (an ordered series of dependent changes) on a base branch. Requires write access to the repository",
      inputSchema: {
        owner: z.string().describe("Owner username"),
        repo: z.string().describe("Repository slug"),
        title: z.string().min(1).describe("Stack title"),
        baseBranch: z
          .string()
          .min(1)
          .optional()
          .describe("Base branch the stack lands on (defaults to master)"),
        description: z.string().optional().describe("Stack description"),
      },
      annotations: { readOnlyHint: false },
    },
    async ({ owner, repo, title, baseBranch, description }) => {
      const gate = await gateWrite(caller, owner, repo);
      if (!gate) return errorResult(NOT_WRITABLE_MESSAGE);

      try {
        const [created] = await dbPool
          .insert(stackTable)
          .values({
            repositoryId: gate.id,
            authorId: caller.user.id,
            authoredByAgentId: caller.agent?.id ?? null,
            title,
            description: description ?? null,
            // Omit baseBranch when not supplied so the column default applies
            ...(baseBranch ? { baseBranch } : {}),
          })
          .returning({ id: stackTable.id });

        if (!created) return errorResult("Failed to create stack");

        return jsonResult({ id: created.id });
      } catch (err) {
        console.error("[MCP] create_stack failed:", err);
        return errorResult("Failed to create stack");
      }
    },
  );

  server.registerTool(
    "create_change",
    {
      title: "Create change",
      description:
        "Create a change in a stack. Requires write access to the stack's repository",
      inputSchema: {
        stackId: z.string().uuid().describe("The stack to add the change to"),
        title: z.string().min(1).describe("Change title"),
        commitSha: z
          .string()
          .optional()
          .describe("The commit this change carries"),
        headBranch: z
          .string()
          .optional()
          .describe("The head ref that carries this change"),
        description: z.string().optional().describe("Change description"),
        parentChangeId: z
          .string()
          .uuid()
          .optional()
          .describe("The change this one builds on (same stack)"),
        position: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Bottom-up order within the stack (defaults to 0)"),
      },
      annotations: { readOnlyHint: false },
    },
    async ({
      stackId,
      title,
      commitSha,
      headBranch,
      description,
      parentChangeId,
      position,
    }) => {
      const stack = await dbPool.query.stackTable.findFirst({
        where: (table, { eq: eqOp }) => eqOp(table.id, stackId),
        columns: { id: true, repositoryId: true },
      });

      if (!stack) return errorResult("Stack not found or not writable");

      const gate = await gateWriteByRepositoryId(caller, stack.repositoryId);
      if (!gate) return errorResult("Stack not found or not writable");

      // A parent change, when given, must belong to the same stack so the
      // dependency graph stays within one stack
      if (parentChangeId) {
        const parent = await dbPool.query.changeTable.findFirst({
          where: (table, { eq: eqOp }) => eqOp(table.id, parentChangeId),
          columns: { stackId: true },
        });
        if (!parent || parent.stackId !== stackId) {
          return errorResult("Parent change not found in this stack");
        }
      }

      try {
        const [created] = await dbPool
          .insert(changeTable)
          .values({
            stackId,
            repositoryId: stack.repositoryId,
            title,
            commitSha: commitSha ?? null,
            headBranch: headBranch ?? null,
            description: description ?? null,
            parentChangeId: parentChangeId ?? null,
            // Omit position when not supplied so the column default applies
            ...(position !== undefined ? { position } : {}),
          })
          .returning({ id: changeTable.id });

        if (!created) return errorResult("Failed to create change");

        return jsonResult({ id: created.id });
      } catch (err) {
        console.error("[MCP] create_change failed:", err);
        return errorResult("Failed to create change");
      }
    },
  );

  server.registerTool(
    "merge_change",
    {
      title: "Merge change",
      description:
        "Land the bottom mergeable change of a stack onto its base branch. Requires write access to the repository. Only the bottom unmerged change merges, and only when every required check has passed; the base branch is advanced forward (fast-forward or a merge commit), never rewriting history",
      inputSchema: {
        changeId: z.string().uuid().describe("The change to merge"),
      },
      annotations: { readOnlyHint: false },
    },
    async ({ changeId }) => {
      const change = await dbPool.query.changeTable.findFirst({
        where: (table, { eq: eqOp }) => eqOp(table.id, changeId),
        columns: { id: true, repositoryId: true },
      });

      if (!change) return errorResult("Change not found or not writable");

      const gate = await gateWriteByRepositoryId(caller, change.repositoryId);
      if (!gate) return errorResult("Change not found or not writable");

      // stackService.mergeChange enforces the verification gate, bottom-of-stack
      // ordering, and safe forward-only branch advance; it never throws
      const outcome = await stackService.mergeChange(changeId, caller.user.id);

      return jsonResult(outcome);
    },
  );

  server.registerTool(
    "report_verification_check",
    {
      title: "Report verification check",
      description:
        "Report a verification check result on a change (create or update by name). A required check is a blocking merge gate: the change merges only when every required check has passed. Requires write access to the change's repository",
      inputSchema: {
        changeId: z.string().uuid().describe("The change the check runs on"),
        name: z
          .string()
          .min(1)
          .describe("Check name, e.g. unit-tests, lint, security-scan"),
        status: z
          .enum([
            "pending",
            "running",
            "passed",
            "failed",
            "errored",
            "skipped",
          ])
          .describe("Check status"),
        category: z
          .enum(["test", "lint", "build", "security", "other"])
          .optional()
          .describe("Check category (defaults to other)"),
        required: z
          .boolean()
          .optional()
          .describe("Whether the check blocks merge (defaults to true)"),
        summary: z
          .string()
          .optional()
          .describe("Machine-readable result summary"),
        detailsUrl: z.string().optional().describe("Link to full results"),
      },
      annotations: { readOnlyHint: false },
    },
    async ({
      changeId,
      name,
      status,
      category,
      required,
      summary,
      detailsUrl,
    }) => {
      const change = await dbPool.query.changeTable.findFirst({
        where: (table, { eq: eqOp }) => eqOp(table.id, changeId),
        columns: { id: true, repositoryId: true },
      });

      if (!change) return errorResult("Change not found or not writable");

      const gate = await gateWriteByRepositoryId(caller, change.repositoryId);
      if (!gate) return errorResult("Change not found or not writable");

      try {
        // Upsert by (changeId, name) so re-reporting a check updates it in place
        const [row] = await dbPool
          .insert(verificationCheckTable)
          .values({
            changeId,
            name,
            status,
            ...(category ? { category } : {}),
            ...(required !== undefined ? { required } : {}),
            summary: summary ?? null,
            detailsUrl: detailsUrl ?? null,
          })
          .onConflictDoUpdate({
            target: [
              verificationCheckTable.changeId,
              verificationCheckTable.name,
            ],
            set: {
              status,
              ...(category ? { category } : {}),
              ...(required !== undefined ? { required } : {}),
              summary: summary ?? null,
              detailsUrl: detailsUrl ?? null,
              updatedAt: new Date().toISOString(),
            },
          })
          .returning({ id: verificationCheckTable.id });

        if (!row) return errorResult("Failed to report verification check");

        return jsonResult({ id: row.id });
      } catch (err) {
        console.error("[MCP] report_verification_check failed:", err);
        return errorResult("Failed to report verification check");
      }
    },
  );

  return server;
};
