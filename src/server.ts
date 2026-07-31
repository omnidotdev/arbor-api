import { readFileSync } from "node:fs";

import { cors } from "@elysiajs/cors";
import { yoga } from "@elysiajs/graphql-yoga";
import { useOpenTelemetry } from "@envelop/opentelemetry";
import { useParserCache } from "@envelop/parser-cache";
import { useValidationCache } from "@envelop/validation-cache";
import { useDisableIntrospection } from "@graphql-yoga/plugin-disable-introspection";
import { registerSchemas } from "@omnidotdev/providers/events";
import { Elysia } from "elysia";
import { useGrafast } from "grafast/envelop";
import { makeSchema } from "postgraphile";
import webhooks from "webhooks";

import appConfig from "lib/config/app.config";
import {
  CORS_ALLOWED_ORIGINS,
  PORT,
  VORTEX_API_KEY,
  VORTEX_API_URL,
  isDevEnv,
  isProdEnv,
} from "lib/config/env.config";
import graphilePreset from "lib/config/graphile.config";
import { pgPool } from "lib/db/db";
import { pgSubscriber } from "lib/db/pubsub";
import { warnIfRowLevelSecurityIsBypassed } from "lib/db/rowLevelSecurity";
import { ensureReposDirectory } from "lib/git";
import createGraphqlContext from "lib/graphql/createGraphqlContext";
import { armorPlugin, authenticationPlugin } from "lib/graphql/plugins";
import { rateLimit } from "lib/middleware/rateLimit";
import { initializeSearchIndexes, search } from "lib/search";
import gitRoutes from "routes/git.routes";

const commit = (() => {
  try {
    return readFileSync("/app/.git-sha", "utf-8").trim();
  } catch {
    return "unknown";
  }
})();

// Register event schemas with Vortex
if (VORTEX_API_URL && VORTEX_API_KEY) {
  registerSchemas(VORTEX_API_URL, VORTEX_API_KEY, [
    {
      name: "arbor.repository.created",
      source: "omni.arbor",
      description: "Repository created",
    },
    {
      name: "arbor.ref.created",
      source: "omni.arbor",
      description: "Branch or tag created",
    },
    {
      name: "arbor.ref.deleted",
      source: "omni.arbor",
      description: "Branch or tag deleted",
    },
    {
      name: "arbor.pull_request.merged",
      source: "omni.arbor",
      description: "Pull request merged",
    },
  ]).catch((err) => {
    console.warn("[Events] Schema registration failed:", err);
  });
}

// Report whether the connection role can be constrained by row-level security.
// Not awaited: it is a diagnostic, and it must not sit on the boot path
warnIfRowLevelSecurityIsBypassed((sql) => pgPool.query(sql));

// Build the schema at runtime from database introspection. arbor-api has custom Grafast
// plans that close over runtime singletons (gitService, repositoryService), so it uses
// makeSchema at boot rather than a pre-compiled executable schema
const { schema } = await makeSchema(graphilePreset);

// Optional MCP (Model Context Protocol) server, mounted at /mcp so AI agents can
// drive the forge natively. Loaded defensively: any failure to initialize the
// MCP module degrades to a no-op plugin and logs a warning, so a broken MCP
// integration can never prevent the server from booting
const { mcpRoutes, mcpEnabled } = await (async () => {
  try {
    const { default: routes } = await import("routes/mcp.routes");
    return { mcpRoutes: routes, mcpEnabled: true };
  } catch (err) {
    console.warn("[MCP] Initialization failed, MCP server disabled:", err);
    return { mcpRoutes: new Elysia(), mcpEnabled: false };
  }
})();

/**
 * Elysia server.
 */
const app = new Elysia({
  ...(isDevEnv && {
    serve: {
      // https://elysiajs.com/patterns/configuration#serve-tls
      // https://bun.sh/guides/http/tls
      // NB: Elysia (and Bun) trust the well-known CA list curated by Mozilla (https://wiki.mozilla.org/CA/Included_Certificates), but they can be customized here if needed (`tls.ca` option)
      tls: {
        certFile: "cert.pem",
        keyFile: "key.pem",
      },
    },
  }),
})
  .get("/health", () => ({ status: "ok", commit }))
  .use(
    cors({
      origin: CORS_ALLOWED_ORIGINS!.split(","),
      methods: ["GET", "POST", "DELETE", "OPTIONS"],
    }),
  )
  .onAfterHandle(({ set }) => {
    set.headers["X-Content-Type-Options"] = "nosniff";
    set.headers["X-Frame-Options"] = "DENY";
    set.headers["X-XSS-Protection"] = "1; mode=block";
    set.headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
  })
  // Rate limiting: 100 requests per minute for general API
  // Skip webhooks (they're server-to-server with signatures)
  .use(
    rateLimit({
      max: isProdEnv ? 100 : 1000, // Higher limit in dev
      windowMs: 60_000,
      skip: (request) => {
        const url = new URL(request.url);
        // Skip rate limiting for webhooks (authenticated via signatures)
        return url.pathname.startsWith("/webhooks");
      },
    }),
  )
  .use(webhooks)
  .use(gitRoutes)
  .use(mcpRoutes)
  .use(
    yoga({
      schema,
      context: createGraphqlContext,
      graphiql: isDevEnv,
      plugins: [
        ...armorPlugin,
        ...authenticationPlugin,
        // disable GraphQL schema introspection in production to mitigate reverse engineering
        isProdEnv && useDisableIntrospection(),
        isProdEnv &&
          useOpenTelemetry({
            variables: true,
            result: true,
          }),
        // parser and validation caches recommended for Grafast (https://grafast.org/grafast/servers#envelop)
        useParserCache(),
        useValidationCache(),
        useGrafast(),
      ],
    }),
  )
  .listen(PORT);

// Ensure git repositories directory exists
ensureReposDirectory().catch((err) => {
  console.error("[Git] Failed to create repositories directory:", err);
});

// Initialize search indexes if search is enabled
if (search) {
  initializeSearchIndexes().catch((err) => {
    console.error("[Search] Failed to initialize indexes:", err);
  });
}

console.info(
  `🦊 ${appConfig.name} Elysia server running at ${app.server?.url.toString().slice(0, -1)}`,
);

console.info(
  `🧘 ${appConfig.name} GraphQL Yoga API running at ${app.server?.url}graphql`,
);

console.info(`🌳 ${appConfig.name} Git API running at ${app.server?.url}git`);

if (mcpEnabled) {
  console.info(
    `🤖 ${appConfig.name} MCP server mounted at ${app.server?.url}mcp`,
  );
}

// Release the LISTEN/NOTIFY subscriber's held connection on shutdown so it does
// not linger after the process is asked to stop
const shutdown = (signal: string) => {
  console.info(`[Server] Received ${signal}, shutting down...`);
  pgSubscriber.release();
  app.stop();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
