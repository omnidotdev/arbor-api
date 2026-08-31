import { describe, expect, test } from "bun:test";

import { createApplyRoutes } from "./apply.routes";

const call = (app: ReturnType<typeof createApplyRoutes>) =>
  app.handle(new Request("http://localhost/api/apply/count"));

/**
 * The public count route returns only an integer total, and is reachable
 * without authentication (it carries no auth guard of its own). It reports the
 * fleet-wide Omni userbase when available, falling back to the local applicant
 * count when Gatekeeper is unavailable.
 */
describe("GET /api/apply/count", () => {
  test("returns the Omni userbase count when available", async () => {
    const app = createApplyRoutes(
      async () => 4200,
      async () => 12,
    );
    const res = await call(app);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ total: 4200 });
  });

  test("falls back to the local applicant count when userbase is unavailable", async () => {
    const app = createApplyRoutes(
      async () => null,
      async () => 12,
    );
    const res = await call(app);

    expect(await res.json()).toEqual({ total: 12 });
  });

  test("returns zero on total failure", async () => {
    const app = createApplyRoutes(
      async () => null,
      async () => {
        throw new Error("db down");
      },
    );
    const res = await call(app);

    expect(await res.json()).toEqual({ total: 0 });
  });
});
