import { EXPORTABLE } from "graphile-export";
import { TYPES } from "postgraphile/@dataplan/pg";
import { context, lambda } from "postgraphile/grafast";
import { sql } from "postgraphile/pg-sql2";
import { wrapPlans } from "postgraphile/utils";

import type { PgSelectStep } from "postgraphile/@dataplan/pg";
import type { PlanWrapperFn } from "postgraphile/utils";

/**
 * Read authorization for repositories.
 *
 * The generated connections accept a client-supplied `filter`, which is a
 * convenience and not a boundary: omitting it returns every row. Without a
 * mandatory predicate any authenticated caller could enumerate private
 * repositories, and because `GitTypes.plugin.ts` hangs `ref`, `refs`,
 * `defaultBranchRef` and `commit` off `Repository`, reaching the row is enough
 * to read the source it points at.
 *
 * The predicate below is injected onto the underlying select so no client input
 * can remove it, mirroring `scopeToObserver` in
 * `personalAccessToken/PersonalAccessToken.plugin.ts`.
 *
 * Visibility mirrors `canReadRepository` in `lib/git/gitAccess.ts`, which is the
 * equivalent gate on the Smart-HTTP side: public to everyone, otherwise owner,
 * collaborator (any permission), or a member of the owning organization.
 *
 * The organization arm reads `organization_member`, the membership mirror. Until
 * that table existed, membership lived only in IDP session claims and could not
 * be expressed in SQL at all, which is why this predicate was not previously
 * writable. It is a cache with a freshness window, and the arm deliberately does
 * NOT require `synced_at` to be recent: read access is the more forgiving of the
 * two uses, and requiring freshness would make a signed-in user's own
 * repository list flicker as the mirror aged. Write paths remain gated by
 * `canWriteRepository`, which uses the claims directly.
 */
/**
 * SQL for the set of repository ids the caller may see.
 *
 * Shared by every wrapper below so the definition of "visible" cannot drift
 * between the repository connections and the rows that hang off a repository.
 */
const visibleRepositoryIds = (userId: unknown) => sql`
  select r.id from repository r where (
    r.visibility = 'public'
    or r.owner_id = ${userId as never}
    or exists (
      select 1 from repository_collaborator rc
      where rc.repository_id = r.id and rc.user_id = ${userId as never}
    )
    or exists (
      select 1 from organization_member om
      where om.organization_id = r.organization_id and om.user_id = ${userId as never}
    )
  )`;

const scopeToVisible = EXPORTABLE(
  (context, lambda, sql, TYPES): PlanWrapperFn =>
    (plan) => {
      const $connection = plan();
      const $select = (
        $connection as unknown as { getSubplan(): PgSelectStep }
      ).getSubplan();

      const $observer = context().get("observer");
      // null when unauthenticated, so every arm but `public` fails to match
      const $userId = lambda($observer, (observer) => observer?.id ?? null);
      const userId = $select.placeholder($userId, TYPES.uuid);
      const alias = $select.alias;

      $select.where(
        sql`(
          ${alias}.visibility = 'public'
          or ${alias}.owner_id = ${userId}
          or exists (
            select 1
            from repository_collaborator rc
            where rc.repository_id = ${alias}.id
              and rc.user_id = ${userId}
          )
          or exists (
            select 1
            from organization_member om
            where om.organization_id = ${alias}.organization_id
              and om.user_id = ${userId}
          )
        )`,
      );

      return $connection;
    },
  [context, lambda, sql, TYPES],
);

/**
 * Scope a connection whose rows carry a repository reference.
 *
 * `column` is the path from the row to a repository id: either the column
 * itself, or a subquery for rows that reach a repository indirectly (a comment
 * through its pull request, a verification check through its change).
 *
 * Without this, pull request titles, descriptions, review bodies, and comment
 * text from private repositories are readable, and `repositoryId` on a pull
 * request hands out the id needed to try the singular accessor.
 */
const scopeByRepository = (
  buildRef: (alias: unknown) => unknown,
  buildIdSet: (userId: unknown) => unknown = visibleRepositoryIds,
) =>
  EXPORTABLE(
    (context, lambda, sql, TYPES, buildIdSet, buildRef): PlanWrapperFn =>
      (plan) => {
        const $connection = plan();
        const $select = (
          $connection as unknown as { getSubplan(): PgSelectStep }
        ).getSubplan();

        const $observer = context().get("observer");
        const $userId = lambda($observer, (observer) => observer?.id ?? null);
        const userId = $select.placeholder($userId, TYPES.uuid);

        $select.where(
          sql`${buildRef($select.alias) as never} in (${buildIdSet(userId) as never})`,
        );

        return $connection;
      },
    [context, lambda, sql, TYPES, buildIdSet, buildRef],
  );

/** Rows with a direct repository_id column */
const direct = (alias: unknown) => sql`${alias as never}.repository_id`;

/**
 * Rows reaching a repository through their pull request.
 *
 * Shaped as `<column> in (subquery)` rather than a correlated subquery on the
 * left of the comparison, matching `direct`, which is the form known to apply.
 */
const viaPullRequest = (alias: unknown) =>
  sql`${alias as never}.pull_request_id`;

/** Rows reaching a repository through their change */
const viaChange = (alias: unknown) => sql`${alias as never}.change_id`;

/** Pull request ids belonging to repositories the caller may see */
const visiblePullRequestIds = (userId: unknown) =>
  sql`select pr.id from pull_request pr where pr.repository_id in (${visibleRepositoryIds(userId)})`;

/** Change ids belonging to repositories the caller may see */
const visibleChangeIds = (userId: unknown) =>
  sql`select c.id from change c where c.repository_id in (${visibleRepositoryIds(userId)})`;

/**
 * Scope the agents connection to the caller's own agents.
 *
 * An agent record carries its owner and the model and vendor it runs on, so an
 * unscoped list tells any caller who is running which agents where. Visibility
 * is ownership or membership of the owning organization; there is no public
 * agent, so there is no `public` arm here.
 */
const scopeAgentsToCaller = EXPORTABLE(
  (context, lambda, sql, TYPES): PlanWrapperFn =>
    (plan) => {
      const $connection = plan();
      const $select = (
        $connection as unknown as { getSubplan(): PgSelectStep }
      ).getSubplan();

      const $observer = context().get("observer");
      const $userId = lambda($observer, (observer) => observer?.id ?? null);
      const userId = $select.placeholder($userId, TYPES.uuid);

      $select.where(
        sql`(
          ${$select.alias}.owner_id = ${userId}
          or exists (
            select 1 from organization_member om
            where om.organization_id = ${$select.alias}.organization_id
              and om.user_id = ${userId}
          )
        )`,
      );

      return $connection;
    },
  [context, lambda, sql, TYPES],
);

/**
 * Scope the organizations connection to the caller's memberships.
 *
 * An organization exists in Arbor only because someone created it, so its
 * existence is not public information. Scoping the root connection does not
 * affect the `Repository.organization` relation, so a public repository page
 * can still show the organization that owns it.
 *
 * This also matches what the app wants: the connection backs the workspace
 * switcher, which should only ever list organizations the caller belongs to.
 */
const scopeOrganizationsToCaller = EXPORTABLE(
  (context, lambda, sql, TYPES): PlanWrapperFn =>
    (plan) => {
      const $connection = plan();
      const $select = (
        $connection as unknown as { getSubplan(): PgSelectStep }
      ).getSubplan();

      const $observer = context().get("observer");
      const $userId = lambda($observer, (observer) => observer?.id ?? null);
      const userId = $select.placeholder($userId, TYPES.uuid);

      $select.where(
        sql`exists (
          select 1 from organization_member om
          where om.organization_id = ${$select.alias}.id
            and om.user_id = ${userId}
        )`,
      );

      return $connection;
    },
  [context, lambda, sql, TYPES],
);

/**
 * Authorization plugin for reading repositories.
 *
 * Covers every field in the schema whose type is `RepositoryConnection`:
 * `Query.repositories`, `Organization.repositories`, and
 * `User.repositoriesByOwnerId`. Scoping only the root would leave the nested
 * paths open, which reads as fixed while it is not.
 *
 * Singular `repository: Repository` fields (on `PullRequest`, `Stack`, and
 * others) are traversals from a row the caller already holds, so they are only
 * as protected as the connection that produced that row. Those connections
 * still need their own scoping; see
 * `plans/2026-07-29-arbor-graphql-read-authorization.md`.
 */
const RepositoryReadPlugin = wrapPlans({
  Query: {
    repositories: scopeToVisible,
    // rows carrying a direct repository_id, scoped by the same visible set
    pullRequests: scopeByRepository(direct),
    stacks: scopeByRepository(direct),
    changes: scopeByRepository(direct),
    pullRequestComments: scopeByRepository(
      viaPullRequest,
      visiblePullRequestIds,
    ),
    pullRequestReviews: scopeByRepository(
      viaPullRequest,
      visiblePullRequestIds,
    ),
    verificationChecks: scopeByRepository(viaChange, visibleChangeIds),
    // not repository-derived, but the same class of cross-account read leak
    agents: scopeAgentsToCaller,
    organizations: scopeOrganizationsToCaller,
  },
  Organization: {
    repositories: scopeToVisible,
  },
  User: {
    repositoriesByOwnerId: scopeToVisible,
  },
});

export default RepositoryReadPlugin;
