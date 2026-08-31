import { staffEmailDomains } from "lib/config/env.config";
import { testerApplicationTable } from "lib/db/schema";

import type { SelectTesterApplication, SelectUser } from "lib/db/schema";

/**
 * Staff auto-approval into the arbor closed beta.
 *
 * An authenticated caller whose email domain is an Omni staff domain
 * (STAFF_EMAIL_DOMAINS, default "omni.dev") is idempotently given an approved
 * tester_application row, so staff reach the beta without hand-filling the apply
 * form. The row is created at most once (a cheap existence check runs per
 * request, the write only when absent) and an arbor.application.submitted event
 * is emitted exactly once, on creation, so Bifrost ingests it and independently
 * labels the staff email. An existing row of any status is never overridden.
 *
 * Mirrors SubmitTesterApplication.plugin: a dependency-injected, unit-testable
 * core with a structurally typed db seam, kept db-module-free.
 */

/**
 * The note stamped onto an auto-approved staff application, in both the answers
 * blob and the reviewer note so the origin is obvious wherever the row surfaces.
 */
export const STAFF_NOTE = "Omni staff (auto-approved)";

/**
 * The subset of the db this handler needs. Structurally typed (loose write
 * chains) so the concrete drizzle db is assignable and the handler stays unit
 * testable with a fake db, without importing the db module.
 */
interface StaffEnrollmentDb {
  query: {
    testerApplicationTable: {
      // method shorthand + loose config so the concrete drizzle db (generic
      // findFirst with a strongly typed where callback) is assignable
      findFirst(config?: any): PromiseLike<{ id: string } | undefined>;
    };
  };
  // loose write chain, correctness enforced at runtime and in tests
  insert(table: any): any;
}

/** The event envelope the handler emits. Matches the providers EventInput seam. */
interface EmittableEvent {
  type: string;
  data: Record<string, unknown>;
  subject?: string;
  organizationId?: string;
}

interface EnsureStaffEnrollmentArgs {
  observer: Pick<SelectUser, "id" | "username" | "email"> | null | undefined;
  db: StaffEnrollmentDb;
  emit: (event: EmittableEvent) => Promise<unknown>;
  /** Injectable staff domains so the check is unit-testable, defaults to config. */
  domains?: string[];
}

/**
 * Whether an email address belongs to an Omni staff domain.
 *
 * Normalizes to lowercase and matches the part after the last "@" against the
 * configured domains (themselves lowercased in env.config). An empty or
 * malformed address is not staff.
 */
export const isStaffEmail = (
  email: string | null | undefined,
  domains: string[] = staffEmailDomains,
): boolean => {
  if (!email) return false;
  const at = email.lastIndexOf("@");
  if (at === -1) return false;
  const domain = email
    .slice(at + 1)
    .trim()
    .toLowerCase();
  if (!domain) return false;
  return domains.includes(domain);
};

/**
 * Idempotently ensure a staff caller holds an approved tester application.
 *
 * A no-op for a non-staff or anonymous caller, and for a staff caller who
 * already has any application row (never overrides an existing decision). On
 * first sight of a staff caller it inserts an approved row and emits
 * arbor.application.submitted once. Best-effort: any failure is caught and
 * logged so this can never fail the request it runs inside.
 */
export const ensureStaffEnrollment = async ({
  observer,
  db,
  emit,
  domains = staffEmailDomains,
}: EnsureStaffEnrollmentArgs): Promise<void> => {
  try {
    if (!observer || !isStaffEmail(observer.email, domains)) return;

    // cheap existence check: only write when the caller has no row yet
    const existing = await db.query.testerApplicationTable.findFirst({
      columns: { id: true },
      where: (table: any, { eq }: { eq: (a: any, b: any) => any }) =>
        eq(table.userId, observer.id),
    });
    if (existing) return;

    // nda fields stay null/false: staff did not fill the terms form
    const [application] = (await db
      .insert(testerApplicationTable)
      .values({
        userId: observer.id,
        status: "approved",
        answers: { note: STAFF_NOTE },
        reviewerNote: STAFF_NOTE,
        ndaAccepted: false,
      })
      .returning()) as SelectTesterApplication[];

    if (!application) return;

    // fire-and-forget with a catch, mirroring SubmitTesterApplication.plugin:
    // the emit must not fail enrollment, and the provider no-ops when Vortex is
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
    }).catch((err) =>
      console.warn("[arbor] Staff enrollment emit failed", err),
    );
  } catch (err) {
    // best-effort: staff auto-approval must never fail the request it runs in
    console.warn("[arbor] Staff enrollment failed", err);
  }
};
