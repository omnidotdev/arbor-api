import { EXPORTABLE } from "graphile-export";
import { context, sideEffect } from "postgraphile/grafast";
import { wrapPlans } from "postgraphile/utils";

import {
  deleteRepositoryFromIndex,
  indexRepository,
  isSearchEnabled,
} from "lib/search";

import type { Step } from "postgraphile/grafast";
import type { PlanWrapperFn } from "postgraphile/utils";

/**
 * Index repository after successful creation.
 */
const indexOnCreate = (): PlanWrapperFn =>
  EXPORTABLE(
    (context, sideEffect, indexRepository, isSearchEnabled): PlanWrapperFn =>
      (plan, $record) => {
        if (!isSearchEnabled) return plan();

        const $db = context().get("db");

        sideEffect([$record, $db], async ([record, db]) => {
          if (!record?.id) return;

          const repo = await db.query.repositoryTable.findFirst({
            // biome-ignore lint/suspicious/noExplicitAny: drizzle callback types
            where: (table: any, { eq }: any) => eq(table.id, record.id),
          });

          if (repo?.organizationId) {
            await indexRepository(repo, repo.organizationId);
          }
        });

        return plan();
      },
    [context, sideEffect, indexRepository, isSearchEnabled],
  );

/**
 * Re-index repository after update.
 */
const indexOnUpdate = (): PlanWrapperFn =>
  EXPORTABLE(
    (context, sideEffect, indexRepository, isSearchEnabled): PlanWrapperFn =>
      (plan, $record) => {
        if (!isSearchEnabled) return plan();

        const $db = context().get("db");

        sideEffect([$record, $db], async ([record, db]) => {
          if (!record?.id) return;

          const repo = await db.query.repositoryTable.findFirst({
            // biome-ignore lint/suspicious/noExplicitAny: drizzle callback types
            where: (table: any, { eq }: any) => eq(table.id, record.id),
          });

          if (repo?.organizationId) {
            await indexRepository(repo, repo.organizationId);
          }
        });

        return plan();
      },
    [context, sideEffect, indexRepository, isSearchEnabled],
  );

/**
 * Remove repository from index on delete.
 */
const removeOnDelete = (): PlanWrapperFn =>
  EXPORTABLE(
    (
      _context,
      sideEffect,
      deleteRepositoryFromIndex,
      isSearchEnabled,
    ): PlanWrapperFn =>
      (plan, _, fieldArgs) => {
        if (!isSearchEnabled) return plan();

        const $input = fieldArgs.getRaw([
          "input",
          "rowId",
        ]) as unknown as Step<string>;

        sideEffect([$input], async ([repoId]) => {
          if (repoId) {
            await deleteRepositoryFromIndex(repoId);
          }
        });

        return plan();
      },
    [context, sideEffect, deleteRepositoryFromIndex, isSearchEnabled],
  );

/**
 * Search indexing plugin for repositories.
 * Indexes repositories in Meilisearch after create/update mutations.
 * Removes repositories from index on delete.
 */
const RepositorySearchPlugin = wrapPlans({
  Mutation: {
    createRepository: indexOnCreate(),
    updateRepository: indexOnUpdate(),
    deleteRepository: removeOnDelete(),
  },
});

export default RepositorySearchPlugin;
