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
  },
  Organization: {
    repositories: scopeToVisible,
  },
  User: {
    repositoriesByOwnerId: scopeToVisible,
  },
});

export default RepositoryReadPlugin;
