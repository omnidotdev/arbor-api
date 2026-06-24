import { describe, expect, test } from "bun:test";

import { Elysia } from "elysia";

import { rateLimit } from "./rateLimit";

describe("rate limiting middleware", () => {
  test("allows requests under the limit", async () => {
    const app = new Elysia()
      .use(rateLimit({ max: 5, windowMs: 60_000 }))
      .get("/test", () => "ok");

    const response = await app.handle(
      new Request("http://localhost/test", {
        headers: { "x-forwarded-for": "1.2.3.4" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("X-RateLimit-Limit")).toBe("5");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("4");
  });

  test("blocks requests over the limit", async () => {
    const app = new Elysia()
      .use(rateLimit({ max: 2, windowMs: 60_000 }))
      .get("/test", () => "ok");

    const makeRequest = () =>
      app.handle(
        new Request("http://localhost/test", {
          headers: { "x-forwarded-for": "5.6.7.8" },
        }),
      );

    // First two requests should succeed
    const res1 = await makeRequest();
    const res2 = await makeRequest();
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    // Third request should be rate limited
    const res3 = await makeRequest();
    expect(res3.status).toBe(429);
    expect(res3.headers.get("Retry-After")).toBeTruthy();
  });

  test("tracks different clients separately", async () => {
    const app = new Elysia()
      .use(rateLimit({ max: 1, windowMs: 60_000 }))
      .get("/test", () => "ok");

    // First client
    const res1 = await app.handle(
      new Request("http://localhost/test", {
        headers: { "x-forwarded-for": "client-a" },
      }),
    );
    expect(res1.status).toBe(200);

    // Second request from first client should fail
    const res2 = await app.handle(
      new Request("http://localhost/test", {
        headers: { "x-forwarded-for": "client-a" },
      }),
    );
    expect(res2.status).toBe(429);

    // Different client should succeed
    const res3 = await app.handle(
      new Request("http://localhost/test", {
        headers: { "x-forwarded-for": "client-b" },
      }),
    );
    expect(res3.status).toBe(200);
  });

  test("skips rate limiting when skip function returns true", async () => {
    const app = new Elysia()
      .use(
        rateLimit({
          max: 1,
          windowMs: 60_000,
          skip: (req) => new URL(req.url).pathname.startsWith("/health"),
        }),
      )
      .get("/test", () => "ok")
      .get("/health", () => "healthy");

    // Rate limited endpoint - second request fails
    await app.handle(
      new Request("http://localhost/test", {
        headers: { "x-forwarded-for": "skip-client" },
      }),
    );
    const res2 = await app.handle(
      new Request("http://localhost/test", {
        headers: { "x-forwarded-for": "skip-client" },
      }),
    );
    expect(res2.status).toBe(429);

    // Skipped endpoint - multiple requests succeed
    const health1 = await app.handle(
      new Request("http://localhost/health", {
        headers: { "x-forwarded-for": "skip-client" },
      }),
    );
    const health2 = await app.handle(
      new Request("http://localhost/health", {
        headers: { "x-forwarded-for": "skip-client" },
      }),
    );
    expect(health1.status).toBe(200);
    expect(health2.status).toBe(200);
  });

  test("uses x-real-ip header as fallback", async () => {
    const app = new Elysia()
      .use(rateLimit({ max: 1, windowMs: 60_000 }))
      .get("/test", () => "ok");

    const res1 = await app.handle(
      new Request("http://localhost/test", {
        headers: { "x-real-ip": "real-ip-client" },
      }),
    );
    expect(res1.status).toBe(200);

    const res2 = await app.handle(
      new Request("http://localhost/test", {
        headers: { "x-real-ip": "real-ip-client" },
      }),
    );
    expect(res2.status).toBe(429);
  });
});
