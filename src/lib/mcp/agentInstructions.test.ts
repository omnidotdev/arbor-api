import { beforeEach, describe, expect, mock, test } from "bun:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

/**
 * AGENTS.md recognition on the MCP surface.
 *
 * Driven through a real MCP client over an in-memory transport rather than by
 * calling the handler directly, because two of the things worth asserting are
 * protocol-level: that the tool is advertised in `tools/list`, and that the
 * handshake carries the instructions telling an agent to call it. A unit test
 * of the closure would prove neither.
 *
 * The repository lookup, the access gate, and git file reads are stubbed at the
 * `lib/git` boundary.
 */

const state: {
  repo: {
    id: string;
    visibility: "public" | "private";
    ownerId: string;
    organizationId: string | null;
  } | null;
  canRead: boolean;
  /** File content keyed by `${ref}:${path}`, absent meaning the file is missing */
  files: Record<string, string>;
  defaultBranch: string;
} = { repo: null, canRead: true, files: {}, defaultBranch: "master" };

mock.module("lib/git", () => ({
  resolveRepositorySummary: async () => state.repo,
  canReadRepository: async () => state.canRead,
  canWriteRepository: async () => false,
  // pulled in transitively by lib/repository and lib/stack, unused here
  repositoryService: {},
  gitService: {
    getFileContent: async (
      _owner: string,
      _repo: string,
      ref: string,
      path: string,
    ) => state.files[`${ref}:${path}`] ?? null,
  },
}));

mock.module("lib/db/db", () => ({
  dbPool: {
    query: {
      repositoryTable: {
        findFirst: async () => ({
          ...state.repo,
          defaultBranch: state.defaultBranch,
        }),
      },
    },
  },
}));

const { createArborMcpServer } = await import("./server");

import type { McpCaller } from "./auth";

const caller = {
  user: { id: "user-1", username: "owner" },
  agent: null,
  scope: { permission: "read", repositories: null },
  organizations: [],
} as unknown as McpCaller;

/** Connect a client to a freshly built server over a linked in-memory pair */
const connect = async () => {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  const client = new Client({ name: "test", version: "0.0.0" });
  const server = createArborMcpServer(caller);

  await Promise.all([
    client.connect(clientTransport),
    server.server.connect(serverTransport),
  ]);

  return client;
};

/** Parse the JSON payload a tool result carries as its first text block */
const payload = (result: {
  content: { type: string; text?: string }[];
  isError?: boolean;
}) => JSON.parse(result.content[0]?.text ?? "null");

beforeEach(() => {
  state.repo = {
    id: "repo-1",
    visibility: "private",
    ownerId: "user-1",
    organizationId: null,
  };
  state.canRead = true;
  state.defaultBranch = "master";
  state.files = { "master:AGENTS.md": "# Conventions\n\nUse bun." };
});

describe("AGENTS.md recognition", () => {
  test("the handshake instructs agents to fetch instructions before changing a repository", async () => {
    const client = await connect();

    const instructions = client.getInstructions();

    expect(instructions).toContain("AGENTS.md");
    expect(instructions).toContain("get_agent_instructions");
  });

  test("the tool is advertised", async () => {
    const client = await connect();

    const { tools } = await client.listTools();

    expect(tools.map((tool) => tool.name)).toContain("get_agent_instructions");
  });

  test("returns the file from the default branch when no ref is given", async () => {
    const client = await connect();

    const result = payload(
      (await client.callTool({
        name: "get_agent_instructions",
        arguments: { owner: "owner", repo: "repo" },
      })) as never,
    );

    expect(result.present).toBe(true);
    expect(result.ref).toBe("master");
    expect(result.path).toBe("AGENTS.md");
    expect(result.content).toContain("Use bun.");
  });

  test("reads the given ref when one is supplied", async () => {
    state.files["feature:AGENTS.md"] = "# On the branch";
    const client = await connect();

    const result = payload(
      (await client.callTool({
        name: "get_agent_instructions",
        arguments: { owner: "owner", repo: "repo", ref: "feature" },
      })) as never,
    );

    expect(result.ref).toBe("feature");
    expect(result.content).toBe("# On the branch");
  });

  test("a repository with no AGENTS.md answers present:false, not an error", async () => {
    state.files = {};
    const client = await connect();

    const result = (await client.callTool({
      name: "get_agent_instructions",
      arguments: { owner: "owner", repo: "repo" },
    })) as never as { isError?: boolean; content: { text?: string }[] };

    // absent must be distinguishable from forbidden, or an agent cannot tell
    // "this repository sets no conventions" from "you may not look at it"
    expect(result.isError).toBeFalsy();
    expect(payload(result as never).present).toBe(false);
    expect(payload(result as never).content).toBeNull();
  });

  test("a repository the caller may not read is refused, and reads as missing", async () => {
    state.canRead = false;
    const client = await connect();

    const result = (await client.callTool({
      name: "get_agent_instructions",
      arguments: { owner: "owner", repo: "repo" },
    })) as never as { isError?: boolean; content: { text?: string }[] };

    expect(result.isError).toBe(true);
    // the same message every other tool uses, so the file cannot be used to
    // probe whether a private repository exists
    expect(result.content[0]?.text).toBe(
      "Repository not found or not accessible",
    );
  });

  test("the gate runs before the file read, so no git access happens when refused", async () => {
    state.canRead = false;
    let reads = 0;
    state.files = { "master:AGENTS.md": "secret" };

    mock.module("lib/git", () => ({
      resolveRepositorySummary: async () => state.repo,
      canReadRepository: async () => state.canRead,
      canWriteRepository: async () => false,
      gitService: {
        getFileContent: async () => {
          reads++;
          return "secret";
        },
      },
    }));

    const client = await connect();
    await client.callTool({
      name: "get_agent_instructions",
      arguments: { owner: "owner", repo: "repo" },
    });

    expect(reads).toBe(0);
  });
});
