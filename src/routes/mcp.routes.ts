import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Elysia } from "elysia";

import { resolveMcpCaller } from "lib/mcp/auth";
import { createArborMcpServer } from "lib/mcp/server";

/** JSON-RPC error code for an unauthorized request (mirrors HTTP 401) */
const JSONRPC_UNAUTHORIZED = -32001;

/**
 * Build a JSON-RPC error Response for a request that cannot be served before it
 * reaches the MCP server (e.g. missing credentials). The body is a valid
 * JSON-RPC error object with a null id, and no internal detail is leaked.
 */
const jsonRpcError = (
  status: number,
  code: number,
  message: string,
): Response =>
  new Response(
    JSON.stringify({ jsonrpc: "2.0", error: { code, message }, id: null }),
    { status, headers: { "content-type": "application/json" } },
  );

/**
 * Handle a single MCP request over Streamable HTTP.
 *
 * Stateless: a fresh McpServer and transport are created per request (no session
 * management), so concurrent callers never share state and the resolved caller
 * is captured directly in each tool closure. Every request is authenticated via
 * its bearer token before any tool can run; unauthenticated requests are
 * rejected with a JSON-RPC error.
 */
const handleMcpRequest = async (request: Request): Promise<Response> => {
  try {
    const caller = await resolveMcpCaller(request);

    if (!caller) {
      return jsonRpcError(401, JSONRPC_UNAUTHORIZED, "Authentication required");
    }

    const server = createArborMcpServer(caller);

    // Stateless request/response: sessionIdGenerator undefined disables session
    // management, enableJsonResponse returns a plain JSON body instead of an SSE
    // stream, which is the simplest correct shape for one-shot tool calls
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    // Release the per-request server once the underlying transport closes
    transport.onclose = () => {
      void server.close();
    };

    await server.connect(transport);

    return await transport.handleRequest(request);
  } catch (err) {
    // Never surface internals; log server-side and return a generic error
    console.error("[MCP] Request handling failed:", err);
    return jsonRpcError(500, -32603, "Internal error");
  }
};

/**
 * Model Context Protocol routes.
 *
 * Exposes the Arbor forge to AI agents over the MCP Streamable HTTP transport at
 * `/mcp`. POST carries JSON-RPC messages; GET and DELETE are wired so the
 * transport can answer stateless clients correctly (405/JSON-RPC as applicable).
 */
const mcpRoutes = new Elysia()
  .post("/mcp", ({ request }) => handleMcpRequest(request))
  .get("/mcp", ({ request }) => handleMcpRequest(request))
  .delete("/mcp", ({ request }) => handleMcpRequest(request));

export default mcpRoutes;
