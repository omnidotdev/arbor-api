import { EXPORTABLE } from "graphile-export";
import { context, sideEffect } from "postgraphile/grafast";
import { wrapPlans } from "postgraphile/utils";

import { canAdministerProject, canCreateProject } from "./projectAuthorization";

import type { PlanWrapperFn } from "postgraphile/utils";
import type { ProjectRecord } from "./projectAuthorization";

/**
 * Resolve a project to the fields an authorization decision needs: its user
 * owner and, for an organization project, the owning org's IDP id (roles are
 * keyed on the IDP id, not the internal uuid).
 */
const resolveProjectRecord = async (
  db: typeof import("lib/db/db").dbPool,
  projectId: string,
): Promise<ProjectRecord | null> => {
  const project = await db.query.projectTable.findFirst({
    where: (table, { eq }) => eq(table.id, projectId),
    with: { organization: true },
  });

  if (!project) return null;

  return {
    ownerId: project.ownerId,
    organizationIdpId: project.organization?.idpOrganizationId ?? null,
  };
};

/**
 * Resolve the owning org's IDP id for a raw organization uuid (used on create,
 * where no project row exists yet). Null when no organization is given.
 */
const resolveOrganizationIdpId = async (
  db: typeof import("lib/db/db").dbPool,
  organizationId: string | null | undefined,
): Promise<string | null> => {
  if (!organizationId) return null;
  const organization = await db.query.organizationTable.findFirst({
    where: (table, { eq }) => eq(table.id, organizationId),
  });
  if (!organization) throw new Error("Organization not found");
  return organization.idpOrganizationId;
};

/**
 * Whether the caller owns, or has write/admin on, a repository. A confined
 * access token narrows this further at its own enforcement points; here we
 * check the user's underlying permission, matching the repository-relationship
 * write gate.
 */
const hasRepoWriteAccess = async (
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
 * Gate `createProject`. A caller may only create a project they own, and an
 * organization project additionally requires an admin/owner role in that org.
 * The client-supplied `ownerId` is checked against the caller, so a project
 * cannot be minted on behalf of another user.
 */
const validateProjectCreate = EXPORTABLE(
  (
    context,
    sideEffect,
    canCreateProject,
    resolveOrganizationIdpId,
  ): PlanWrapperFn =>
    (plan, _, fieldArgs) => {
      const $ownerId = fieldArgs.getRaw(["input", "project", "ownerId"]);
      const $organizationId = fieldArgs.getRaw([
        "input",
        "project",
        "organizationId",
      ]);
      const $observer = context().get("observer");
      const $organizations = context().get("organizations");
      const $db = context().get("db");

      sideEffect(
        [$ownerId, $organizationId, $observer, $organizations, $db],
        async ([ownerId, organizationId, observer, organizations, db]) => {
          if (!observer) throw new Error("Unauthorized");

          const organizationIdpId = await resolveOrganizationIdpId(
            db,
            organizationId as string | null | undefined,
          );

          const allowed = canCreateProject(
            { ownerId: ownerId as string, organizationIdpId },
            { observerId: observer.id, organizations },
          );
          if (!allowed) throw new Error("Unauthorized");
        },
      );

      return plan();
    },
  [context, sideEffect, canCreateProject, resolveOrganizationIdpId],
);

/**
 * Gate an existing-project mutation (`updateProject` / `deleteProject`) by
 * whether the caller may administer the project addressed by `rowId`.
 */
const validateProjectAdmin = EXPORTABLE(
  (
    context,
    sideEffect,
    canAdministerProject,
    resolveProjectRecord,
  ): PlanWrapperFn =>
    (plan, _, fieldArgs) => {
      const $rowId = fieldArgs.getRaw(["input", "rowId"]);
      const $observer = context().get("observer");
      const $organizations = context().get("organizations");
      const $db = context().get("db");

      sideEffect(
        [$rowId, $observer, $organizations, $db],
        async ([rowId, observer, organizations, db]) => {
          if (!observer) throw new Error("Unauthorized");

          const project = await resolveProjectRecord(db, rowId as string);
          if (!project) throw new Error("Unauthorized");

          const allowed = canAdministerProject(project, {
            observerId: observer.id,
            organizations,
          });
          if (!allowed) throw new Error("Unauthorized");
        },
      );

      return plan();
    },
  [context, sideEffect, canAdministerProject, resolveProjectRecord],
);

/**
 * Gate `createProjectRepository` (attaching a repository to a project). The
 * caller must be able to administer the project AND have write access to the
 * repository, so a project cannot pin a repository its curator does not
 * control, and a private repository cannot be surfaced by someone without
 * access to it.
 */
const validateMembershipCreate = EXPORTABLE(
  (
    context,
    sideEffect,
    canAdministerProject,
    resolveProjectRecord,
    hasRepoWriteAccess,
  ): PlanWrapperFn =>
    (plan, _, fieldArgs) => {
      const $projectId = fieldArgs.getRaw([
        "input",
        "projectRepository",
        "projectId",
      ]);
      const $repositoryId = fieldArgs.getRaw([
        "input",
        "projectRepository",
        "repositoryId",
      ]);
      const $observer = context().get("observer");
      const $organizations = context().get("organizations");
      const $db = context().get("db");

      sideEffect(
        [$projectId, $repositoryId, $observer, $organizations, $db],
        async ([projectId, repositoryId, observer, organizations, db]) => {
          if (!observer) throw new Error("Unauthorized");

          const project = await resolveProjectRecord(db, projectId as string);
          if (!project) throw new Error("Unauthorized");

          const canCurate = canAdministerProject(project, {
            observerId: observer.id,
            organizations,
          });
          if (!canCurate) throw new Error("Unauthorized");

          const canWrite = await hasRepoWriteAccess(
            db,
            repositoryId as string,
            observer.id,
          );
          if (!canWrite) throw new Error("Unauthorized");
        },
      );

      return plan();
    },
  [
    context,
    sideEffect,
    canAdministerProject,
    resolveProjectRecord,
    hasRepoWriteAccess,
  ],
);

/**
 * Gate an existing-membership mutation (`updateProjectRepository` /
 * `deleteProjectRepository`) by whether the caller may administer the project
 * the membership row belongs to.
 */
const validateMembershipAdmin = EXPORTABLE(
  (
    context,
    sideEffect,
    canAdministerProject,
    resolveProjectRecord,
  ): PlanWrapperFn =>
    (plan, _, fieldArgs) => {
      const $rowId = fieldArgs.getRaw(["input", "rowId"]);
      const $observer = context().get("observer");
      const $organizations = context().get("organizations");
      const $db = context().get("db");

      sideEffect(
        [$rowId, $observer, $organizations, $db],
        async ([rowId, observer, organizations, db]) => {
          if (!observer) throw new Error("Unauthorized");

          const membership = await db.query.projectRepositoryTable.findFirst({
            where: (table, { eq }) => eq(table.id, rowId as string),
          });
          if (!membership) throw new Error("Unauthorized");

          const project = await resolveProjectRecord(db, membership.projectId);
          if (!project) throw new Error("Unauthorized");

          const allowed = canAdministerProject(project, {
            observerId: observer.id,
            organizations,
          });
          if (!allowed) throw new Error("Unauthorized");
        },
      );

      return plan();
    },
  [context, sideEffect, canAdministerProject, resolveProjectRecord],
);

/**
 * Authorization plugin for projects and project membership. Without it every
 * project mutation is auto-generated and ungated, letting any authenticated
 * caller create projects owned by others and attach arbitrary repositories to
 * arbitrary projects.
 */
const ProjectPlugin = wrapPlans({
  Mutation: {
    createProject: validateProjectCreate,
    updateProject: validateProjectAdmin,
    deleteProject: validateProjectAdmin,
    createProjectRepository: validateMembershipCreate,
    updateProjectRepository: validateMembershipAdmin,
    deleteProjectRepository: validateMembershipAdmin,
  },
});

export default ProjectPlugin;
