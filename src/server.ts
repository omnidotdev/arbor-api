import { cors } from "@elysiajs/cors";
import { yoga } from "@elysiajs/graphql-yoga";
import { useOpenTelemetry } from "@envelop/opentelemetry";
import { useParserCache } from "@envelop/parser-cache";
import { useValidationCache } from "@envelop/validation-cache";
import { useDisableIntrospection } from "@graphql-yoga/plugin-disable-introspection";
import { Elysia } from "elysia";
import { schema } from "generated/graphql/schema.executable";
import { useGrafast } from "grafast/envelop";
import webhooks from "webhooks";

import appConfig from "lib/config/app.config";
import {
  CORS_ALLOWED_ORIGINS,
  PORT,
  isDevEnv,
  isProdEnv,
} from "lib/config/env.config";
import { ensureReposDirectory } from "lib/git";
import createGraphqlContext from "lib/graphql/createGraphqlContext";
import { armorPlugin, authenticationPlugin } from "lib/graphql/plugins";
import { rateLimit } from "lib/middleware/rateLimit";
import gitRoutes from "routes/git.routes";

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

console.info(
  `🦊 ${appConfig.name} Elysia server running at ${app.server?.url.toString().slice(0, -1)}`,
);

console.info(
  `🧘 ${appConfig.name} GraphQL Yoga API running at ${app.server?.url}graphql`,
);

console.info(`🌳 ${appConfig.name} Git API running at ${app.server?.url}git`);
