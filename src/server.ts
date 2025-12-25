import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

import appConfig from "lib/config/app.config";
import { CORS_ALLOWED_ORIGINS, PORT, isDevEnv } from "lib/config/env.config";

/**
 * Elysia server.
 */
const server = new Elysia({
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
      methods: ["GET", "POST", "OPTIONS"],
    }),
  )
  .get("/", () => ({ status: "ok" }))
  .listen(PORT);

// biome-ignore lint/suspicious/noConsole: root logging
console.log(
  `🦊 ${appConfig.name} Elysia server running at ${server.server?.url.toString().slice(0, -1)}`,
);
