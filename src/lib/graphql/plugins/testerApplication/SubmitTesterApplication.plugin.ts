import { eq } from "drizzle-orm";
import { EXPORTABLE } from "graphile-export";
import { GraphQLError } from "graphql";
import { context, lambda, object } from "postgraphile/grafast";
import { extendSchema } from "postgraphile/utils";

import { testerApplicationTable } from "lib/db/schema";
import events from "lib/providers";

import type { SelectTesterApplication, SelectUser } from "lib/db/schema";
import type { FieldArgs } from "postgraphile/grafast";

/**
 * Custom submitTesterApplication mutation plugin.
 *
 * The auto-generated createTesterApplication CRUD would let a client set any
 * userId/status, so it is unusable as the apply entrypoint. This mutation takes
 * only the safe form inputs, records the authenticated user, enforces one active
 * application per user (re-applying is allowed only after a decline), stamps the
 * beta-terms acceptance, and emits an arbor.application.submitted event that
 * Bifrost ingests into the cross-product review queue.
 *
 * Mirrors OpenPullRequest.plugin.ts: extendSchema with lambda() so all logic
 * runs in one guaranteed-ordered step (a wrapPlans sideEffect on $result may be
 * tree-shaken by Grafast).
 */

/** The apply form inputs a client may supply. */
interface SubmitTesterApplicationInput {
  answers?: Record<string, unknown> | null;
  ndaAccepted?: boolean | null;
  ndaVersion?: string | null;
}

/**
 * The subset of the db this handler needs. Structurally typed (loose write
 * chains) so the concrete drizzle db is assignable and the handler stays unit
 * testable with a fake db, without importing the db module.
 */
interface SubmitTesterApplicationDb {
  query: {
    testerApplicationTable: {
      // method shorthand + loose config so the concrete drizzle db (generic
      // findFirst with a strongly typed where callback) is assignable
      findFirst(config?: any): PromiseLike<SelectTesterApplication | undefined>;
    };
  };
  // loose write chains, correctness enforced at runtime and in tests
  insert(table: any): any;
  update(table: any): any;
}

/** The event envelope the handler emits. Matches the providers EventInput seam. */
interface EmittableEvent {
  type: string;
  data: Record<string, unknown>;
  subject?: string;
  organizationId?: string;
}

interface SubmitTesterApplicationArgs {
  observer: Pick<SelectUser, "id" | "username" | "email"> | null | undefined;
  input: SubmitTesterApplicationInput;
  db: SubmitTesterApplicationDb;
  emit: (event: EmittableEvent) => Promise<unknown>;
  /** Injectable clock so the acceptance timestamp is deterministic in tests. */
  now?: () => Date;
}

/**
 * Client-safe error for the apply flow. A GraphQLError (not a plain Error) so
 * the message survives graphql-yoga masking in production; the message is
 * deliberately generic and leaks no internal detail.
 */
const applyError = (message: string): GraphQLError => new GraphQLError(message);

/**
 * Submit (or re-submit) the caller's arbor closed-beta tester application.
 *
 * Enforces authentication and beta-terms acceptance, upserts one row per user
 * (insert, or reset a previously declined row back to pending), and emits
 * arbor.application.submitted. Pure and dependency-injected so it is unit
 * testable independent of the Grafast plan wiring.
 */
export const submitTesterApplication = async ({
  observer,
  input,
  db,
  emit,
  now = () => new Date(),
}: SubmitTesterApplicationArgs): Promise<SelectTesterApplication> => {
  if (!observer) {
    throw applyError("Authentication is required to apply to the closed beta");
  }

  const ndaVersion = input.ndaVersion?.trim();
  if (input.ndaAccepted !== true || !ndaVersion) {
    throw applyError("You must accept the beta terms to apply");
  }

  const answers = input.answers ?? {};
  const acceptedAt = now();

  const existing = await db.query.testerApplicationTable.findFirst({
    where: (table: any, { eq }: { eq: (a: any, b: any) => any }) =>
      eq(table.userId, observer.id),
  });

  if (existing?.status === "approved") {
    throw applyError("You already have access to the closed beta");
  }
  if (existing?.status === "pending") {
    throw applyError("You have already applied to the closed beta");
  }

  let application: SelectTesterApplication | undefined;

  if (existing) {
    // a declined applicant may re-apply: reset the same row to pending with the
    // new answers and terms acceptance, clearing the prior reviewer note
    const [updated] = await db
      .update(testerApplicationTable)
      .set({
        status: "pending",
        answers,
        reviewerNote: null,
        ndaAccepted: true,
        ndaVersion,
        ndaAcceptedAt: acceptedAt,
        updatedAt: acceptedAt,
      })
      .where(eq(testerApplicationTable.userId, observer.id))
      .returning();
    application = updated;
  } else {
    const [inserted] = await db
      .insert(testerApplicationTable)
      .values({
        userId: observer.id,
        status: "pending",
        answers,
        ndaAccepted: true,
        ndaVersion,
        ndaAcceptedAt: acceptedAt,
      })
      .returning();
    application = inserted;
  }

  if (!application) {
    throw applyError("We could not submit your application, please try again");
  }

  // fire-and-forget with a catch, mirroring OpenPullRequest.plugin.ts: the emit
  // must not fail the mutation, and the provider no-ops when Vortex is
  // unconfigured
  emit({
    type: "arbor.application.submitted",
    subject: application.id,
    data: {
      applicationId: application.id,
      userId: observer.id,
      handle: observer.username,
      email: observer.email,
      product: "arbor",
      answers: application.answers,
      nda: {
        accepted: application.ndaAccepted,
        version: application.ndaVersion,
        acceptedAt: application.ndaAcceptedAt,
      },
    },
  }).catch((err) => console.warn("[arbor] Event emit failed", err));

  return application;
};

const SubmitTesterApplicationPlugin = extendSchema(() => {
  return {
    typeDefs: /* GraphQL */ `
      """
      Input for submitting a closed-beta tester application.
      """
      input SubmitTesterApplicationInput {
        """
        Free-form application form answers (use case, stack, team size, links, notes).
        """
        answers: JSON

        """
        Whether the applicant accepted the beta confidentiality terms. Must be true.
        """
        ndaAccepted: Boolean!

        """
        The version of the beta terms the applicant accepted.
        """
        ndaVersion: String!
      }

      """
      Payload for the submitTesterApplication mutation, the applicant's row.
      """
      type SubmitTesterApplicationPayload {
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

      extend type Mutation {
        """
        Submit (or re-submit after a decline) the authenticated user's arbor
        closed-beta tester application. Requires accepting the beta terms.
        """
        submitTesterApplication(
          input: SubmitTesterApplicationInput!
        ): SubmitTesterApplicationPayload
      }
    `,

    objects: {
      SubmitTesterApplicationPayload: {
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

      Mutation: {
        plans: {
          submitTesterApplication: EXPORTABLE(
            (lambda, object, context, events, submitTesterApplication) =>
              (_$root: any, fieldArgs: FieldArgs) => {
                const $input = fieldArgs.getRaw("input");
                const $db = context().get("db");
                const $observer = context().get("observer");

                return lambda(
                  object({ input: $input, db: $db, observer: $observer }),
                  (args: any) =>
                    submitTesterApplication({
                      observer: args.observer,
                      input: args.input,
                      db: args.db,
                      emit: (event) => events.emit(event),
                    }),
                );
              },
            [lambda, object, context, events, submitTesterApplication],
          ),
        },
      },
    },
  };
});

export default SubmitTesterApplicationPlugin;
