/** How the connection role stands in relation to row-level security */
interface DatabaseRoleRow {
  current_user: string;
  is_superuser: boolean | null;
  can_bypass_rls: boolean | null;
  owned_unforced_tables: number | string | null;
}

/**
 * Every way a role can bypass row-level security.
 *
 * Ownership is the one that is easy to miss, and it is the one that applies in
 * production: `arbor` is not a superuser, but it owns every table, and an owner
 * bypasses policies unless the table is set to `FORCE ROW LEVEL SECURITY`. A
 * check for `rolsuper` alone stays silent there, which reads as "policies are
 * enforced" while nothing is.
 */
const ROLE_STATUS_QUERY = `
  select
    current_user,
    (select rolsuper from pg_roles where rolname = current_user) as is_superuser,
    (select rolbypassrls from pg_roles where rolname = current_user) as can_bypass_rls,
    (
      select count(*)
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relrowsecurity
        and not c.relforcerowsecurity
        and pg_get_userbyid(c.relowner) = current_user
    ) as owned_unforced_tables`;

/**
 * Warn when the connection role makes row-level security ineffective.
 *
 * Read authorization is enforced in Grafast plan wrappers, which is
 * per-connection: a connection added later without a wrapper is exposed by
 * default. The policies in `lib/db/schema/rowLevelSecurity.ts` are the backstop,
 * and their failure mode is silent: they exist, queries succeed, tests pass, and
 * nothing is enforced.
 *
 * This reports the condition rather than asserting it, because it is true today
 * and crashing on it would take a working API down for a backstop that is not
 * switched on yet. Make it an assertion once the GraphQL connection uses the
 * constrained role (see plans/2026-07-31-arbor-rls-defence-in-depth.md).
 *
 * Deliberately its own module, and it takes the query rather than importing the
 * pool: four test files `mock.module("lib/db/db", ...)`, and bun applies module
 * mocks process-wide, so importing anything from `db.ts` here fails to resolve at
 * load time in a full test run. The caller supplies the query.
 */
export const warnIfRowLevelSecurityIsBypassed = async (
  query: (sql: string) => Promise<{ rows: DatabaseRoleRow[] }>,
  { enforce = false }: { enforce?: boolean } = {},
): Promise<void> => {
  let rows: DatabaseRoleRow[];

  // only the query is guarded. Wrapping the verdict too would let `enforce`
  // throw into this catch and be downgraded to a warning, which is the one
  // outcome the enforcement exists to prevent
  try {
    ({ rows } = await query(ROLE_STATUS_QUERY));
  } catch (err) {
    // a database blip must not take the boot path down
    console.warn(
      "Could not determine the database role, skipping the row-level security check:",
      err instanceof Error ? err.message : err,
    );
    return;
  }

  const row = rows[0];
  if (!row) return;

  // count() comes back as a string from node-postgres (bigint), so compare
  // numerically rather than trusting the type
  const ownedUnforced = Number(row.owned_unforced_tables ?? 0);

  const reason = row.is_superuser
    ? "is a superuser"
    : row.can_bypass_rls
      ? "has BYPASSRLS"
      : ownedUnforced > 0
        ? `owns ${ownedUnforced} table(s) with row-level security enabled but not forced, and an owner bypasses its own policies`
        : null;

  if (!reason) return;

  const message = `Database role "${row.current_user}" ${reason}, so row-level security is bypassed and cannot back up the read-authorization plan wrappers`;

  // in production this is a regression, not a status report: the GraphQL
  // connection has lost its constrained role and the backstop is gone. Refuse to
  // boot rather than serve in that state. ALLOW_RLS_BYPASS exists because the
  // documented rollback is to unset GRAPHQL_DATABASE_URL, which would otherwise
  // leave the service unable to start
  if (enforce) throw new Error(message);

  console.warn(message);
};
