import { describe, expect, test } from "bun:test";

import {
  authorizeAgentAdmin,
  authorizeAgentCreate,
  authorizeChangeCreate,
  authorizeChangeDelete,
  authorizeChangeUpdate,
  authorizeRelationshipCreate,
  authorizeReviewCreate,
  authorizeReviewUpdate,
  authorizeStackCreate,
  authorizeStackDelete,
  authorizeStackUpdate,
  authorizeVerificationCheckAdmin,
  authorizeVerificationCheckCreate,
  repositoryAccessLevel,
} from "./generatedMutationAuthorization";

import type {
  AuthorizationLookup,
  AuthorizationSubject,
} from "./generatedMutationAuthorization";

/**
 * Two workspaces. Workspace A (identity-provider id `idp-a`) is owned by alice,
 * with bob as a plain member; carol writes and dave reads its private
 * repository. Workspace B (`idp-b`) belongs to mallory, who probes A with B's
 * ids and A's ids alike
 */
const repositories: Record<
  string,
  { ownerId: string; visibility: string; organizationIdpId: string | null }
> = {
  "repo-a": {
    ownerId: "alice",
    visibility: "private",
    organizationIdpId: "idp-a",
  },
  "repo-a2": {
    ownerId: "alice",
    visibility: "private",
    organizationIdpId: "idp-a",
  },
  "repo-b": {
    ownerId: "mallory",
    visibility: "private",
    organizationIdpId: "idp-b",
  },
  "repo-b-public": {
    ownerId: "mallory",
    visibility: "public",
    organizationIdpId: "idp-b",
  },
  "repo-personal": {
    ownerId: "carol",
    visibility: "private",
    organizationIdpId: null,
  },
};

const collaborators: Record<string, string> = {
  "repo-a:carol": "write",
  "repo-a:dave": "read",
  "repo-a2:carol": "write",
};

const organizations: Record<string, string> = {
  "org-a": "idp-a",
  "org-b": "idp-b",
};

const agents: Record<
  string,
  { ownerId: string; organizationIdpId: string | null }
> = {
  "agent-carol": { ownerId: "carol", organizationIdpId: null },
  "agent-a": { ownerId: "alice", organizationIdpId: "idp-a" },
  "agent-b": { ownerId: "mallory", organizationIdpId: "idp-b" },
};

const stacks: Record<string, { repositoryId: string; authorId: string }> = {
  "stack-a": { repositoryId: "repo-a", authorId: "carol" },
  "stack-a-alice": { repositoryId: "repo-a", authorId: "alice" },
  "stack-b": { repositoryId: "repo-b", authorId: "mallory" },
};

const changes: Record<string, { stackId: string; repositoryId: string }> = {
  "change-a1": { stackId: "stack-a", repositoryId: "repo-a" },
  "change-a2": { stackId: "stack-a", repositoryId: "repo-a" },
  "change-a-other-stack": { stackId: "stack-a-alice", repositoryId: "repo-a" },
  "change-b1": { stackId: "stack-b", repositoryId: "repo-b" },
};

const pullRequests: Record<string, { repositoryId: string; authorId: string }> =
  {
    "pr-a": { repositoryId: "repo-a", authorId: "carol" },
    "pr-a2": { repositoryId: "repo-a2", authorId: "carol" },
    "pr-b": { repositoryId: "repo-b", authorId: "mallory" },
    "pr-b-public": { repositoryId: "repo-b-public", authorId: "mallory" },
  };

const checks: Record<string, { changeId: string }> = {
  "check-a": { changeId: "change-a1" },
  "check-b": { changeId: "change-b1" },
};

const reviews: Record<string, { pullRequestId: string; reviewerId: string }> = {
  "review-dave": { pullRequestId: "pr-a", reviewerId: "dave" },
  "review-alice": { pullRequestId: "pr-a", reviewerId: "alice" },
};

const relationshipTypes: Record<string, { organizationIdpId: string | null }> =
  {
    "type-global": { organizationIdpId: null },
    "type-a": { organizationIdpId: "idp-a" },
    "type-b": { organizationIdpId: "idp-b" },
  };

const lookup: AuthorizationLookup = {
  repository: async (id) => repositories[id] ?? null,
  collaboratorPermission: async (repositoryId, userId) =>
    collaborators[`${repositoryId}:${userId}`] ?? null,
  organizationIdpId: async (id) => organizations[id] ?? null,
  agent: async (id) => agents[id] ?? null,
  stack: async (id) => stacks[id] ?? null,
  change: async (id) => changes[id] ?? null,
  pullRequest: async (id) => pullRequests[id] ?? null,
  verificationCheck: async (id) => checks[id] ?? null,
  pullRequestReview: async (id) => reviews[id] ?? null,
  relationshipType: async (id) => relationshipTypes[id] ?? null,
};

const subjects: Record<string, AuthorizationSubject> = {
  alice: {
    observerId: "alice",
    organizations: [{ id: "idp-a", roles: ["owner"] }],
  },
  bob: {
    observerId: "bob",
    organizations: [{ id: "idp-a", roles: ["member"] }],
  },
  carol: { observerId: "carol", organizations: [] },
  dave: { observerId: "dave", organizations: [] },
  mallory: {
    observerId: "mallory",
    organizations: [{ id: "idp-b", roles: ["owner"] }],
  },
};

const allowed = (promise: Promise<void>) =>
  expect(promise).resolves.toBeUndefined();
const refused = (promise: Promise<void>) =>
  expect(promise).rejects.toThrow("Unauthorized");

describe("repositoryAccessLevel", () => {
  const level = (repositoryId: string, who: string) =>
    repositoryAccessLevel(
      repositories[repositoryId]!,
      collaborators[`${repositoryId}:${who}`] ?? null,
      subjects[who]!,
    );

  test("owner admin, collaborators at their permission", () => {
    expect(level("repo-a", "alice")).toBe("admin");
    expect(level("repo-a", "carol")).toBe("write");
    expect(level("repo-a", "dave")).toBe("read");
  });

  test("organization members read; owners and admins write", () => {
    expect(level("repo-a", "bob")).toBe("read");
    expect(
      repositoryAccessLevel(repositories["repo-a"]!, null, {
        observerId: "erin",
        organizations: [{ id: "idp-a", roles: ["admin"] }],
      }),
    ).toBe("write");
  });

  test("another workspace gets nothing on a private repository, read on a public one", () => {
    expect(level("repo-a", "mallory")).toBeNull();
    expect(level("repo-b-public", "carol")).toBe("read");
  });
});

describe("agents", () => {
  test("a caller registers a personal agent for themselves", async () => {
    await allowed(
      authorizeAgentCreate(lookup, subjects.carol!, { ownerId: "carol" }),
    );
  });

  test("an agent owned by someone else is refused", async () => {
    await refused(
      authorizeAgentCreate(lookup, subjects.mallory!, { ownerId: "alice" }),
    );
  });

  test("an organization agent needs an owner or admin role there", async () => {
    await allowed(
      authorizeAgentCreate(lookup, subjects.alice!, {
        ownerId: "alice",
        organizationId: "org-a",
      }),
    );
    await refused(
      authorizeAgentCreate(lookup, subjects.bob!, {
        ownerId: "bob",
        organizationId: "org-a",
      }),
    );
  });

  test("another workspace's organization id is refused", async () => {
    await refused(
      authorizeAgentCreate(lookup, subjects.mallory!, {
        ownerId: "mallory",
        organizationId: "org-a",
      }),
    );
    await refused(
      authorizeAgentCreate(lookup, subjects.mallory!, {
        ownerId: "mallory",
        organizationId: "org-missing",
      }),
    );
  });

  test("update and delete: owner or organization admin only", async () => {
    await allowed(authorizeAgentAdmin(lookup, subjects.carol!, "agent-carol"));
    await allowed(authorizeAgentAdmin(lookup, subjects.alice!, "agent-a"));
    await refused(authorizeAgentAdmin(lookup, subjects.bob!, "agent-a"));
    await refused(authorizeAgentAdmin(lookup, subjects.mallory!, "agent-a"));
    await refused(authorizeAgentAdmin(lookup, subjects.alice!, "agent-b"));
    await refused(
      authorizeAgentAdmin(lookup, subjects.alice!, "agent-missing"),
    );
  });
});

describe("stacks", () => {
  const stackInput = (overrides: Record<string, unknown> = {}) => ({
    repositoryId: "repo-a",
    authorId: "carol",
    ...overrides,
  });

  test("a writer creates a stack authored as themselves", async () => {
    await allowed(authorizeStackCreate(lookup, subjects.carol!, stackInput()));
    await allowed(
      authorizeStackCreate(
        lookup,
        subjects.carol!,
        stackInput({ authoredByAgentId: "agent-carol" }),
      ),
    );
  });

  test("a reader, a plain member, or an outsider cannot create one", async () => {
    await refused(
      authorizeStackCreate(
        lookup,
        subjects.dave!,
        stackInput({ authorId: "dave" }),
      ),
    );
    await refused(
      authorizeStackCreate(
        lookup,
        subjects.bob!,
        stackInput({ authorId: "bob" }),
      ),
    );
    await refused(
      authorizeStackCreate(
        lookup,
        subjects.mallory!,
        stackInput({ authorId: "mallory" }),
      ),
    );
  });

  test("authoring as someone else, or a merged stack, is refused", async () => {
    await refused(
      authorizeStackCreate(
        lookup,
        subjects.carol!,
        stackInput({ authorId: "alice" }),
      ),
    );
    await refused(
      authorizeStackCreate(
        lookup,
        subjects.carol!,
        stackInput({ status: "merged" }),
      ),
    );
  });

  test("another workspace's agent cannot be credited", async () => {
    await refused(
      authorizeStackCreate(
        lookup,
        subjects.carol!,
        stackInput({ authoredByAgentId: "agent-b" }),
      ),
    );
  });

  test("update needs write access and cannot mark a stack merged", async () => {
    await allowed(
      authorizeStackUpdate(lookup, subjects.carol!, "stack-a", {
        status: "abandoned",
      }),
    );
    await refused(
      authorizeStackUpdate(lookup, subjects.carol!, "stack-a", {
        status: "merged",
      }),
    );
    await refused(authorizeStackUpdate(lookup, subjects.dave!, "stack-a", {}));
    await refused(
      authorizeStackUpdate(lookup, subjects.mallory!, "stack-a", {}),
    );
  });

  test("delete: the author with write access, or a repository admin", async () => {
    await allowed(authorizeStackDelete(lookup, subjects.carol!, "stack-a"));
    await allowed(authorizeStackDelete(lookup, subjects.alice!, "stack-a"));
    await refused(
      authorizeStackDelete(lookup, subjects.carol!, "stack-a-alice"),
    );
    await refused(authorizeStackDelete(lookup, subjects.mallory!, "stack-a"));
    await refused(authorizeStackDelete(lookup, subjects.alice!, "stack-b"));
  });
});

describe("changes", () => {
  const changeInput = (overrides: Record<string, unknown> = {}) => ({
    stackId: "stack-a",
    repositoryId: "repo-a",
    ...overrides,
  });

  test("a writer adds a change to a stack in their repository", async () => {
    await allowed(
      authorizeChangeCreate(lookup, subjects.carol!, changeInput()),
    );
    await allowed(
      authorizeChangeCreate(
        lookup,
        subjects.carol!,
        changeInput({ parentChangeId: "change-a1", pullRequestId: "pr-a" }),
      ),
    );
  });

  test("a reader or an outsider cannot", async () => {
    await refused(authorizeChangeCreate(lookup, subjects.dave!, changeInput()));
    await refused(
      authorizeChangeCreate(lookup, subjects.mallory!, changeInput()),
    );
  });

  test("cross-workspace references are refused", async () => {
    // A change in mallory's stack claiming alice's repository
    await refused(
      authorizeChangeCreate(lookup, subjects.mallory!, {
        stackId: "stack-b",
        repositoryId: "repo-a",
      }),
    );
    // A change in carol's stack claiming mallory's repository
    await refused(
      authorizeChangeCreate(
        lookup,
        subjects.carol!,
        changeInput({ repositoryId: "repo-b" }),
      ),
    );
    // Borrowing another repository's pull request (and its approvals)
    await refused(
      authorizeChangeCreate(
        lookup,
        subjects.carol!,
        changeInput({ pullRequestId: "pr-b" }),
      ),
    );
    await refused(
      authorizeChangeCreate(
        lookup,
        subjects.carol!,
        changeInput({ pullRequestId: "pr-a2" }),
      ),
    );
    // A parent in another stack
    await refused(
      authorizeChangeCreate(
        lookup,
        subjects.carol!,
        changeInput({ parentChangeId: "change-b1" }),
      ),
    );
    await refused(
      authorizeChangeCreate(
        lookup,
        subjects.carol!,
        changeInput({ parentChangeId: "change-a-other-stack" }),
      ),
    );
  });

  test("a change cannot be created or patched as merged", async () => {
    await refused(
      authorizeChangeCreate(
        lookup,
        subjects.carol!,
        changeInput({ status: "merged" }),
      ),
    );
    await refused(
      authorizeChangeUpdate(lookup, subjects.carol!, "change-a1", {
        status: "merged",
      }),
    );
  });

  test("update: write access, parent in the same stack and not itself", async () => {
    await allowed(
      authorizeChangeUpdate(lookup, subjects.carol!, "change-a2", {
        parentChangeId: "change-a1",
      }),
    );
    await refused(
      authorizeChangeUpdate(lookup, subjects.carol!, "change-a1", {
        parentChangeId: "change-a1",
      }),
    );
    await refused(
      authorizeChangeUpdate(lookup, subjects.carol!, "change-a1", {
        parentChangeId: "change-b1",
      }),
    );
    await refused(
      authorizeChangeUpdate(lookup, subjects.dave!, "change-a1", {}),
    );
    await refused(
      authorizeChangeUpdate(lookup, subjects.mallory!, "change-a1", {}),
    );
  });

  test("delete: write access to the change's repository", async () => {
    await allowed(authorizeChangeDelete(lookup, subjects.carol!, "change-a1"));
    await refused(
      authorizeChangeDelete(lookup, subjects.mallory!, "change-a1"),
    );
    await refused(authorizeChangeDelete(lookup, subjects.carol!, "change-b1"));
  });
});

describe("verification checks", () => {
  test("a writer reports and edits checks on their changes", async () => {
    await allowed(
      authorizeVerificationCheckCreate(lookup, subjects.carol!, {
        changeId: "change-a1",
      }),
    );
    await allowed(
      authorizeVerificationCheckAdmin(lookup, subjects.carol!, "check-a"),
    );
  });

  test("a reader cannot pass or block a merge gate", async () => {
    await refused(
      authorizeVerificationCheckCreate(lookup, subjects.dave!, {
        changeId: "change-a1",
      }),
    );
    await refused(
      authorizeVerificationCheckAdmin(lookup, subjects.dave!, "check-a"),
    );
  });

  test("another workspace's change or check is refused", async () => {
    await refused(
      authorizeVerificationCheckCreate(lookup, subjects.mallory!, {
        changeId: "change-a1",
      }),
    );
    await refused(
      authorizeVerificationCheckAdmin(lookup, subjects.mallory!, "check-a"),
    );
    await refused(
      authorizeVerificationCheckAdmin(lookup, subjects.carol!, "check-b"),
    );
    await refused(
      authorizeVerificationCheckCreate(lookup, subjects.carol!, {
        changeId: "change-missing",
      }),
    );
  });
});

describe("pull request reviews", () => {
  const review = (who: string, pullRequestId: string, state?: string) =>
    authorizeReviewCreate(lookup, subjects[who]!, {
      pullRequestId,
      reviewerId: who,
      state,
    });

  test("anyone who can see the pull request may comment on it", async () => {
    await allowed(review("dave", "pr-a", "commented"));
    await allowed(review("bob", "pr-a"));
    await allowed(review("carol", "pr-b-public", "commented"));
  });

  test("an approval needs write access and not authorship", async () => {
    await allowed(review("alice", "pr-a", "approved"));
    await refused(review("dave", "pr-a", "approved"));
    await refused(review("carol", "pr-a", "approved"));
    // A public repository in another workspace is readable, not approvable
    await refused(review("carol", "pr-b-public", "approved"));
  });

  test("another workspace's private pull request, or a forged reviewer, is refused", async () => {
    await refused(review("mallory", "pr-a", "commented"));
    await refused(
      authorizeReviewCreate(lookup, subjects.mallory!, {
        pullRequestId: "pr-b",
        reviewerId: "alice",
      }),
    );
  });

  test("update: the reviewer only, and approving meets the approval rule", async () => {
    await allowed(
      authorizeReviewUpdate(lookup, subjects.alice!, "review-alice", {
        state: "approved",
      }),
    );
    await allowed(
      authorizeReviewUpdate(lookup, subjects.dave!, "review-dave", {}),
    );
    await refused(
      authorizeReviewUpdate(lookup, subjects.dave!, "review-dave", {
        state: "approved",
      }),
    );
    await refused(
      authorizeReviewUpdate(lookup, subjects.mallory!, "review-dave", {}),
    );
  });
});

describe("repository relationships", () => {
  const relationship = (
    who: string,
    sourceRepositoryId: string,
    targetRepositoryId: string,
    relationshipTypeId: string,
  ) =>
    authorizeRelationshipCreate(lookup, subjects[who]!, {
      sourceRepositoryId,
      targetRepositoryId,
      relationshipTypeId,
    });

  test("a writer links two repositories they can see", async () => {
    await allowed(relationship("carol", "repo-a", "repo-a2", "type-a"));
    await allowed(
      relationship("carol", "repo-a", "repo-b-public", "type-global"),
    );
  });

  test("a private repository in another workspace cannot be a target", async () => {
    await refused(relationship("mallory", "repo-b", "repo-a", "type-b"));
  });

  test("the source needs write access", async () => {
    await refused(relationship("dave", "repo-a", "repo-a2", "type-a"));
    await refused(relationship("mallory", "repo-a", "repo-b", "type-b"));
  });

  test("another workspace's relationship type is refused", async () => {
    await refused(relationship("carol", "repo-a", "repo-a2", "type-b"));
    await refused(relationship("mallory", "repo-b", "repo-b-public", "type-a"));
    await refused(relationship("carol", "repo-a", "repo-a2", "type-missing"));
  });
});
