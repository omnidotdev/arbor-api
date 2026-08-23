import { EXPORTABLE } from "graphile-export";
import { context, lambda, object } from "postgraphile/grafast";
import { extendSchema } from "postgraphile/utils";

import type { SelectTesterApplication } from "lib/db/schema";

/**
 * Custom myTesterApplication query plugin.
 *
 * Returns the authenticated caller's own closed-beta tester application (its
 * status, reviewer note, and timestamps) or null when they have not applied.
 * This is the query the /apply UI polls to render pending/approved/declined
 * state, and it is a carve-out field on the beta gate (betaGate.plugin.ts) so a
 * non-whitelisted applicant can still read their own status.
 *
 * Scoped to the caller: it reads the observer from context, never an arbitrary
 * userId, so the auto-generated testerApplications CRUD connection is not needed
 * (and stays gated) for the self-status case.
 */

/**
 * The subset of the db this handler needs. Structurally typed (method shorthand
 * + loose config) so the concrete drizzle db is assignable and the handler stays
 * unit testable with a fake db, without importing the db module.
 */
interface MyTesterApplicationDb {
  query: {
    testerApplicationTable: {
      findFirst(config?: any): PromiseLike<SelectTesterApplication | undefined>;
    };
  };
}

interface MyTesterApplicationArgs {
  observer: { id: string } | null | undefined;
  db: MyTesterApplicationDb;
}

/**
 * Resolve the caller's tester application, or null when anonymous or when they
 * have no application row. Pure and dependency-injected so it is unit testable
 * independent of the Grafast plan wiring.
 */
export const getMyTesterApplication = async ({
  observer,
  db,
}: MyTesterApplicationArgs): Promise<SelectTesterApplication | null> => {
  // fail closed for an anonymous caller before touching the db
  if (!observer) return null;

  const application = await db.query.testerApplicationTable.findFirst({
    where: (table: any, { eq }: { eq: (a: any, b: any) => any }) =>
      eq(table.userId, observer.id),
  });

  return application ?? null;
};

const MyTesterApplicationPlugin = extendSchema(() => {
  return {
    typeDefs: /* GraphQL */ `
      """
      The authenticated caller's own closed-beta tester application.
      """
      type MyTesterApplication {
        """
        The application row ID.
        """
        rowId: UUID

        """
        Lifecycle status (pending, approved, declined).
        """
        status: String

        """
        Reviewer note, present after a decision.
        """
        reviewerNote: String

        """
        The accepted beta terms version.
        """
        ndaVersion: String

        """
        When the beta terms were accepted.
        """
        ndaAcceptedAt: Datetime

        """
        When the application was created.
        """
        createdAt: Datetime

        """
        When the application was last updated.
        """
        updatedAt: Datetime
      }

      extend type Query {
        """
        Returns the authenticated caller's own closed-beta tester application,
        or null when they have not applied.
        """
        myTesterApplication: MyTesterApplication
      }
    `,

    objects: {
      MyTesterApplication: {
        plans: {
          rowId: EXPORTABLE(
            (lambda) => ($row: any) =>
              lambda($row, (r) => (r as any)?.id ?? null),
            [lambda],
          ),
          status: EXPORTABLE(
            (lambda) => ($row: any) =>
              lambda($row, (r) => (r as any)?.status ?? null),
            [lambda],
          ),
          reviewerNote: EXPORTABLE(
            (lambda) => ($row: any) =>
              lambda($row, (r) => (r as any)?.reviewerNote ?? null),
            [lambda],
          ),
          ndaVersion: EXPORTABLE(
            (lambda) => ($row: any) =>
              lambda($row, (r) => (r as any)?.ndaVersion ?? null),
            [lambda],
          ),
          ndaAcceptedAt: EXPORTABLE(
            (lambda) => ($row: any) =>
              lambda($row, (r) => (r as any)?.ndaAcceptedAt ?? null),
            [lambda],
          ),
          createdAt: EXPORTABLE(
            (lambda) => ($row: any) =>
              lambda($row, (r) => (r as any)?.createdAt ?? null),
            [lambda],
          ),
          updatedAt: EXPORTABLE(
            (lambda) => ($row: any) =>
              lambda($row, (r) => (r as any)?.updatedAt ?? null),
            [lambda],
          ),
        },
      },

      Query: {
        plans: {
          myTesterApplication: EXPORTABLE(
            (lambda, object, context, getMyTesterApplication) => () => {
              const $db = context().get("db");
              const $observer = context().get("observer");

              return lambda(
                object({ db: $db, observer: $observer }),
                (args: any) =>
                  getMyTesterApplication({
                    observer: args.observer,
                    db: args.db,
                  }),
              );
            },
            [lambda, object, context, getMyTesterApplication],
          ),
        },
      },
    },
  };
});

export default MyTesterApplicationPlugin;
