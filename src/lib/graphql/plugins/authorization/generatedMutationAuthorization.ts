import { canAdministerProject, canCreateProject } from "./projectAuthorization";

import type { dbPool } from "lib/db/db";
import type { ProjectAdminSubject } from "./projectAuthorization";

/**
 * Authorization decisions for the generated create/update/delete mutations on
 * agents, stacks, changes, verification checks, and pull request reviews.
 *
 * Every decision reads through `AuthorizationLookup` rather than Drizzle
 * directly, so it can be exercised against an in-memory fixture. The grafast
 * wiring in the plugins builds the lookup from the request's db with
 * `createAuthorizationLookup` and calls these.
 *
 * Every refusal throws the same generic `Unauthorized`, whether the row is
 * missing or forbidden, so a refusal never reveals that another workspace's
 * record exists
 */

/** The caller: their user id and the organization roles from their claims */
export type AuthorizationSubject = ProjectAdminSubject;

/** Permission a caller holds on a repository, weakest first */
export type RepositoryAccessLevel = "read" | "write" | "admin";

/** A repository reduced to what an access decision needs */
export interface RepositoryAccessRecord {
  ownerId: string;
  visibility: string;
  /** The owning organization's identity-provider id, or null when personal */
  organizationIdpId: string | null;
}

/** An agent, stack, change, pull request, check, or review, as decisions read them */
export interface AgentRecord {
  ownerId: string;
  organizationIdpId: string | null;
}

export interface StackRecord {
  repositoryId: string;
  authorId: string;
}

export interface ChangeRecord {
  stackId: string;
  repositoryId: string;
}

export interface PullRequestRecord {
  repositoryId: string;
  authorId: string;
}

export interface VerificationCheckRecord {
  changeId: string;
}

export interface PullRequestReviewRecord {
  pullRequestId: string;
  reviewerId: string;
}

export interface RelationshipTypeRecord {
  /** The owning organization's identity-provider id, or null for a global type */
  organizationIdpId: string | null;
}

/** Row lookups the decisions need. Each resolves null for a missing row */
export interface AuthorizationLookup {
  repository(id: string): Promise<RepositoryAccessRecord | null>;
  collaboratorPermission(
    repositoryId: string,
    userId: string,
  ): Promise<string | null>;
  /** Identity-provider id of an organization row, null when it does not exist */
  organizationIdpId(organizationId: string): Promise<string | null>;
  agent(id: string): Promise<AgentRecord | null>;
  stack(id: string): Promise<StackRecord | null>;
  change(id: string): Promise<ChangeRecord | null>;
  pullRequest(id: string): Promise<PullRequestRecord | null>;
  verificationCheck(id: string): Promise<VerificationCheckRecord | null>;
  pullRequestReview(id: string): Promise<PullRequestReviewRecord | null>;
  relationshipType(id: string): Promise<RelationshipTypeRecord | null>;
}

const unauthorized = (): never => {
  throw new Error("Unauthorized");
};

const LEVEL_RANK: Record<RepositoryAccessLevel, number> = {
  read: 1,
  write: 2,
  admin: 3,
};

/**
 * The caller's permission on a repository.
 *
 * Mirrors `canReadRepository` / `canWriteRepository` in lib/git/gitAccess.ts:
 * the owner holds admin; a collaborator holds their stored permission; an
 * organization owner or admin may write and a plain member may read; a public
 * repository is readable by anyone. Null when the caller holds nothing
 */
export const repositoryAccessLevel = (
  repository: RepositoryAccessRecord,
  collaboratorPermission: string | null,
  subject: AuthorizationSubject,
): RepositoryAccessLevel | null => {
  if (repository.ownerId === subject.observerId) return "admin";

  const levels: RepositoryAccessLevel[] = [];

  if (
    collaboratorPermission === "read" ||
    collaboratorPermission === "write" ||
    collaboratorPermission === "admin"
  ) {
    levels.push(collaboratorPermission);
  }

  if (repository.organizationIdpId !== null) {
    const claim = subject.organizations.find(
      (org) => org.id === repository.organizationIdpId,
    );
    if (claim) {
      const isOrgAdmin =
        claim.roles.includes("owner") || claim.roles.includes("admin");
      levels.push(isOrgAdmin ? "write" : "read");
    }
  }

  if (repository.visibility === "public") levels.push("read");

  if (levels.length === 0) return null;

  return levels.reduce((best, level) =>
    LEVEL_RANK[level] > LEVEL_RANK[best] ? level : best,
  );
};

/** Whether a held level satisfies a required one */
export const meetsLevel = (
  held: RepositoryAccessLevel | null,
  required: RepositoryAccessLevel,
): boolean => held !== null && LEVEL_RANK[held] >= LEVEL_RANK[required];

/** Resolve the caller's level on a repository by id (null when missing) */
const accessTo = async (
  lookup: AuthorizationLookup,
  subject: AuthorizationSubject,
  repositoryId: string | null | undefined,
): Promise<RepositoryAccessLevel | null> => {
  if (!repositoryId) return null;

  const repository = await lookup.repository(repositoryId);
  if (!repository) return null;

  const permission = await lookup.collaboratorPermission(
    repositoryId,
    subject.observerId,
  );

  return repositoryAccessLevel(repository, permission, subject);
};

/** Require at least `level` on a repository, refusing otherwise */
const requireAccess = async (
  lookup: AuthorizationLookup,
  subject: AuthorizationSubject,
  repositoryId: string | null | undefined,
  level: RepositoryAccessLevel,
): Promise<void> => {
  if (!meetsLevel(await accessTo(lookup, subject, repositoryId), level)) {
    unauthorized();
  }
};

/**
 * Stack and change status values a caller may set. `merged` is recorded only by
 * the server when a change actually lands (stack.service mergeChange), so a
 * client setting it would fake a merge
 */
const CLIENT_SETTABLE_STATUSES: readonly string[] = ["open", "abandoned"];

const requireClientSettableStatus = (status: unknown, onCreate: boolean) => {
  if (status === undefined || status === null) return;
  if (
    onCreate
      ? status !== "open"
      : !CLIENT_SETTABLE_STATUSES.includes(status as string)
  ) {
    unauthorized();
  }
};

/* Agents */

interface AgentCreateInput {
  ownerId?: string | null;
  organizationId?: string | null;
}

/**
 * `createAgent`: a caller registers agents only for themselves, and an
 * organization agent needs an owner or admin role in that organization (the
 * project and topic rule). A missing organization is refused like a forbidden one
 */
export const authorizeAgentCreate = async (
  lookup: AuthorizationLookup,
  subject: AuthorizationSubject,
  input: AgentCreateInput | null | undefined,
): Promise<void> => {
  if (!input?.ownerId) unauthorized();

  let organizationIdpId: string | null = null;
  if (input?.organizationId) {
    organizationIdpId = await lookup.organizationIdpId(input.organizationId);
    if (!organizationIdpId) unauthorized();
  }

  const allowed = canCreateProject(
    { ownerId: input?.ownerId as string, organizationIdpId },
    subject,
  );
  if (!allowed) unauthorized();
};

/**
 * `updateAgent` / `deleteAgent`: the agent's owner, or an owner or admin of the
 * organization the agent belongs to
 */
export const authorizeAgentAdmin = async (
  lookup: AuthorizationLookup,
  subject: AuthorizationSubject,
  agentId: string | null | undefined,
): Promise<void> => {
  const agent = agentId ? await lookup.agent(agentId) : null;
  if (!agent || !canAdministerProject(agent, subject)) unauthorized();
};

/* Stacks */

interface StackCreateInput {
  repositoryId?: string | null;
  authorId?: string | null;
  authoredByAgentId?: string | null;
  status?: string | null;
}

/**
 * `createStack`: write access to the repository (the `create_stack` MCP tool
 * rule), authored as the caller, attributed only to an agent the caller
 * administers, and created open
 */
export const authorizeStackCreate = async (
  lookup: AuthorizationLookup,
  subject: AuthorizationSubject,
  input: StackCreateInput | null | undefined,
): Promise<void> => {
  if (!input || input.authorId !== subject.observerId) unauthorized();

  requireClientSettableStatus(input?.status, true);

  await requireAccess(lookup, subject, input?.repositoryId, "write");

  if (input?.authoredByAgentId) {
    await authorizeAgentAdmin(lookup, subject, input.authoredByAgentId);
  }
};

/**
 * `updateStack`: write access to the stack's repository. The patch may not mark
 * a stack merged; its repository, author, and agent are fixed after creation
 * (ImmutableReferences.plugin.ts), so only the row's current repository counts
 */
export const authorizeStackUpdate = async (
  lookup: AuthorizationLookup,
  subject: AuthorizationSubject,
  stackId: string | null | undefined,
  patch: { status?: string | null } | null | undefined,
): Promise<void> => {
  const stack = stackId ? await lookup.stack(stackId) : null;
  if (!stack) unauthorized();

  requireClientSettableStatus(patch?.status, false);

  await requireAccess(lookup, subject, stack?.repositoryId, "write");
};

/**
 * `deleteStack`: the stack's author while they still hold write access, or a
 * repository admin. Deleting cascades to every change in the stack, so another
 * writer's stack is not theirs to remove
 */
export const authorizeStackDelete = async (
  lookup: AuthorizationLookup,
  subject: AuthorizationSubject,
  stackId: string | null | undefined,
): Promise<void> => {
  const stack = stackId ? await lookup.stack(stackId) : null;
  if (!stack) return unauthorized();

  const level = await accessTo(lookup, subject, stack.repositoryId);
  const isAuthor = stack.authorId === subject.observerId;

  if (meetsLevel(level, "admin")) return;
  if (isAuthor && meetsLevel(level, "write")) return;

  unauthorized();
};

/* Changes */

interface ChangeCreateInput {
  stackId?: string | null;
  repositoryId?: string | null;
  parentChangeId?: string | null;
  pullRequestId?: string | null;
  status?: string | null;
}

/** A parent change must sit in the same stack, and never be the change itself */
const requireParentInStack = async (
  lookup: AuthorizationLookup,
  parentChangeId: string | null | undefined,
  stackId: string,
  selfId?: string,
): Promise<void> => {
  if (!parentChangeId) return;
  if (parentChangeId === selfId) unauthorized();

  const parent = await lookup.change(parentChangeId);
  if (!parent || parent.stackId !== stackId) unauthorized();
};

/**
 * `createChange`: write access to the stack's repository (the `create_change`
 * MCP tool rule). The change's repository must be the stack's, its parent must
 * be in the same stack, and a linked pull request must be in the same
 * repository: otherwise a change in one workspace could hang off another's
 * stack, or borrow approvals from another repository's pull request
 */
export const authorizeChangeCreate = async (
  lookup: AuthorizationLookup,
  subject: AuthorizationSubject,
  input: ChangeCreateInput | null | undefined,
): Promise<void> => {
  const stack = input?.stackId ? await lookup.stack(input.stackId) : null;
  if (!input || !stack) return unauthorized();

  if (input.repositoryId !== stack.repositoryId) unauthorized();

  requireClientSettableStatus(input.status, true);

  await requireAccess(lookup, subject, stack.repositoryId, "write");

  await requireParentInStack(
    lookup,
    input.parentChangeId,
    input.stackId as string,
  );

  if (input.pullRequestId) {
    const pullRequest = await lookup.pullRequest(input.pullRequestId);
    if (!pullRequest || pullRequest.repositoryId !== stack.repositoryId) {
      unauthorized();
    }
  }
};

/**
 * `updateChange`: write access to the change's repository. The patch may not
 * mark a change merged, and a new parent must be in the same stack
 */
export const authorizeChangeUpdate = async (
  lookup: AuthorizationLookup,
  subject: AuthorizationSubject,
  changeId: string | null | undefined,
  patch:
    | { status?: string | null; parentChangeId?: string | null }
    | null
    | undefined,
): Promise<void> => {
  const change = changeId ? await lookup.change(changeId) : null;
  if (!change) return unauthorized();

  requireClientSettableStatus(patch?.status, false);

  await requireAccess(lookup, subject, change.repositoryId, "write");

  await requireParentInStack(
    lookup,
    patch?.parentChangeId,
    change.stackId,
    changeId as string,
  );
};

/** Require write access to the repository a change belongs to */
const requireChangeWrite = async (
  lookup: AuthorizationLookup,
  subject: AuthorizationSubject,
  changeId: string | null | undefined,
): Promise<void> => {
  const change = changeId ? await lookup.change(changeId) : null;
  if (!change) return unauthorized();

  await requireAccess(lookup, subject, change.repositoryId, "write");
};

/** `deleteChange`: write access to the change's repository */
export const authorizeChangeDelete = requireChangeWrite;

/* Verification checks */

/**
 * `createVerificationCheck`: write access to the change's repository (the
 * `report_verification_check` MCP tool rule). A required check is a merge gate,
 * so reporting one on a change in a repository the caller cannot write would
 * let them pass or block another workspace's merge
 */
export const authorizeVerificationCheckCreate = async (
  lookup: AuthorizationLookup,
  subject: AuthorizationSubject,
  input: { changeId?: string | null } | null | undefined,
): Promise<void> => {
  await requireChangeWrite(lookup, subject, input?.changeId);
};

/** `updateVerificationCheck` / `deleteVerificationCheck`: as for create */
export const authorizeVerificationCheckAdmin = async (
  lookup: AuthorizationLookup,
  subject: AuthorizationSubject,
  checkId: string | null | undefined,
): Promise<void> => {
  const check = checkId ? await lookup.verificationCheck(checkId) : null;
  if (!check) return unauthorized();

  await requireChangeWrite(lookup, subject, check.changeId);
};

/* Pull request reviews */

/**
 * An approval counts toward branch protection's required approvals (and the
 * stack merge gate), so it needs write access to the repository and may not
 * come from the pull request's own author. Any other review state (a comment,
 * a change request) needs only what the caller already had to reach the
 * review: read access
 */
export const authorizeReviewState = async (
  lookup: AuthorizationLookup,
  subject: AuthorizationSubject,
  pullRequestId: string | null | undefined,
  state: string | null | undefined,
): Promise<void> => {
  const pullRequest = pullRequestId
    ? await lookup.pullRequest(pullRequestId)
    : null;
  if (!pullRequest) return unauthorized();

  const required: RepositoryAccessLevel =
    state === "approved" ? "write" : "read";

  await requireAccess(lookup, subject, pullRequest.repositoryId, required);

  if (state === "approved" && pullRequest.authorId === subject.observerId) {
    unauthorized();
  }
};

/**
 * `createPullRequestReview`: reviewed as the caller, on a pull request they can
 * see, meeting the approval rule when the review approves
 */
export const authorizeReviewCreate = async (
  lookup: AuthorizationLookup,
  subject: AuthorizationSubject,
  input:
    | {
        pullRequestId?: string | null;
        reviewerId?: string | null;
        state?: string | null;
      }
    | null
    | undefined,
): Promise<void> => {
  if (!input || input.reviewerId !== subject.observerId) return unauthorized();

  await authorizeReviewState(lookup, subject, input.pullRequestId, input.state);
};

/**
 * `updatePullRequestReview`: only the reviewer edits their review, and a move
 * to `approved` meets the approval rule
 */
export const authorizeReviewUpdate = async (
  lookup: AuthorizationLookup,
  subject: AuthorizationSubject,
  reviewId: string | null | undefined,
  patch: { state?: string | null } | null | undefined,
): Promise<void> => {
  const review = reviewId ? await lookup.pullRequestReview(reviewId) : null;
  if (!review || review.reviewerId !== subject.observerId)
    return unauthorized();

  if (patch?.state === "approved") {
    await authorizeReviewState(
      lookup,
      subject,
      review.pullRequestId,
      "approved",
    );
  }
};

/* Repository relationships */

interface RelationshipCreateInput {
  sourceRepositoryId?: string | null;
  targetRepositoryId?: string | null;
  relationshipTypeId?: string | null;
}

/**
 * `createRepositoryRelationship`: write access to the source repository, read
 * access to the target, and a relationship type that is global or belongs to
 * the source repository's own organization. Checking only the source let a
 * caller link their repository to a private repository in another workspace
 * (surfacing it in their graph) using that workspace's types
 */
export const authorizeRelationshipCreate = async (
  lookup: AuthorizationLookup,
  subject: AuthorizationSubject,
  input: RelationshipCreateInput | null | undefined,
): Promise<void> => {
  if (!input?.sourceRepositoryId || !input.targetRepositoryId) {
    return unauthorized();
  }

  await requireAccess(lookup, subject, input.sourceRepositoryId, "write");
  await requireAccess(lookup, subject, input.targetRepositoryId, "read");

  if (!input.relationshipTypeId) return unauthorized();

  const type = await lookup.relationshipType(input.relationshipTypeId);
  if (!type) return unauthorized();

  if (type.organizationIdpId !== null) {
    const source = await lookup.repository(input.sourceRepositoryId);
    if (source?.organizationIdpId !== type.organizationIdpId) unauthorized();
  }
};

/**
 * Build the lookup from the request's database handle
 */
export const createAuthorizationLookup = (
  db: typeof dbPool,
): AuthorizationLookup => ({
  repository: async (id) => {
    const row = await db.query.repositoryTable.findFirst({
      where: (table, { eq }) => eq(table.id, id),
      columns: { ownerId: true, visibility: true },
      with: { organization: { columns: { idpOrganizationId: true } } },
    });
    if (!row) return null;
    return {
      ownerId: row.ownerId,
      visibility: row.visibility,
      organizationIdpId: row.organization?.idpOrganizationId ?? null,
    };
  },
  collaboratorPermission: async (repositoryId, userId) => {
    const row = await db.query.repositoryCollaboratorTable.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.repositoryId, repositoryId), eq(table.userId, userId)),
      columns: { permission: true },
    });
    return row?.permission ?? null;
  },
  organizationIdpId: async (organizationId) => {
    const row = await db.query.organizationTable.findFirst({
      where: (table, { eq }) => eq(table.id, organizationId),
      columns: { idpOrganizationId: true },
    });
    return row?.idpOrganizationId ?? null;
  },
  agent: async (id) => {
    const row = await db.query.agentTable.findFirst({
      where: (table, { eq }) => eq(table.id, id),
      columns: { ownerId: true },
      with: { organization: { columns: { idpOrganizationId: true } } },
    });
    if (!row) return null;
    return {
      ownerId: row.ownerId,
      organizationIdpId: row.organization?.idpOrganizationId ?? null,
    };
  },
  stack: async (id) =>
    (await db.query.stackTable.findFirst({
      where: (table, { eq }) => eq(table.id, id),
      columns: { repositoryId: true, authorId: true },
    })) ?? null,
  change: async (id) =>
    (await db.query.changeTable.findFirst({
      where: (table, { eq }) => eq(table.id, id),
      columns: { stackId: true, repositoryId: true },
    })) ?? null,
  pullRequest: async (id) =>
    (await db.query.pullRequestTable.findFirst({
      where: (table, { eq }) => eq(table.id, id),
      columns: { repositoryId: true, authorId: true },
    })) ?? null,
  verificationCheck: async (id) =>
    (await db.query.verificationCheckTable.findFirst({
      where: (table, { eq }) => eq(table.id, id),
      columns: { changeId: true },
    })) ?? null,
  pullRequestReview: async (id) =>
    (await db.query.pullRequestReviewTable.findFirst({
      where: (table, { eq }) => eq(table.id, id),
      columns: { pullRequestId: true, reviewerId: true },
    })) ?? null,
  relationshipType: async (id) => {
    const row = await db.query.repositoryRelationshipTypeTable.findFirst({
      where: (table, { eq }) => eq(table.id, id),
      columns: { id: true },
      with: { organization: { columns: { idpOrganizationId: true } } },
    });
    if (!row) return null;
    return { organizationIdpId: row.organization?.idpOrganizationId ?? null };
  },
});
