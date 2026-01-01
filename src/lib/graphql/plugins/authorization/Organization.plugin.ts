import { EXPORTABLE } from "graphile-export";
import { context, sideEffect } from "postgraphile/grafast";
import { wrapPlans } from "postgraphile/utils";

import type { PlanWrapperFn } from "postgraphile/utils";
import type { MutationScope } from "./types";

/**
 * Validate organization permissions.
 *
 * - Create: Any authenticated user can create an organization
 * - Update: Admin+ can update organization settings
 * - Delete: Owner only (cannot be delegated)
 */
const validatePermissions = (propName: string, scope: MutationScope) =>
  EXPORTABLE(
    (context, sideEffect, propName, scope): PlanWrapperFn =>
      (plan, _, fieldArgs) => {
        const $input = fieldArgs.getRaw(["input", propName]);
        const $observer = context().get("observer");
        const $db = context().get("db");

        sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
          if (!observer) throw new Error("Unauthorized");

          if (scope !== "create") {
            const organization = await db.query.organizationTable.findFirst({
              where: (table, { eq }) => eq(table.id, input),
              with: {
                organizationMembers: {
                  where: (table, { eq }) => eq(table.userId, observer.id),
                },
              },
            });

            if (!organization || !organization.organizationMembers.length)
              throw new Error("Unauthorized");

            const role = organization.organizationMembers[0].role;

            if (scope === "delete") {
              // only owner can delete organization
              if (role !== "owner") throw new Error("Unauthorized");
            } else if (scope === "update") {
              // admin+ can update organization
              if (role === "member") throw new Error("Unauthorized");
            }
          }
        });

        return plan();
      },
    [context, sideEffect, propName, scope],
  );

/**
 * Authorization plugin for organizations.
 *
 * - Create: Any authenticated user
 * - Update: Admin+ role required
 * - Delete: Owner only
 */
const OrganizationPlugin = wrapPlans({
  Mutation: {
    createOrganization: validatePermissions("organization", "create"),
    updateOrganization: validatePermissions("rowId", "update"),
    deleteOrganization: validatePermissions("rowId", "delete"),
  },
});

export default OrganizationPlugin;
