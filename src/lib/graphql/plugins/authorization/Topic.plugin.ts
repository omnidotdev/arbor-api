import { EXPORTABLE } from "graphile-export";
import { context, sideEffect } from "postgraphile/grafast";
import { wrapPlans } from "postgraphile/utils";

import { canAdministerProject, canCreateProject } from "./projectAuthorization";

import type { PlanWrapperFn } from "postgraphile/utils";
import type { ProjectRecord } from "./projectAuthorization";

/**
 * A topic groups pull requests across repositories into one cross-repo change
 * set. Its ownership model is identical to a project (a user owner, optionally an
 * organization), so the pure owner/org-admin decisions from projectAuthorization
 * apply unchanged; `ProjectRecord` here is just "an owned, optionally-org thing".
 */

const resolveTopicRecord = async (
  db: typeof import("lib/db/db").dbPool,
  topicId: string,
): Promise<ProjectRecord | null> => {
  const topic = await db.query.topicTable.findFirst({
    where: (table, { eq }) => eq(table.id, topicId),
    with: { organization: true },
  });
  if (!topic) return null;
  return {
    ownerId: topic.ownerId,
    organizationIdpId: topic.organization?.idpOrganizationId ?? null,
  };
};

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

/** Whether the caller owns, or has write/admin on, a repository. */
const hasRepoWriteAccess = async (
  db: typeof import("lib/db/db").dbPool,
  repositoryId: string,
  userId: string,
): Promise<boolean> => {
  const repository = await db.query.repositoryTable.findFirst({
    where: (table, { eq }) => eq(table.id, repositoryId),
    with: {
      collaborators: { where: (table, { eq }) => eq(table.userId, userId) },
    },
  });
  if (!repository) return false;
  const collaborator = repository.collaborators[0];
  return (
    repository.ownerId === userId ||
    collaborator?.permission === "write" ||
    collaborator?.permission === "admin"
  );
};

/** Gate `createTopic`: a caller may only create a topic they own, org needs admin. */
const validateTopicCreate = EXPORTABLE(
  (
    context,
    sideEffect,
    canCreateProject,
    resolveOrganizationIdpId,
  ): PlanWrapperFn =>
    (plan, _, fieldArgs) => {
      const $ownerId = fieldArgs.getRaw(["input", "topic", "ownerId"]);
      const $organizationId = fieldArgs.getRaw([
        "input",
        "topic",
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

/** Gate `updateTopic` / `deleteTopic` by whether the caller may administer it. */
const validateTopicAdmin = EXPORTABLE(
  (
    context,
    sideEffect,
    canAdministerProject,
    resolveTopicRecord,
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
          const topic = await resolveTopicRecord(db, rowId as string);
          if (!topic) throw new Error("Unauthorized");
          const allowed = canAdministerProject(topic, {
            observerId: observer.id,
            organizations,
          });
          if (!allowed) throw new Error("Unauthorized");
        },
      );
      return plan();
    },
  [context, sideEffect, canAdministerProject, resolveTopicRecord],
);

/**
 * Gate `createTopicPullRequest` (adding a PR to a topic): the caller must
 * administer the topic AND have write access to the pull request's repository,
 * so a topic cannot pull in a change from a repository the curator does not
 * control.
 */
const validateMembershipCreate = EXPORTABLE(
  (
    context,
    sideEffect,
    canAdministerProject,
    resolveTopicRecord,
    hasRepoWriteAccess,
  ): PlanWrapperFn =>
    (plan, _, fieldArgs) => {
      const $topicId = fieldArgs.getRaw([
        "input",
        "topicPullRequest",
        "topicId",
      ]);
      const $pullRequestId = fieldArgs.getRaw([
        "input",
        "topicPullRequest",
        "pullRequestId",
      ]);
      const $observer = context().get("observer");
      const $organizations = context().get("organizations");
      const $db = context().get("db");

      sideEffect(
        [$topicId, $pullRequestId, $observer, $organizations, $db],
        async ([topicId, pullRequestId, observer, organizations, db]) => {
          if (!observer) throw new Error("Unauthorized");

          const topic = await resolveTopicRecord(db, topicId as string);
          if (!topic) throw new Error("Unauthorized");
          const canCurate = canAdministerProject(topic, {
            observerId: observer.id,
            organizations,
          });
          if (!canCurate) throw new Error("Unauthorized");

          const pullRequest = await db.query.pullRequestTable.findFirst({
            where: (table, { eq }) => eq(table.id, pullRequestId as string),
            columns: { repositoryId: true },
          });
          if (!pullRequest) throw new Error("Unauthorized");

          const canWrite = await hasRepoWriteAccess(
            db,
            pullRequest.repositoryId,
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
    resolveTopicRecord,
    hasRepoWriteAccess,
  ],
);

/** Gate `updateTopicPullRequest` / `deleteTopicPullRequest` by topic admin. */
const validateMembershipAdmin = EXPORTABLE(
  (
    context,
    sideEffect,
    canAdministerProject,
    resolveTopicRecord,
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
          const membership = await db.query.topicPullRequestTable.findFirst({
            where: (table, { eq }) => eq(table.id, rowId as string),
          });
          if (!membership) throw new Error("Unauthorized");
          const topic = await resolveTopicRecord(db, membership.topicId);
          if (!topic) throw new Error("Unauthorized");
          const allowed = canAdministerProject(topic, {
            observerId: observer.id,
            organizations,
          });
          if (!allowed) throw new Error("Unauthorized");
        },
      );
      return plan();
    },
  [context, sideEffect, canAdministerProject, resolveTopicRecord],
);

/**
 * Authorization plugin for topics and topic membership. Without it every topic
 * mutation is auto-generated and ungated, letting any caller create topics owned
 * by others or attach arbitrary pull requests to arbitrary topics.
 */
const TopicPlugin = wrapPlans({
  Mutation: {
    createTopic: validateTopicCreate,
    updateTopic: validateTopicAdmin,
    deleteTopic: validateTopicAdmin,
    createTopicPullRequest: validateMembershipCreate,
    updateTopicPullRequest: validateMembershipAdmin,
    deleteTopicPullRequest: validateMembershipAdmin,
  },
});

export default TopicPlugin;
