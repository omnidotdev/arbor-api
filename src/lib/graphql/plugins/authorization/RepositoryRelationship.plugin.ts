import { EXPORTABLE } from "graphile-export";
import { context, sideEffect } from "postgraphile/grafast";
import { wrapPlans } from "postgraphile/utils";

import type { InsertRepositoryRelationship } from "lib/db/schema";
import type { PlanWrapperFn } from "postgraphile/utils";
import type { MutationScope } from "./types";

/**
 * Check if user has write access to a repository.
 */
const hasWriteAccess = async (
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
  const collaborator = repository.collaborators[0];
  const hasWritePermission =
    collaborator?.permission === "write" ||
    collaborator?.permission === "admin";

  return isOwner || hasWritePermission;
};

/**
 * Validate repository relationship permissions.
 *
 * - Create: Requires write access to source repository
 * - Update: Requires write access to source repository
 * - Delete: Requires write access to source repository
 */
const validatePermissions = (propName: string, scope: MutationScope) =>
  EXPORTABLE(
    (context, sideEffect, propName, scope, hasWriteAccess): PlanWrapperFn =>
      (plan, _, fieldArgs) => {
        const $input = fieldArgs.getRaw(["input", propName]);
        const $observer = context().get("observer");
        const $db = context().get("db");

        sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
          if (!observer) throw new Error("Unauthorized");

          if (scope === "create") {
            const { sourceRepositoryId } =
              input as InsertRepositoryRelationship;

            if (!sourceRepositoryId) throw new Error("Unauthorized");

            const canWrite = await hasWriteAccess(
              db,
              sourceRepositoryId,
              observer.id,
            );
            if (!canWrite) throw new Error("Unauthorized");
          } else {
            // Update or delete - fetch the relationship first
            const relationship =
              await db.query.repositoryRelationshipTable.findFirst({
                where: (table, { eq }) => eq(table.id, input),
              });

            if (!relationship) throw new Error("Unauthorized");

            const canWrite = await hasWriteAccess(
              db,
              relationship.sourceRepositoryId,
              observer.id,
            );
            if (!canWrite) throw new Error("Unauthorized");
          }
        });

        return plan();
      },
    [context, sideEffect, propName, scope, hasWriteAccess],
  );

/**
 * Check if user has admin+ role in organization via IDP claims.
 */
const hasOrgAdminRole = (
  organizations: Array<{ id: string; roles: string[] }>,
  idpOrganizationId: string,
): boolean => {
  const org = organizations.find((o) => o.id === idpOrganizationId);
  if (!org) return false;
  return org.roles.includes("admin") || org.roles.includes("owner");
};

/**
 * Validate repository relationship type permissions.
 *
 * - Create: Any authenticated user can create org-specific types (if admin+ in org)
 * - Update: Admin+ in organization
 * - Delete: Admin+ in organization
 *
 * Note: Organization membership and roles are resolved from IDP JWT claims.
 */
const validateTypePermissions = (propName: string, scope: MutationScope) =>
  EXPORTABLE(
    (context, sideEffect, propName, scope, hasOrgAdminRole): PlanWrapperFn =>
      (plan, _, fieldArgs) => {
        const $input = fieldArgs.getRaw(["input", propName]);
        const $observer = context().get("observer");
        const $organizations = context().get("organizations");
        const $db = context().get("db");

        sideEffect(
          [$input, $observer, $organizations, $db],
          async ([input, observer, organizations, db]) => {
            if (!observer) throw new Error("Unauthorized");

            if (scope === "create") {
              const { organizationId } = input as { organizationId?: string };

              // System-wide types can only be created by system (blocked)
              if (!organizationId) throw new Error("Unauthorized");

              // Fetch organization to get idpOrganizationId
              const organization = await db.query.organizationTable.findFirst({
                where: (table, { eq }) => eq(table.id, organizationId),
              });

              if (!organization) throw new Error("Organization not found");

              // Check admin+ role via IDP claims
              if (
                !hasOrgAdminRole(organizations, organization.idpOrganizationId)
              )
                throw new Error("Unauthorized");
            } else {
              // Update or delete
              const relType =
                await db.query.repositoryRelationshipTypeTable.findFirst({
                  where: (table, { eq }) => eq(table.id, input as string),
                });

              if (!relType) throw new Error("Unauthorized");

              // System-wide types cannot be modified
              const relTypeOrgId = relType.organizationId;
              if (!relTypeOrgId) throw new Error("Unauthorized");

              // Fetch organization to get idpOrganizationId
              const organization = await db.query.organizationTable.findFirst({
                where: (table, { eq }) => eq(table.id, relTypeOrgId),
              });

              if (!organization) throw new Error("Organization not found");

              // Check admin+ role via IDP claims
              if (
                !hasOrgAdminRole(organizations, organization.idpOrganizationId)
              )
                throw new Error("Unauthorized");
            }
          },
        );

        return plan();
      },
    [context, sideEffect, propName, scope, hasOrgAdminRole],
  );

/**
 * Validate external dependency permissions.
 *
 * - Create: Requires write access to repository
 * - Update: Requires write access to repository
 * - Delete: Requires write access to repository
 */
const validateExternalDependencyPermissions = (
  propName: string,
  scope: MutationScope,
) =>
  EXPORTABLE(
    (context, sideEffect, propName, scope, hasWriteAccess): PlanWrapperFn =>
      (plan, _, fieldArgs) => {
        const $input = fieldArgs.getRaw(["input", propName]);
        const $observer = context().get("observer");
        const $db = context().get("db");

        sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
          if (!observer) throw new Error("Unauthorized");

          if (scope === "create") {
            const { repositoryId } = input as { repositoryId: string };

            if (!repositoryId) throw new Error("Unauthorized");

            const canWrite = await hasWriteAccess(
              db,
              repositoryId,
              observer.id,
            );
            if (!canWrite) throw new Error("Unauthorized");
          } else {
            // Update or delete
            const dep = await db.query.externalDependencyTable.findFirst({
              where: (table, { eq }) => eq(table.id, input),
            });

            if (!dep) throw new Error("Unauthorized");

            const canWrite = await hasWriteAccess(
              db,
              dep.repositoryId,
              observer.id,
            );
            if (!canWrite) throw new Error("Unauthorized");
          }
        });

        return plan();
      },
    [context, sideEffect, propName, scope, hasWriteAccess],
  );

/**
 * Authorization plugin for repository relationships.
 */
const RepositoryRelationshipPlugin = wrapPlans({
  Mutation: {
    // Repository relationships
    createRepositoryRelationship: validatePermissions(
      "repositoryRelationship",
      "create",
    ),
    updateRepositoryRelationship: validatePermissions("rowId", "update"),
    deleteRepositoryRelationship: validatePermissions("rowId", "delete"),

    // Relationship types
    createRepositoryRelationshipType: validateTypePermissions(
      "repositoryRelationshipType",
      "create",
    ),
    updateRepositoryRelationshipType: validateTypePermissions(
      "rowId",
      "update",
    ),
    deleteRepositoryRelationshipType: validateTypePermissions(
      "rowId",
      "delete",
    ),

    // External dependencies
    createExternalDependency: validateExternalDependencyPermissions(
      "externalDependency",
      "create",
    ),
    updateExternalDependency: validateExternalDependencyPermissions(
      "rowId",
      "update",
    ),
    deleteExternalDependency: validateExternalDependencyPermissions(
      "rowId",
      "delete",
    ),
  },
});

export default RepositoryRelationshipPlugin;
