import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import webhooks from "webhooks";

import appConfig from "lib/config/app.config";
import { CORS_ALLOWED_ORIGINS, PORT, isDevEnv } from "lib/config/env.config";

/**
 * Elysia server.
 */
const app = new Elysia({
  ...(isDevEnv && {
    serve: {
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
  .use(webhooks)
  .get("/", () => ({ status: "ok" }))
  .listen(PORT);

// biome-ignore lint/suspicious/noConsole: root logging
console.log(
  `${appConfig.name} running at ${app.server?.url.toString().slice(0, -1)}`,
);
