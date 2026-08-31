import { describe, expect, test } from "bun:test";

import { createApplyRoutes } from "./apply.routes";

/**
 * The public applicant-count route returns only an integer total, and is
 * reachable without authentication (it carries no auth guard of its own).
 */
describe("GET /api/apply/count", () => {
  test("returns the injected count as a { total } integer", async () => {
    const app = createApplyRoutes(async () => 12);
    const res = await app.handle(
      new Request("http://localhost/api/apply/count"),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ total: 12 });
  });

  test("returns zero when there are no applicants", async () => {
    const app = createApplyRoutes(async () => 0);
    const res = await app.handle(
      new Request("http://localhost/api/apply/count"),
    );

    expect(await res.json()).toEqual({ total: 0 });
  });
});
