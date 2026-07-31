/** The connection role, as reported by the database */
interface DatabaseRoleRow {
  current_user: string;
  is_superuser: boolean | null;
}

/**
 * Warn when the connection role makes row-level security ineffective.
 *
 * Read authorization is enforced in Grafast plan wrappers today, which is
 * per-connection: a connection added later without a wrapper is exposed by
 * default. RLS is the intended backstop, and its failure mode is silent, because
 * a superuser bypasses policies unconditionally and a table owner bypasses them
 * without `FORCE ROW LEVEL SECURITY`. Policies would exist, tests would pass, and
 * nothing would be enforced.
 *
 * So this reports the condition rather than asserting it: `arbor-api` connects as
 * `postgres` today, and crashing on that would take a working API down for a
 * backstop that is not built yet. It becomes an assertion once the roles land
 * (see plans/2026-07-31-arbor-rls-defence-in-depth.md).
 *
 * Deliberately its own module, and it takes the query rather than importing the
 * pool: four test files `mock.module("lib/db/db", ...)`, and bun applies module
 * mocks process-wide, so importing anything from `db.ts` here fails to resolve at
 * load time in a full test run. The caller supplies the query.
 */
export const warnIfRowLevelSecurityIsBypassed = async (
  query: (sql: string) => Promise<{ rows: DatabaseRoleRow[] }>,
): Promise<void> => {
  try {
    const { rows } = await query(
      "select current_user, (select rolsuper from pg_roles where rolname = current_user) as is_superuser",
    );

    const row = rows[0];
    if (!row?.is_superuser) return;

    console.warn(
      `Database role "${row.current_user}" is a superuser, row-level security is bypassed and cannot back up the read-authorization plan wrappers`,
    );
  } catch (err) {
    // never let a diagnostic take the boot path down
    console.warn(
      "Could not determine the database role, skipping the row-level security check:",
      err instanceof Error ? err.message : err,
    );
  }
};
