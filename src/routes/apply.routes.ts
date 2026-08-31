import { Elysia } from "elysia";

import { getApplicantCount } from "lib/beta/applicantCount";
import { getOmniUserbase } from "lib/beta/omniUserbase";

/**
 * Public closed-beta apply routes.
 *
 * Mounted OUTSIDE the GraphQL closed-beta gate and any auth guard (like the
 * health route), so an anonymous visitor can read the count for social proof.
 * Only a single integer is exposed, never rows or PII. The count is the
 * fleet-wide Omni userbase (Gatekeeper) when available, falling back to the
 * local tester_application count when Gatekeeper is unreachable. Both sources
 * are injectable so the route is unit-testable without a database or network.
 */
export const createApplyRoutes = (
  getUserbase = getOmniUserbase,
  getCount = getApplicantCount,
) =>
  new Elysia({ prefix: "/api/apply" }).get("/count", async () => {
    // a degraded count returns 0 rather than leaking an error on this public,
    // unauthenticated route
    try {
      const userbase = await getUserbase();
      const total = userbase ?? (await getCount());
      return { total };
    } catch {
      return { total: 0 };
    }
  });

export default createApplyRoutes();
