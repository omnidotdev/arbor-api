import { EXPORTABLE } from "graphile-export";
import { context, sideEffect } from "postgraphile/grafast";
import { wrapPlans } from "postgraphile/utils";

import {
  BASIC_TIER_MAX_REPOSITORIES,
  FREE_TIER_MAX_REPOSITORIES,
  billingBypassSlugs,
} from "./constants";

import type { InsertRepository } from "lib/db/schema";
import type { PlanWrapperFn } from "postgraphile/utils";
import type { MutationScope } from "./types";

/**
 * Validate repository permissions for update/delete.
 *
 * - Update: Owner or admin collaborator can update
 * - Delete: Owner only
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

          // Update or delete
          const repository = await db.query.repositoryTable.findFirst({
            where: (table, { eq }) => eq(table.id, input),
            with: {
              collaborators: {
                where: (table, { eq }) => eq(table.userId, observer.id),
              },
            },
          });

          if (!repository) throw new Error("Unauthorized");

          const isOwner = repository.ownerId === observer.id;
          const collaborator = repository.collaborators[0];
          const isAdminCollaborator = collaborator?.permission === "admin";

          if (scope === "delete") {
            // Only owner can delete
            if (!isOwner) throw new Error("Unauthorized");
          } else if (scope === "update") {
            // Owner or admin collaborator can update
            if (!isOwner && !isAdminCollaborator)
              throw new Error("Unauthorized");
          }
        });

        return plan();
      },
    [context, sideEffect, propName, scope],
  );

/**
 * Wrapper for createRepository that validates permissions and tier limits.
 *
 * Note: Git repository initialization is handled by the custom
 * createRepositoryWithGit mutation in RepositoryCreate.plugin.ts.
 * This wrapper only validates tier limits for the auto-generated mutation.
 */
const createRepositoryWrapper = EXPORTABLE(
  (
    context,
    sideEffect,
    FREE_TIER_MAX_REPOSITORIES,
    BASIC_TIER_MAX_REPOSITORIES,
    billingBypassSlugs,
  ): PlanWrapperFn =>
    (plan, _, fieldArgs) => {
      const $input = fieldArgs.getRaw(["input", "repository"]);
      const $observer = context().get("observer");
      const $db = context().get("db");

      // Pre-mutation: validate permissions and tier limits
      sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
        if (!observer) throw new Error("Unauthorized");

        const organizationId = (input as InsertRepository).organizationId;

        // Personal repos have no tier limits
        if (!organizationId) return;

        const organization = await db.query.organizationTable.findFirst({
          where: (table, { eq }) => eq(table.id, organizationId),
          with: {
            organizationMembers: {
              where: (table, { eq }) => eq(table.userId, observer.id),
            },
            repositories: true,
          },
        });

        if (!organization) throw new Error("Unauthorized");

        // Must be a member to create repos in org
        if (!organization.organizationMembers.length)
          throw new Error("Unauthorized");

        // Bypass tier limits for exempt organizations
        if (!billingBypassSlugs.includes(organization.slug)) {
          if (organization.tier === "free") {
            if (organization.repositories.length >= FREE_TIER_MAX_REPOSITORIES)
              throw new Error("Maximum number of repositories reached");
          }

          if (organization.tier === "basic") {
            if (organization.repositories.length >= BASIC_TIER_MAX_REPOSITORIES)
              throw new Error("Maximum number of repositories reached");
          }
        }
      });

      return plan();
    },
  [
    context,
    sideEffect,
    FREE_TIER_MAX_REPOSITORIES,
    BASIC_TIER_MAX_REPOSITORIES,
    billingBypassSlugs,
  ],
);

/**
 * Authorization plugin for repositories.
 *
 * - Create: Any authenticated user (with tier limits for org repos)
 *   + Auto-initializes git repository on disk after creation
 * - Update: Owner or admin collaborator
 * - Delete: Owner only
 */
const RepositoryPlugin = wrapPlans({
  Mutation: {
    createRepository: createRepositoryWrapper,
    updateRepository: validatePermissions("rowId", "update"),
    deleteRepository: validatePermissions("rowId", "delete"),
  },
});

export default RepositoryPlugin;
