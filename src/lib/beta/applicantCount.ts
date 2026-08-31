import { count } from "drizzle-orm";

import { dbPool } from "lib/db/db";
import { testerApplicationTable } from "lib/db/schema";

/**
 * Public applicant counter for the arbor closed beta.
 *
 * A single integer, count(*) over tester_application across all statuses (staff
 * auto-approvals included), exposed unauthenticated for social proof on /apply
 * and the landing page. Never returns rows or PII. A small in-memory TTL cache
 * keeps a bursty public endpoint off the database, mirroring thrivestream's
 * Origin count.
 */

/** Count every tester application, all statuses. */
const countTesterApplications = async (): Promise<number> => {
  const [row] = await dbPool
    .select({ total: count() })
    .from(testerApplicationTable);
  return row?.total ?? 0;
};

/**
 * Wrap an async count in a small TTL cache. The clock is injectable so the
 * cache behaviour is unit-testable without waiting real time.
 */
export const createCachedCounter = (
  fetchCount: () => Promise<number>,
  {
    ttlMs = 30_000,
    now = () => Date.now(),
  }: { ttlMs?: number; now?: () => number } = {},
): (() => Promise<number>) => {
  let cache: { total: number; at: number } | null = null;

  return async () => {
    const at = now();
    if (cache && at - cache.at < ttlMs) return cache.total;
    const total = await fetchCount();
    cache = { total, at };
    return total;
  };
};

/** Live cached applicant count backing the public GET /api/apply/count route. */
export const getApplicantCount = createCachedCounter(countTesterApplications);
