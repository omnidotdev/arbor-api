/**
 * DB lookup of a user's arbor closed-beta tester application status.
 *
 * Feeds the pure `isWhitelisted` helper's `applicationStatus` field: the gate
 * (GraphQL Envelop plugin) and the git-route gate call this to resolve whether
 * the caller holds an approved application. Kept a thin, single-column query.
 */

/**
 * The subset of the db this lookup needs: the tester-application relational
 * query. Structurally typed so the resolution can be unit tested with a fake db
 * and so this module does not depend on the db module.
 */
interface TesterApplicationDb {
  query: {
    testerApplicationTable: {
      // method shorthand (not an arrow property) so the parameter is checked
      // bivariantly, and a loose `config` so the concrete drizzle db (whose
      // `findFirst` is generic with a strongly-typed `where` callback) is
      // assignable to this seam. Kept db-module-free so the resolution stays
      // unit-testable with a fake db
      findFirst(config?: any): PromiseLike<{ status: string } | undefined>;
    };
  };
}

/** A tester application's lifecycle status. */
export type ApplicationStatus = "pending" | "approved" | "declined";

/**
 * Resolve a user's tester application status, or null when they have no
 * application row. The status column is app-validated (not a pgEnum), so it is
 * narrowed to the known lifecycle values here.
 */
export const getApplicationStatus = async (
  db: TesterApplicationDb,
  userId: string,
): Promise<ApplicationStatus | null> => {
  const application = await db.query.testerApplicationTable.findFirst({
    columns: { status: true },
    where: (table: any, { eq }: { eq: (a: any, b: any) => any }) =>
      eq(table.userId, userId),
  });

  return (application?.status as ApplicationStatus | undefined) ?? null;
};
