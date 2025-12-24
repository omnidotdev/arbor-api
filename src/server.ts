import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

import appConfig from "lib/config/app.config";
import { CORS_ALLOWED_ORIGINS, PORT, isDevEnv } from "lib/config/env.config";

/**
 * Elysia server.
 */
const app = new Elysia({
  ...(isDevEnv && {
    serve: {
      // https://elysiajs.com/patterns/configuration#serve-tls
      // https://bun.sh/guides/http/tls
      tls: {
        certFile: "cert.pem",
        keyFile: "key.pem",
      },
    },
  }),
})
  .use(
    cors({
      origin: CORS_ALLOWED_ORIGINS?.split(",") ?? [],
      methods: ["GET", "POST", "OPTIONS"],
    }),
  )
  .get("/", () => ({ status: "ok" }))
  .listen(PORT);

// biome-ignore lint/suspicious/noConsole: root logging
console.log(
  `🦊 ${appConfig.name} Elysia server running at ${app.server?.url.toString().slice(0, -1)}`,
);
