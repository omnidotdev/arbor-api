import { sql } from "drizzle-orm";
import { pgPolicy } from "drizzle-orm/pg-core";

import type { SQL } from "drizzle-orm";

/**
 * Row-level security predicates.
 *
 * These back up the Grafast plan wrappers in
 * `lib/graphql/plugins/authorization/RepositoryRead.plugin.ts`, which are
 * per-connection: a connection added later without a wrapper is exposed by
 * default. A policy applies to every path at once, including nested ones, so a
 * missed wrapper fails closed instead of open.
 *
 * They only take effect for a role that is neither a superuser nor the table
 * owner, which today means the connection selected by `GRAPHQL_DATABASE_URL`.
 * Until that points at a constrained role these policies are inert.
 * @see plans/2026-07-31-arbor-rls-defence-in-depth.md
 */

/**
 * The caller, as carried on the Postgres session.
 *
 * Set per request by `pgSettingsContextPlugin` in
 * `lib/graphql/plugins/authentication.plugin.ts`. `nullif` is what makes the
 * anonymous case null rather than a cast error, since an anonymous caller is
 * given an explicit empty string.
 */
const observerId = sql`nullif(current_setting('app.user_id', true), '')::uuid`;

/**
 * Visibility for a repository row.
 *
 * Mirrors `visibleRepositoryIds` in `RepositoryRead.plugin.ts` and
 * `canReadRepository` in `lib/git/gitAccess.ts`: public to everyone, otherwise
 * owner, collaborator at any permission, or a member of the owning
 * organization.
 */
export const repositoryVisible = sql`
  visibility = 'public'
  or owner_id = ${observerId}
  or exists (
    select 1 from repository_collaborator rc
    where rc.repository_id = repository.id and rc.user_id = ${observerId}
  )
  or exists (
    select 1 from organization_member om
    where om.organization_id = repository.organization_id
      and om.user_id = ${observerId}
  )`;

/**
 * Visibility for a row that hangs off a repository.
 *
 * Deliberately `in (select id from repository)` rather than a copy of the
 * predicate above. Policies compose: for a constrained role that subquery is
 * itself filtered by the repository policy, so "visible repository" has exactly
 * one definition and derived tables cannot drift from it.
 */
export const derivedFrom = (column: string, table: string) =>
  sql.raw(`${column} in (select id from ${table})`);

/**
 * Visibility for an agent row.
 *
 * Mirrors `scopeAgentsToCaller`: ownership or membership of the owning
 * organization. An agent record carries its owner and the model and vendor it
 * runs on, so there is no public arm.
 */
export const agentVisible = sql`
  owner_id = ${observerId}
  or exists (
    select 1 from organization_member om
    where om.organization_id = agent.organization_id
      and om.user_id = ${observerId}
  )`;

/**
 * Visibility for an organization row.
 *
 * Mirrors `scopeOrganizationsToCaller`: an organization exists only because
 * someone created it, so its existence is not public information. This does not
 * affect `Repository.organization`, which is a relation traversal from a row the
 * caller already holds.
 */
export const organizationVisible = sql`
  exists (
    select 1 from organization_member om
    where om.organization_id = organization.id
      and om.user_id = ${observerId}
  )`;

/**
 * Policies for a table whose rows are readable when their parent is.
 *
 * Reads are restricted; writes are left permissive on purpose. Mutation
 * authorization lives in the Grafast mutation wrappers and has always lived
 * there, so re-expressing it in SQL would mean maintaining the same rules twice
 * with no backstop gained. RLS here is a read backstop.
 *
 * The write policies are per-command rather than one `for: "all"`: permissive
 * policies combine with OR, so a single `for: "all" using (true)` would also
 * satisfy SELECT and silently undo the read restriction.
 *
 * No `to:` role, so these apply to PUBLIC. A superuser and the table owner
 * bypass them regardless, which is what keeps migrations and the internal pool
 * working, and it avoids a migration that depends on a role existing first.
 */
export const readPolicies = (name: string, using: SQL) =>
  [
    pgPolicy(`${name}_select`, { for: "select", using }),
    pgPolicy(`${name}_insert`, { for: "insert", withCheck: sql`true` }),
    pgPolicy(`${name}_update`, {
      for: "update",
      using: sql`true`,
      withCheck: sql`true`,
    }),
    pgPolicy(`${name}_delete`, { for: "delete", using: sql`true` }),
  ] as const;
