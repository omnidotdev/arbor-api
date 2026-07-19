import { EXPORTABLE } from "graphile-export";
import { TYPES } from "postgraphile/@dataplan/pg";
import { context, lambda, sideEffect } from "postgraphile/grafast";
import { sql } from "postgraphile/pg-sql2";
import { wrapPlans } from "postgraphile/utils";

import type { PgSelectRowsStep } from "postgraphile/@dataplan/pg";
import type { PlanWrapperFn } from "postgraphile/utils";

/**
 * Scope the personalAccessTokens connection to the authenticated observer.
 *
 * Injects a mandatory `user_id = <observer>` predicate onto the underlying
 * select so a user only ever sees their own tokens. When unauthenticated the
 * observer id is null, so the predicate matches no rows (fails closed).
 */
const scopeToObserver = EXPORTABLE(
  (context, lambda, sql, TYPES): PlanWrapperFn =>
    (plan) => {
      const $connection = plan();
      // The connection field plans a ConnectionStep wrapping a PgSelectRowsStep;
      // reach through to the underlying select to add a mandatory predicate
      const $select = (
        $connection as unknown as { getSubplan(): PgSelectRowsStep }
      )
        .getSubplan()
        .getClassStep();
      const $observer = context().get("observer");
      const $userId = lambda($observer, (observer) => observer?.id ?? null);

      $select.where(
        sql`${$select.alias}.user_id = ${$select.placeholder($userId, TYPES.uuid)}`,
      );

      return $connection;
    },
  [context, lambda, sql, TYPES],
);

/**
 * Authorize deletePersonalAccessToken (revoke) to the token's owner only.
 *
 * The delete input is the token rowId. The row is loaded and the operation is
 * rejected unless it belongs to the authenticated observer.
 */
const authorizeDelete = EXPORTABLE(
  (context, sideEffect): PlanWrapperFn =>
    (plan, _, fieldArgs) => {
      const $rowId = fieldArgs.getRaw(["input", "rowId"]);
      const $observer = context().get("observer");
      const $db = context().get("db");

      sideEffect([$rowId, $observer, $db], async ([rowId, observer, db]) => {
        if (!observer) throw new Error("Unauthorized");

        const token = await db.query.personalAccessTokenTable.findFirst({
          where: (table, { eq }) => eq(table.id, rowId as string),
        });

        // Generic Unauthorized whether the row is missing or owned by another
        // user, so token existence is never leaked
        if (!token || token.userId !== observer.id)
          throw new Error("Unauthorized");
      });

      return plan();
    },
  [context, sideEffect],
);

/**
 * Authorization plugin for personal access tokens.
 *
 * - List: scoped to the authenticated user's own tokens
 * - Delete (revoke): owner only
 *
 * Creation is handled by the custom createPersonalAccessToken mutation; the
 * auto-generated create/update mutations and the tokenHash column are hidden
 * via smart tags.
 */
const PersonalAccessTokenPlugin = wrapPlans({
  Query: {
    personalAccessTokens: scopeToObserver,
  },
  Mutation: {
    deletePersonalAccessToken: authorizeDelete,
  },
});

export default PersonalAccessTokenPlugin;
