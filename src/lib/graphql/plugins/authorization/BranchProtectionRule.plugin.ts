import { EXPORTABLE } from "graphile-export";
import { context, sideEffect } from "postgraphile/grafast";
import { wrapPlans } from "postgraphile/utils";

import type { InsertBranchProtectionRule } from "lib/db/schema";
import type { PlanWrapperFn } from "postgraphile/utils";
import type { MutationScope } from "./types";

/**
 * Whether a user may administer a repository: its owner, or a collaborator with
 * the `admin` permission. Configuring branch protection governs the repository's
 * merge policy, so it is admin-only, not merely write access.
 */
const hasAdminAccess = async (
  db: typeof import("lib/db/db").dbPool,
  repositoryId: string,
  userId: string,
): Promise<boolean> => {
  const repository = await db.query.repositoryTable.findFirst({
    where: (table, { eq }) => eq(table.id, repositoryId),
    with: {
      collaborators: {
        where: (table, { eq }) => eq(table.userId, userId),
      },
    },
  });

  if (!repository) return false;

  const isOwner = repository.ownerId === userId;
  const isAdminCollaborator =
    repository.collaborators[0]?.permission === "admin";

  return isOwner || isAdminCollaborator;
};

/**
 * Gate branch protection rule mutations to repository admins.
 *
 * - Create: requires admin on the input's repository
 * - Update/Delete: requires admin on the existing rule's repository
 *
 * Mirrors the proven repo-derived-entity pattern (RepositoryRelationship.plugin),
 * but requires admin rather than write since a rule governs merge policy.
 */
const validatePermissions = (propName: string, scope: MutationScope) =>
  EXPORTABLE(
    (context, sideEffect, propName, scope, hasAdminAccess): PlanWrapperFn =>
      (plan, _, fieldArgs) => {
        const $input = fieldArgs.getRaw(["input", propName]);
        const $observer = context().get("observer");
        const $db = context().get("db");

        sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
          if (!observer) throw new Error("Unauthorized");

          if (scope === "create") {
            const { repositoryId } = input as InsertBranchProtectionRule;

            if (!repositoryId) throw new Error("Unauthorized");

            const canAdmin = await hasAdminAccess(
              db,
              repositoryId,
              observer.id,
            );
            if (!canAdmin) throw new Error("Unauthorized");
          } else {
            // Update or delete - resolve the rule's repository first
            const rule = await db.query.branchProtectionRuleTable.findFirst({
              where: (table, { eq }) => eq(table.id, input),
            });

            if (!rule) throw new Error("Unauthorized");

            const canAdmin = await hasAdminAccess(
              db,
              rule.repositoryId,
              observer.id,
            );
            if (!canAdmin) throw new Error("Unauthorized");
          }
        });

        return plan();
      },
    [context, sideEffect, propName, scope, hasAdminAccess],
  );

/**
 * Authorization plugin for branch protection rules.
 */
const BranchProtectionRulePlugin = wrapPlans({
  Mutation: {
    createBranchProtectionRule: validatePermissions(
      "branchProtectionRule",
      "create",
    ),
    updateBranchProtectionRule: validatePermissions("rowId", "update"),
    deleteBranchProtectionRule: validatePermissions("rowId", "delete"),
  },
});

export default BranchProtectionRulePlugin;
