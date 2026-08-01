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

/** The row's own primary key, for connections scoped by an id set over themselves */
const own = (alias: unknown) => sql`${alias as never}.id`;

/** Rows reaching their scope through a project */
const viaProject = (alias: unknown) => sql`${alias as never}.project_id`;

/** Rows reaching their scope through a repository relationship */
const viaRelationship = (alias: unknown) =>
  sql`${alias as never}.relationship_id`;

/** Rows reaching their scope through a personal access token */
const viaToken = (alias: unknown) =>
  sql`${alias as never}.personal_access_token_id`;

/** Rows reaching their scope through an organization */
const viaOrganization = (alias: unknown) =>
  sql`${alias as never}.organization_id`;

/**
 * Project ids the caller may see.
 *
 * A project aggregates repositories, so its name and description describe work
 * that may be entirely private. Visibility is ownership or membership of the
 * owning organization, matching agents; there is no public project.
 */
const visibleProjectIds = (userId: unknown) => sql`
  select p.id from project p where (
    p.owner_id = ${userId as never}
    or exists (
      select 1 from organization_member om
      where om.organization_id = p.organization_id and om.user_id = ${userId as never}
    )
  )`;

/**
 * Relationship ids where BOTH ends are visible.
 *
 * The dependency graph is the product, so an edge leaks the existence of a
 * private repository at either end and the id needed to try reaching it. An edge
 * from a public repository to a private one must not be readable.
 */
const visibleRelationshipIds = (userId: unknown) => sql`
  select rr.id from repository_relationship rr
  where rr.source_repository_id in (${visibleRepositoryIds(userId)})
    and rr.target_repository_id in (${visibleRepositoryIds(userId)})`;

/** Personal access token ids belonging to the caller */
const visibleTokenIds = (userId: unknown) =>
  sql`select pat.id from personal_access_token pat where pat.user_id = ${userId as never}`;

/** Organization ids the caller belongs to */
const observerOrganizationIds = (userId: unknown) =>
  sql`select om.organization_id from organization_member om where om.user_id = ${userId as never}`;

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
 * Scope relationship types to the global set plus the caller's organizations.
 *
 * A type is either global (`organization_id` null, shared by everyone) or
 * defined by an organization, and an organization's taxonomy is not public.
 * Cannot use the `in (subquery)` form the other wrappers share, because a null
 * `organization_id` never matches an `in` and the global types would vanish.
 */
const scopeRelationshipTypesToCaller = EXPORTABLE(
  (context, lambda, sql, TYPES, observerOrganizationIds): PlanWrapperFn =>
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
          ${$select.alias}.organization_id is null
          or ${$select.alias}.organization_id in (${observerOrganizationIds(userId) as never})
        )`,
      );

      return $connection;
    },
  [context, lambda, sql, TYPES, observerOrganizationIds],
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
    // more rows carrying a direct repository_id
    externalDependencies: scopeByRepository(direct),
    mergeBatches: scopeByRepository(direct),
    mergeQueueEntries: scopeByRepository(direct),
    repositoryCollaborators: scopeByRepository(direct),
    // the polyrepo graph. An edge is only visible when BOTH ends are
    projects: scopeByRepository(own, visibleProjectIds),
    projectRepositories: scopeByRepository(viaProject, visibleProjectIds),
    repositoryRelationships: scopeByRepository(own, visibleRelationshipIds),
    repositoryRelationshipMetadata: scopeByRepository(
      viaRelationship,
      visibleRelationshipIds,
    ),
    repositoryRelationshipTypes: scopeRelationshipTypesToCaller,
    // a token's repository whitelist is only the token owner's business
    personalAccessTokenRepositories: scopeByRepository(
      viaToken,
      visibleTokenIds,
    ),
    // not repository-derived, but the same class of cross-account read leak
    agents: scopeAgentsToCaller,
    organizations: scopeOrganizationsToCaller,
    organizationMembers: scopeByRepository(
      viaOrganization,
      observerOrganizationIds,
    ),
  },
  Organization: {
    repositories: scopeToVisible,
  },
  User: {
    repositoriesByOwnerId: scopeToVisible,
  },
});

export default RepositoryReadPlugin;
