import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Every mutation the API exposes, with the rule that authorizes it.
 *
 * The generated schema is the API surface. A table added to the database, or a
 * smart tag dropped, makes Postgraphile emit new create/update/delete mutations
 * with no authorization at all, and nothing else would notice. This manifest
 * makes each one a decision: a new mutation fails this test until it is listed
 * here with its rule and (for a generated one) wrapped by an authorization
 * plugin, or hidden in SmartTag.plugin.ts
 */
const MUTATION_RULES: Record<string, string> = {
  // Agents (Agent.plugin.ts)
  createAgent: "for the caller only; an organization agent needs owner/admin",
  updateAgent: "agent owner, or owner/admin of its organization",
  deleteAgent: "agent owner, or owner/admin of its organization",

  // Branch protection (BranchProtectionRule.plugin.ts)
  createBranchProtectionRule: "repository owner or admin collaborator",
  updateBranchProtectionRule: "repository owner or admin collaborator",
  deleteBranchProtectionRule: "repository owner or admin collaborator",

  // Stacks, changes, checks (Stack.plugin.ts)
  createStack:
    "write access; authored as caller; agent the caller administers; open",
  updateStack: "write access; never marked merged",
  deleteStack: "author with write access, or repository admin",
  createChange:
    "write access to the stack's repository; parent and pull request in the same stack and repository",
  updateChange: "write access; parent in the same stack; never marked merged",
  deleteChange: "write access to the change's repository",
  createVerificationCheck: "write access to the change's repository",
  updateVerificationCheck: "write access to the change's repository",
  deleteVerificationCheck: "write access to the change's repository",

  // Dependency graph (RepositoryRelationship.plugin.ts)
  createExternalDependency: "write access to the repository",
  updateExternalDependency: "write access to the repository",
  deleteExternalDependency: "write access to the repository",
  createRepositoryRelationship:
    "write on source, read on target, type global or the source's organization",
  updateRepositoryRelationship: "write access to the source repository",
  deleteRepositoryRelationship: "write access to the source repository",
  createRepositoryRelationshipMetadatum:
    "write access to the relationship's source repository",
  updateRepositoryRelationshipMetadatum:
    "write access to the relationship's source repository",
  deleteRepositoryRelationshipMetadatum:
    "write access to the relationship's source repository",
  createRepositoryRelationshipType: "owner/admin of the organization",
  updateRepositoryRelationshipType: "owner/admin of the type's organization",
  deleteRepositoryRelationshipType: "owner/admin of the type's organization",

  // Organizations (Organization.plugin.ts)
  createOrganization: "member of the identity-provider organization",
  updateOrganization: "admin via the authorization service",
  deleteOrganization: "owner via the authorization service",

  // Personal access tokens (personalAccessToken/)
  createPersonalAccessToken: "custom: minted for the caller",
  deletePersonalAccessToken: "token owner",

  // Projects (Project.plugin.ts)
  createProject: "owned by the caller; organization project needs owner/admin",
  updateProject: "project owner, or owner/admin of its organization",
  deleteProject: "project owner, or owner/admin of its organization",
  createProjectRepository:
    "administers the project and has write access to the repository",
  updateProjectRepository: "administers the project",
  deleteProjectRepository: "administers the project",

  // Pull requests (PullRequest*.plugin.ts, pullRequest/)
  openPullRequest: "custom: write access; number and author server-assigned",
  closePullRequest: "custom: author or write access",
  reopenPullRequest: "custom: author or write access",
  mergePullRequest: "custom: write access",
  updatePullRequest: "author, repository owner, or admin collaborator",
  deletePullRequest: "author or repository owner",
  createPullRequestComment: "authored as caller; read access",
  updatePullRequestComment: "comment author",
  deletePullRequestComment: "comment author",
  createPullRequestReview:
    "reviewed as caller; read access; approval needs write and not the author",
  updatePullRequestReview: "reviewer; approval needs write and not the author",
  deletePullRequestReview: "reviewer",

  // Refs (git/GitMutations.plugin.ts)
  createRef: "custom: write access",
  deleteRef: "custom: write access",

  // Repositories (Repository.plugin.ts, git/)
  createRepositoryWithGit:
    "custom: personal, or owner/admin of the organization (tier limits)",
  createWorkspaceRepository:
    "custom: trusted product service on behalf of an owner/admin member",
  transferWorkspaceRepository:
    "custom: trusted product service on behalf of an owner/admin of both organizations",
  initializeRepository: "custom: repository owner or admin",
  renameRepository: "custom: owner or admin collaborator",
  updateRepository: "owner or admin collaborator; owner and organization fixed",
  deleteRepository: "repository owner",
  createRepositoryCollaborator: "repository owner or admin collaborator",
  updateRepositoryCollaborator:
    "repository owner or admin collaborator (keyed on the row)",
  deleteRepositoryCollaborator: "repository owner or admin collaborator",

  // Stack merge and the merge queue (stack/, mergeQueue/)
  mergeChange: "custom: write access",
  enqueueStack: "custom: write access",
  processMergeQueue: "custom: write access",

  // Dependency discovery (dependencies/)
  discoverDependencies: "custom: write access",
  reconcileProjectMembership: "custom: write access",

  // Closed beta (testerApplication/)
  submitTesterApplication: "custom: the caller's own application",

  // Topics (Topic.plugin.ts)
  createTopic: "owned by the caller; organization topic needs owner/admin",
  updateTopic: "topic owner, or owner/admin of its organization",
  deleteTopic: "topic owner, or owner/admin of its organization",
  createTopicPullRequest:
    "administers the topic and has write access to the pull request",
  updateTopicPullRequest: "administers the topic",
  deleteTopicPullRequest: "administers the topic",

  // Users (User.plugin.ts)
  updateUser: "self only",
  deleteUser: "self only",
};

/**
 * Generated mutations the schema must not expose: the server alone writes these
 * tables, or a dedicated custom mutation replaces them
 */
const HIDDEN_MUTATIONS = [
  "createRepository",
  "createUser",
  "createPullRequest",
  "createOrganizationMember",
  "updateOrganizationMember",
  "deleteOrganizationMember",
  "createMergeBatch",
  "updateMergeBatch",
  "deleteMergeBatch",
  "createMergeQueueEntry",
  "updateMergeQueueEntry",
  "deleteMergeQueueEntry",
  "createTesterApplication",
  "updateTesterApplication",
  "deleteTesterApplication",
  "createPersonalAccessTokenRepository",
  "deletePersonalAccessTokenRepository",
];

const schema = readFileSync(
  join(import.meta.dir, "../../../../generated/graphql/schema.graphql"),
  "utf8",
);

const schemaMutations = (() => {
  const body = schema.match(/^type Mutation \{([\s\S]*?)^\}/m)?.[1] ?? "";
  return [...body.matchAll(/^ {2}(\w+)\(/gm)].map(
    (match) => match[1] as string,
  );
})();

/** Plugin sources, to find which mutations are wrapped or custom-defined */
const pluginSources = (() => {
  const root = join(import.meta.dir, "..");
  return readdirSync(root, { recursive: true })
    .filter(
      (file): file is string =>
        typeof file === "string" &&
        file.endsWith(".ts") &&
        !file.endsWith(".test.ts"),
    )
    .map((file) => readFileSync(join(root, file), "utf8"));
})();

/** Mutations wrapped by a `wrapPlans` authorization plugin */
const wrappedMutations = new Set(
  pluginSources
    .filter((source) => source.includes("wrapPlans("))
    .flatMap((source) =>
      [...source.matchAll(/^ {4}(\w+):/gm)].map((match) => match[1]),
    ),
);

/**
 * Mutations a plugin defines itself in its `extendSchema` typeDefs (custom,
 * authorized inside their own plan). A field declaration is a name followed by
 * its argument list, on one line or opening onto the next
 */
const customMutations = new Set(
  pluginSources
    .filter((source) => source.includes("extendSchema("))
    .flatMap((source) =>
      [...source.matchAll(/^\s+(\w+)\((?:input:|$)/gm)].map(
        (match) => match[1],
      ),
    ),
);

describe("mutation surface", () => {
  test("the schema was read", () => {
    expect(schemaMutations.length).toBeGreaterThan(0);
  });

  test("every exposed mutation has a recorded authorization rule", () => {
    const unlisted = schemaMutations.filter(
      (name) => !(name in MUTATION_RULES),
    );
    expect(unlisted).toEqual([]);
  });

  test("the manifest lists no mutation the schema no longer has", () => {
    const stale = Object.keys(MUTATION_RULES).filter(
      (name) => !schemaMutations.includes(name),
    );
    expect(stale).toEqual([]);
  });

  test("every generated mutation is wrapped by an authorization plugin", () => {
    const unguarded = schemaMutations.filter(
      (name) => !customMutations.has(name) && !wrappedMutations.has(name),
    );
    expect(unguarded).toEqual([]);
  });

  test("server-only and replaced mutations stay hidden", () => {
    const exposed = HIDDEN_MUTATIONS.filter((name) =>
      schemaMutations.includes(name),
    );
    expect(exposed).toEqual([]);
  });

  test("no node-id update or delete variant bypasses the row-id wrappers", () => {
    expect(schemaMutations.filter((name) => name.endsWith("ById"))).toEqual([]);
  });

  test("no patch input can repoint a row at another owner, workspace, or parent", () => {
    const patches = [
      ...schema.matchAll(/^input (\w+Patch) \{([^}]*)\}/gm),
    ].flatMap(([, name, body]) =>
      [...(body ?? "").matchAll(/^ {2}(\w+):/gm)].map(
        ([, field]) => `${name}.${field}`,
      ),
    );

    // Key columns are fixed after insert (ImmutableReferences.plugin.ts). The
    // one id left is a change's parent, which may move within its stack and is
    // checked by the updateChange guard
    const references = patches.filter(
      (field) => /Id$/.test(field) && field !== "ChangePatch.parentChangeId",
    );
    expect(references).toEqual([]);
  });

  test("pull request lifecycle columns are not patchable", () => {
    const patch = schema.match(/^input PullRequestPatch \{([^}]*)\}/m)?.[1];
    expect(patch).toBeDefined();
    for (const field of ["state", "number", "mergedAt", "mergeCommitSha"]) {
      expect(patch).not.toMatch(new RegExp(`^\\s+${field}:`, "m"));
    }
  });

  test("organization identity and billing linkage are not client-writable", () => {
    for (const type of ["OrganizationPatch", "OrganizationInput"]) {
      const body = schema.match(
        new RegExp(`^input ${type} \\{([^}]*)\\}`, "m"),
      )?.[1];
      expect(body).toBeDefined();
      expect(body).not.toMatch(/^\s+subscriptionId:/m);
      expect(body).not.toMatch(/^\s+billingAccountId:/m);
    }
    expect(
      schema.match(/^input OrganizationPatch \{([^}]*)\}/m)?.[1],
    ).not.toMatch(/^\s+idpOrganizationId:/m);
  });
});
