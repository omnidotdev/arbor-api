import { EXPORTABLE } from "graphile-export";
import { context, sideEffect } from "postgraphile/grafast";
import { wrapPlans } from "postgraphile/utils";

import {
  BASIC_TIER_MAX_ADMINS,
  BASIC_TIER_MAX_MEMBERS,
  FREE_TIER_MAX_ADMINS,
  FREE_TIER_MAX_MEMBERS,
  billingBypassSlugs,
} from "./constants";

import type { InsertOrganizationMember } from "lib/db/schema";
import type { PlanWrapperFn } from "postgraphile/utils";

/**
 * Validate organization member permissions for create and update.
 *
 * Team management requires admin+ role.
 * - Create: Admin+ can add members (with tier limits)
 * - Update: Admin+ can change roles (except owner roles)
 *
 * Special rules:
 * - Cannot modify owner roles
 * - Tier-based limits on members and admins
 */
const validatePermissions = (propName: string, scope: "create" | "update") =>
  EXPORTABLE(
    (
      context,
      sideEffect,
      propName,
      scope,
      FREE_TIER_MAX_MEMBERS,
      FREE_TIER_MAX_ADMINS,
      BASIC_TIER_MAX_MEMBERS,
      BASIC_TIER_MAX_ADMINS,
      billingBypassSlugs,
    ): PlanWrapperFn =>
      (plan, _, fieldArgs) => {
        const $input = fieldArgs.getRaw(["input", propName]);
        const $observer = context().get("observer");
        const $db = context().get("db");

        sideEffect([$input, $observer, $db], async ([input, observer, db]) => {
          if (!observer) throw new Error("Unauthorized");

          if (scope === "create") {
            const organizationId = (input as InsertOrganizationMember)
              .organizationId;
            const newMemberUserId = (input as InsertOrganizationMember).userId;
            const newMemberRole = (input as InsertOrganizationMember).role;

            const organization = await db.query.organizationTable.findFirst({
              where: (table, { eq }) => eq(table.id, organizationId),
              with: {
                organizationMembers: true,
              },
            });

            if (!organization) throw new Error("Unauthorized");

            // Special case: Allow adding yourself as owner to an empty organization (initial setup)
            const isInitialOwnerSetup =
              organization.organizationMembers.length === 0 &&
              newMemberUserId === observer.id &&
              newMemberRole === "owner";

            if (!isInitialOwnerSetup) {
              // Verify caller is a member and has admin+ role
              const callerMembership = organization.organizationMembers.find(
                (om) => om.userId === observer.id,
              );

              if (!callerMembership) throw new Error("Unauthorized");
              if (callerMembership.role === "member")
                throw new Error("Unauthorized");
            }

            // Bypass tier limits for exempt organizations
            if (!billingBypassSlugs.includes(organization.slug)) {
              // Tier-based member limits
              if (organization.tier === "free") {
                if (
                  organization.organizationMembers.length >=
                  FREE_TIER_MAX_MEMBERS
                )
                  throw new Error("Maximum number of members reached");

                const numberOfAdmins = organization.organizationMembers.filter(
                  (member) => member.role !== "member",
                ).length;

                if (newMemberRole && newMemberRole !== "member") {
                  if (numberOfAdmins >= FREE_TIER_MAX_ADMINS)
                    throw new Error("Maximum number of admins reached");
                }
              }

              if (organization.tier === "basic") {
                if (
                  organization.organizationMembers.length >=
                  BASIC_TIER_MAX_MEMBERS
                )
                  throw new Error("Maximum number of members reached");

                const numberOfAdmins = organization.organizationMembers.filter(
                  (member) => member.role !== "member",
                ).length;

                if (newMemberRole && newMemberRole !== "member") {
                  if (numberOfAdmins >= BASIC_TIER_MAX_ADMINS)
                    throw new Error("Maximum number of admins reached");
                }
              }
            }
          } else {
            // For update, input is the patch object with organizationId and userId
            const targetOrganizationId = (input as InsertOrganizationMember)
              .organizationId;
            const targetUserId = (input as InsertOrganizationMember).userId;

            const organization = await db.query.organizationTable.findFirst({
              where: (table, { eq }) => eq(table.id, targetOrganizationId),
              with: {
                organizationMembers: true,
              },
            });

            if (!organization) throw new Error("Unauthorized");

            // Verify caller is a member and has admin+ role
            const callerMembership = organization.organizationMembers.find(
              (om) => om.userId === observer.id,
            );

            if (!callerMembership) throw new Error("Unauthorized");
            if (callerMembership.role === "member")
              throw new Error("Unauthorized");

            // Find the target member
            const targetMember = organization.organizationMembers.find(
              (om) => om.userId === targetUserId,
            );

            if (!targetMember) throw new Error("Not found");

            // Cannot modify owners
            if (targetMember.role === "owner") {
              throw new Error("Cannot modify owner");
            }

            // Check tier limits for admin promotions (bypass for exempt organizations)
            const newRole = (input as InsertOrganizationMember).role;

            if (
              newRole &&
              newRole !== "member" &&
              !billingBypassSlugs.includes(organization.slug)
            ) {
              const numberOfAdmins = organization.organizationMembers.filter(
                (member) => member.role !== "member",
              ).length;

              // If promoting to admin/owner, check limits
              // (but exclude current target if they're already an admin)
              const currentIsAdmin = targetMember.role !== "member";
              const effectiveAdminCount = currentIsAdmin
                ? numberOfAdmins
                : numberOfAdmins + 1;

              if (
                organization.tier === "free" &&
                effectiveAdminCount > FREE_TIER_MAX_ADMINS
              )
                throw new Error("Maximum number of admins reached");

              if (
                organization.tier === "basic" &&
                effectiveAdminCount > BASIC_TIER_MAX_ADMINS
              )
                throw new Error("Maximum number of admins reached");
            }

            // Cannot promote to owner
            if (newRole === "owner") {
              throw new Error("Cannot promote to owner");
            }
          }
        });

        return plan();
      },
    [
      context,
      sideEffect,
      propName,
      scope,
      FREE_TIER_MAX_MEMBERS,
      FREE_TIER_MAX_ADMINS,
      BASIC_TIER_MAX_MEMBERS,
      BASIC_TIER_MAX_ADMINS,
      billingBypassSlugs,
    ],
  );

/**
 * Validate organization member delete permissions.
 *
 * Delete mutation has userId and organizationId directly on input (not nested in patch).
 * - Admin+ can remove members (except owners)
 */
const validateDeletePermissions = (): PlanWrapperFn =>
  EXPORTABLE(
    (context, sideEffect): PlanWrapperFn =>
      (plan, _, fieldArgs) => {
        const $organizationId = fieldArgs.getRaw(["input", "organizationId"]);
        const $userId = fieldArgs.getRaw(["input", "userId"]);
        const $observer = context().get("observer");
        const $db = context().get("db");

        sideEffect(
          [$organizationId, $userId, $observer, $db],
          async ([organizationId, userId, observer, db]) => {
            if (!observer) throw new Error("Unauthorized");

            const organization = await db.query.organizationTable.findFirst({
              where: (table, { eq }) => eq(table.id, organizationId),
              with: {
                organizationMembers: true,
              },
            });

            if (!organization) throw new Error("Unauthorized");

            // Verify caller is a member and has admin+ role
            const callerMembership = organization.organizationMembers.find(
              (om) => om.userId === observer.id,
            );

            if (!callerMembership) throw new Error("Unauthorized");
            if (callerMembership.role === "member")
              throw new Error("Unauthorized");

            // Find the target member
            const targetMember = organization.organizationMembers.find(
              (om) => om.userId === userId,
            );

            if (!targetMember) throw new Error("Not found");

            // Cannot remove owners
            if (targetMember.role === "owner") {
              throw new Error("Cannot remove owner");
            }
          },
        );

        return plan();
      },
    [context, sideEffect],
  );

/**
 * Authorization plugin for organization members (team management).
 *
 * Enforces admin+ requirement for team management.
 * Protects owner roles from modification.
 * Enforces tier-based member and admin limits.
 */
const OrganizationMemberPlugin = wrapPlans({
  Mutation: {
    createOrganizationMember: validatePermissions(
      "organizationMember",
      "create",
    ),
    updateOrganizationMember: validatePermissions("patch", "update"),
    deleteOrganizationMember: validateDeletePermissions(),
  },
});

export default OrganizationMemberPlugin;
