import { EXPORTABLE } from "graphile-export";
import { context, sideEffect } from "postgraphile/grafast";
import { wrapPlans } from "postgraphile/utils";

import {
  deletePullRequestFromIndex,
  indexPullRequest,
  isSearchEnabled,
} from "lib/search";

import type { Step } from "postgraphile/grafast";
import type { PlanWrapperFn } from "postgraphile/utils";

/**
 * Index pull request after successful creation.
 */
const indexOnCreate = (): PlanWrapperFn =>
  EXPORTABLE(
    (context, sideEffect, indexPullRequest, isSearchEnabled): PlanWrapperFn =>
      (plan, $record) => {
        if (!isSearchEnabled) return plan();

        const $db = context().get("db");

        sideEffect([$record, $db], async ([record, db]) => {
          if (!record?.id) return;

          const pr = await db.query.pullRequestTable.findFirst({
            where: (table: any, { eq }: any) => eq(table.id, record.id),
            with: { repository: true },
          });

          if (pr?.repository?.organizationId) {
            await indexPullRequest(pr, pr.repository.organizationId);
          }
        });

        return plan();
      },
    [context, sideEffect, indexPullRequest, isSearchEnabled],
  );

/**
 * Re-index pull request after update.
 */
const indexOnUpdate = (): PlanWrapperFn =>
  EXPORTABLE(
    (context, sideEffect, indexPullRequest, isSearchEnabled): PlanWrapperFn =>
      (plan, $record) => {
        if (!isSearchEnabled) return plan();

        const $db = context().get("db");

        sideEffect([$record, $db], async ([record, db]) => {
          if (!record?.id) return;

          const pr = await db.query.pullRequestTable.findFirst({
            where: (table: any, { eq }: any) => eq(table.id, record.id),
            with: { repository: true },
          });

          if (pr?.repository?.organizationId) {
            await indexPullRequest(pr, pr.repository.organizationId);
          }
        });

        return plan();
      },
    [context, sideEffect, indexPullRequest, isSearchEnabled],
  );

/**
 * Remove pull request from index on delete.
 */
const removeOnDelete = (): PlanWrapperFn =>
  EXPORTABLE(
    (
      _context,
      sideEffect,
      deletePullRequestFromIndex,
      isSearchEnabled,
    ): PlanWrapperFn =>
      (plan, _, fieldArgs) => {
        if (!isSearchEnabled) return plan();

        const $input = fieldArgs.getRaw([
          "input",
          "rowId",
        ]) as unknown as Step<string>;

        sideEffect([$input], async ([prId]) => {
          if (prId) {
            await deletePullRequestFromIndex(prId);
          }
        });

        return plan();
      },
    [context, sideEffect, deletePullRequestFromIndex, isSearchEnabled],
  );

/**
 * Search indexing plugin for pull requests.
 * Indexes pull requests in Meilisearch after create/update mutations.
 * Removes pull requests from index on delete.
 */
const PullRequestSearchPlugin = wrapPlans({
  Mutation: {
    createPullRequest: indexOnCreate(),
    updatePullRequest: indexOnUpdate(),
    deletePullRequest: removeOnDelete(),
  },
});

export default PullRequestSearchPlugin;
