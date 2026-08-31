import { Elysia } from "elysia";

import { getApplicantCount } from "lib/beta/applicantCount";

/**
 * Public closed-beta apply routes.
 *
 * Mounted OUTSIDE the GraphQL closed-beta gate and any auth guard (like the
 * health route), so an anonymous visitor can read the applicant count for
 * social proof. Only a single integer is exposed, never rows or PII. The
 * counter is injectable so the route is unit-testable without a database.
 */
export const createApplyRoutes = (getCount = getApplicantCount) =>
  new Elysia({ prefix: "/api/apply" }).get("/count", async () => {
    // a degraded count returns 0 rather than leaking an error on this public,
    // unauthenticated route
    try {
      return { total: await getCount() };
    } catch {
      return { total: 0 };
    }
  });

export default createApplyRoutes();
