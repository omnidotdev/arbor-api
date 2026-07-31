/**
 * @file Create the constrained role the GraphQL connection uses.
 *
 * Row-level security is bypassed unconditionally by a superuser, and by the
 * table owner unless the table is forced. `arbor-api` connects as `postgres`,
 * which is both, so the policies in `lib/db/schema/rowLevelSecurity.ts` are inert
 * until GraphQL connects as the role this creates.
 *
 * Deliberately a script rather than a migration. A migration would have to carry
 * the role's password, and migrations are committed. This reads it from the
 * environment, is idempotent, and is safe to re-run after adding tables (the
 * grants are re-applied).
 *
 * Run once per environment, before pointing `GRAPHQL_DATABASE_URL` at the role:
 *
 *   GRAPHQL_ROLE_PASSWORD="$(openssl rand -base64 32)" \
 *     bun run --env-file .env.local src/scripts/db/bootstrapGraphqlRole.ts
 *
 * Then set `GRAPHQL_DATABASE_URL` to
 * `postgresql://arbor_app:<password>@<host>/<db>`, and verify with
 * `src/scripts/verifyReadAuthorization.ts` plus the revoke test in
 * plans/2026-07-31-arbor-rls-defence-in-depth.md.
 * @see plans/2026-07-31-arbor-rls-defence-in-depth.md
 */

import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
const ROLE = process.env.GRAPHQL_ROLE_NAME ?? "arbor_app";
const PASSWORD = process.env.GRAPHQL_ROLE_PASSWORD;

if (!DATABASE_URL) {
  console.error("[BootstrapRole] DATABASE_URL is not set");
  process.exit(1);
}

if (!PASSWORD) {
  console.error(
    "[BootstrapRole] GRAPHQL_ROLE_PASSWORD is not set. Generate one with: openssl rand -base64 32",
  );
  process.exit(1);
}

// the role name reaches SQL as an identifier, which cannot be parameterised.
// Constrain it rather than interpolating whatever was passed in
if (!/^[a-z_][a-z0-9_]*$/.test(ROLE)) {
  console.error(
    `[BootstrapRole] Invalid role name "${ROLE}": expected lowercase letters, digits, and underscores`,
  );
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

try {
  const client = await pool.connect();

  try {
    const { rows } = await client.query(
      "select 1 from pg_roles where rolname = $1",
      [ROLE],
    );

    // CREATE/ALTER ROLE will not accept a bind parameter for the password, so it
    // has to be inlined. escapeLiteral is node-postgres' own quoting, which is
    // why the password is never concatenated raw
    const password = client.escapeLiteral(PASSWORD);

    if (rows.length > 0) {
      console.info(`[BootstrapRole] Role ${ROLE} exists, updating password`);
      await client.query(`alter role ${ROLE} with login password ${password}`);
    } else {
      console.info(`[BootstrapRole] Creating role ${ROLE}`);
      await client.query(`create role ${ROLE} with login password ${password}`);
    }

    // No BYPASSRLS and no ownership: those are exactly what would make the
    // policies inert again
    await client.query(`grant usage on schema public to ${ROLE}`);
    await client.query(
      `grant select, insert, update, delete on all tables in schema public to ${ROLE}`,
    );
    await client.query(
      `grant usage, select on all sequences in schema public to ${ROLE}`,
    );

    // tables added by later migrations, so a new table does not silently 500
    // with "permission denied" the first time GraphQL reads it
    await client.query(
      `alter default privileges in schema public grant select, insert, update, delete on tables to ${ROLE}`,
    );
    await client.query(
      `alter default privileges in schema public grant usage, select on sequences to ${ROLE}`,
    );

    const { rows: check } = await client.query(
      "select rolsuper, rolbypassrls from pg_roles where rolname = $1",
      [ROLE],
    );

    if (check[0]?.rolsuper || check[0]?.rolbypassrls) {
      console.error(
        `[BootstrapRole] ${ROLE} can bypass row-level security, which defeats the point. Remove SUPERUSER/BYPASSRLS before using it`,
      );
      process.exit(1);
    }

    console.info(
      `[BootstrapRole] ${ROLE} ready: not a superuser, cannot bypass RLS`,
    );
  } finally {
    client.release();
  }
} catch (err) {
  console.error("[BootstrapRole] Failed:", err);
  process.exit(1);
} finally {
  await pool.end();
}
