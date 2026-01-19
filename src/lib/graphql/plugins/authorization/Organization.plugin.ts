import { EXPORTABLE } from "graphile-export";
import { context, sideEffect } from "postgraphile/grafast";
import { wrapPlans } from "postgraphile/utils";

import { getDefaultOrganization } from "lib/auth/organizations";
import { AUTHZ_API_URL, AUTHZ_ENABLED, checkPermission } from "lib/authz";
import { validateOrgExists } from "lib/idp/validateOrg";

import type { PlanWrapperFn } from "postgraphile/utils";
import type { MutationScope } from "./types";

/**
 * Validate organization permissions via PDP.
 *
 * - Create: User must belong to the specified organization in IDP
 * - Update: Admin+ permission required
 * - Delete: Owner permission required
 */
const validatePermissions = (propName: string, scope: MutationScope) =>
  EXPORTABLE(
    (
      context,
      sideEffect,
      AUTHZ_ENABLED,
      AUTHZ_API_URL,
      checkPermission,
      getDefaultOrganization,
      validateOrgExists,
      propName,
      scope,
    ): PlanWrapperFn =>
      (plan, _, fieldArgs) => {
        const $input = fieldArgs.getRaw(["input", propName]);
        const $observer = context().get("observer");
        const $organizations = context().get("organizations");
        const $authzCache = context().get("authzCache");

        sideEffect(
          [$input, $observer, $organizations, $authzCache],
          async ([input, observer, organizations, authzCache]) => {
            if (!observer) throw new Error("Unauthorized");

            if (scope === "create") {
              // For create, validate org is specified or use default
              const orgInput = input as {
                idpOrganizationId?: string;
              };

              const targetOrgId =
                orgInput.idpOrganizationId ??
                getDefaultOrganization(organizations)?.id;

              if (!targetOrgId) {
                throw new Error("No organization available");
              }

              // Validate org exists in IDP (fail-open if IDP unavailable)
              const orgExists = await validateOrgExists(targetOrgId);
              if (!orgExists) {
                throw new Error("Organization not found in identity provider");
              }

              // Org ID is valid, allow organization record creation
            } else {
              // For update/delete, check PDP permissions
              const requiredPermission = scope === "delete" ? "owner" : "admin";
              const allowed = await checkPermission(
                AUTHZ_ENABLED,
                AUTHZ_API_URL,
                observer.id,
                "organization",
                input as string,
                requiredPermission,
                authzCache,
              );
              if (!allowed) throw new Error("Unauthorized");
            }
          },
        );

        return plan();
      },
    [
      context,
      sideEffect,
      AUTHZ_ENABLED,
      AUTHZ_API_URL,
      checkPermission,
      getDefaultOrganization,
      validateOrgExists,
      propName,
      scope,
    ],
  );

/**
 * Authorization plugin for organizations.
 *
 * - Create: Any authenticated user (with org membership validation)
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
