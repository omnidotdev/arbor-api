import { EXPORTABLE } from "graphile-export";
import { context, sideEffect } from "postgraphile/grafast";
import { wrapPlans } from "postgraphile/utils";

import { deleteRepositoryStorageById } from "lib/git";

import type { Step } from "postgraphile/grafast";
import type { PlanWrapperFn } from "postgraphile/utils";

/**
 * Remove a repository's on-disk git storage on delete.
 *
 * The deleteRepository mutation removes the database row (cascading to related
 * tables) and the search index entry, but leaves the bare repository orphaned
 * on disk. This side effect resolves the owner and slug and removes the storage
 * so nothing is left behind. It mirrors the search plugin's removeOnDelete
 * mechanism, and initialization of storage in RepositoryCreate.plugin.
 *
 * Storage-cleanup failures are logged server-side and never fail the mutation
 * (see deleteRepositoryStorageById).
 */
const removeStorageOnDelete = (): PlanWrapperFn =>
  EXPORTABLE(
    (context, sideEffect, deleteRepositoryStorageById): PlanWrapperFn =>
      (plan, _, fieldArgs) => {
        const $rowId = fieldArgs.getRaw([
          "input",
          "rowId",
        ]) as unknown as Step<string>;
        const $db = context().get("db");

        sideEffect([$rowId, $db], async ([rowId, db]) => {
          await deleteRepositoryStorageById(rowId, db);
        });

        return plan();
      },
    [context, sideEffect, deleteRepositoryStorageById],
  );

/**
 * Storage cleanup plugin for repositories.
 * Removes the on-disk bare repository when a repository is deleted.
 */
const RepositoryDeletePlugin = wrapPlans({
  Mutation: {
    deleteRepository: removeStorageOnDelete(),
  },
});

export default RepositoryDeletePlugin;
