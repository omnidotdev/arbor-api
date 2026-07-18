import { EXPORTABLE } from "graphile-export";
import { context, sideEffect } from "postgraphile/grafast";
import { wrapPlans } from "postgraphile/utils";

import { gitService } from "lib/git";
import { getOwnerSlug } from "./GitTypes.plugin";

import type { Step } from "postgraphile/grafast";
import type { PlanWrapperFn } from "postgraphile/utils";

/**
 * Keep the bare repository's on-disk HEAD in sync with the default branch.
 *
 * The generic updateRepository mutation can change repository.defaultBranch in
 * the database without touching the on-disk HEAD, so a fresh `git clone` would
 * still check out the previous default. This side effect points HEAD at the new
 * branch after the row update whenever the patch changes defaultBranch.
 *
 * Best-effort: the sync runs only when defaultBranch is present in the patch,
 * and any failure is logged server-side and never fails the mutation (see
 * gitService.setDefaultBranch, which also refuses a nonexistent branch).
 *
 * The schema is built at boot with makeSchema, so the plan closes over
 * gitService and getOwnerSlug directly.
 */
const syncDefaultBranchOnUpdate = (): PlanWrapperFn =>
  EXPORTABLE(
    (context, sideEffect, gitService, getOwnerSlug): PlanWrapperFn =>
      (plan, _, fieldArgs) => {
        const $rowId = fieldArgs.getRaw([
          "input",
          "rowId",
        ]) as unknown as Step<string>;
        const $defaultBranch = fieldArgs.getRaw([
          "input",
          "patch",
          "defaultBranch",
        ]) as unknown as Step<string | null | undefined>;
        const $db = context().get("db");

        const $result = plan();

        // Depend on $result so the sync runs after the row update resolves
        sideEffect(
          [$result, $rowId, $defaultBranch, $db],
          async ([, rowId, defaultBranch, db]) => {
            // Only fire when the default branch is actually being changed
            if (!defaultBranch) return;

            try {
              const repository = await db.query.repositoryTable.findFirst({
                where: (table, { eq }) => eq(table.id, rowId),
                with: { owner: true, organization: true },
              });

              if (!repository) return;

              const owner = await getOwnerSlug(repository, db);
              if (!owner) return;

              await gitService.setDefaultBranch(
                owner,
                repository.slug,
                defaultBranch,
              );
            } catch (error) {
              console.error(
                "[RepositoryDefaultBranch] HEAD sync failed:",
                error,
              );
            }
          },
        );

        return $result;
      },
    [context, sideEffect, gitService, getOwnerSlug],
  );

/**
 * Default-branch sync plugin for repositories.
 * Syncs the on-disk HEAD when updateRepository changes the default branch.
 */
const RepositoryDefaultBranchPlugin = wrapPlans({
  Mutation: {
    updateRepository: syncDefaultBranchOnUpdate(),
  },
});

export default RepositoryDefaultBranchPlugin;
