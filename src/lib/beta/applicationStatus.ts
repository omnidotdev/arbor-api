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
      findFirst: (args: {
        columns: { status: true };
        where: (table: any, ops: { eq: (a: any, b: any) => any }) => unknown;
      }) => Promise<{ status: string } | undefined>;
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
    where: (table, { eq }) => eq(table.userId, userId),
  });

  return (application?.status as ApplicationStatus | undefined) ?? null;
};
