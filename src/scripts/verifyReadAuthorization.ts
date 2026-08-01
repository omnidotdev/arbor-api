/**
 * Verify GraphQL read authorization end to end.
 *
 * Deliberately a script rather than a `bun test` file: it needs a live database
 * and a booted server, and the unit suite runs in pre-commit with neither. Run
 * it on demand after touching `RepositoryRead.plugin.ts`, the smart tags, or
 * anything under `lib/auth`.
 *
 * Every read-authorization fix in `plans/2026-07-29-arbor-graphql-read-authorization.md`
 * was verified by hand once. This makes that repeatable, which matters because a
 * predicate can compile, typecheck, and silently not apply (a correlated
 * subquery on the left of an `IN` did exactly that).
 *
 * Usage, against a server started with PROTECT_ROUTES=false:
 *   bun run --env-file .env.local src/scripts/verifyReadAuthorization.ts
 *
 * Exits non-zero if any private data is reachable by an unauthenticated caller.
 */

import { eq } from "drizzle-orm";

import { dbPool } from "lib/db/db";
import {
  agentTable,
  externalDependencyTable,
  mergeBatchTable,
  mergeQueueEntryTable,
  organizationMemberTable,
  organizationTable,
  personalAccessTokenRepositoryTable,
  personalAccessTokenTable,
  projectRepositoryTable,
  projectTable,
  pullRequestCommentTable,
  pullRequestReviewTable,
  pullRequestTable,
  repositoryCollaboratorTable,
  repositoryRelationshipMetadataTable,
  repositoryRelationshipTable,
  repositoryRelationshipTypeTable,
  repositoryTable,
  userTable,
} from "lib/db/schema";

const TAG = "readauthz";
const ENDPOINT =
  process.env.VERIFY_ENDPOINT ?? "https://localhost:4000/graphql";

/** Marker strings that must never appear in an unauthenticated response */
const SECRETS = [
  `${TAG}-private`,
  `${TAG}-orgprivate`,
  "SECRET_PR",
  "SECRET_COMMENT",
  "SECRET_REVIEW",
  "SECRET_AGENT",
  "SECRET_PROJECT",
  "SECRET_TYPE",
  "SECRET_METADATA",
  "SECRET_DEPENDENCY",
  "SECRET_BATCH",
  "SECRET_TOKEN",
  // the seeded account, which no root query may enumerate. Its username is
  // legitimately readable through a public repository's owner relation, so this
  // marker is meaningful only for the documents below, none of which ask for it
  // by that path
  `${TAG}-owner`,
];

const query = async (document: string): Promise<string> => {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: document }),
    // the dev server uses a self-signed certificate
    tls: { rejectUnauthorized: false },
  } as RequestInit);

  return await response.text();
};

const cleanup = async () => {
  for (const user of await dbPool.query.userTable.findMany({
    where: (table, { like }) => like(table.username, `${TAG}%`),
  })) {
    await dbPool.delete(userTable).where(eq(userTable.id, user.id));
  }
  for (const org of await dbPool.query.organizationTable.findMany({
    where: (table, { like }) => like(table.idpOrganizationId, `${TAG}%`),
  })) {
    await dbPool
      .delete(organizationTable)
      .where(eq(organizationTable.id, org.id));
  }
};

const seed = async () => {
  await cleanup();

  const [owner] = await dbPool
    .insert(userTable)
    .values({
      identityProviderId: crypto.randomUUID(),
      name: "Owner",
      username: `${TAG}-owner`,
      email: `${TAG}-owner@example.com`,
    })
    .returning();
  if (!owner) throw new Error("failed to seed user");

  const [organization] = await dbPool
    .insert(organizationTable)
    .values({ idpOrganizationId: `${TAG}-org` })
    .returning();
  if (!organization) throw new Error("failed to seed organization");

  await dbPool.insert(organizationMemberTable).values({
    userId: owner.id,
    organizationId: organization.id,
    roles: ["member"],
  });

  const [publicRepo] = await dbPool
    .insert(repositoryTable)
    .values({
      ownerId: owner.id,
      name: "pub",
      slug: `${TAG}-public`,
      visibility: "public",
    })
    .returning();
  const [privateRepo] = await dbPool
    .insert(repositoryTable)
    .values({
      ownerId: owner.id,
      name: "priv",
      slug: `${TAG}-private`,
      visibility: "private",
    })
    .returning();
  await dbPool.insert(repositoryTable).values({
    ownerId: owner.id,
    organizationId: organization.id,
    name: "orgpriv",
    slug: `${TAG}-orgprivate`,
    visibility: "private",
  });
  if (!publicRepo || !privateRepo)
    throw new Error("failed to seed repositories");

  const [publicPr] = await dbPool
    .insert(pullRequestTable)
    .values({
      number: 1,
      repositoryId: publicRepo.id,
      authorId: owner.id,
      title: "public pr",
      sourceBranch: "a",
      targetBranch: "b",
    })
    .returning();
  const [privatePr] = await dbPool
    .insert(pullRequestTable)
    .values({
      number: 1,
      repositoryId: privateRepo.id,
      authorId: owner.id,
      title: "SECRET_PR",
      sourceBranch: "a",
      targetBranch: "b",
    })
    .returning();
  if (!publicPr || !privatePr) throw new Error("failed to seed pull requests");

  await dbPool.insert(pullRequestCommentTable).values({
    pullRequestId: privatePr.id,
    authorId: owner.id,
    body: "SECRET_COMMENT",
  });
  await dbPool.insert(pullRequestReviewTable).values({
    pullRequestId: privatePr.id,
    reviewerId: owner.id,
    body: "SECRET_REVIEW",
    state: "approved",
  });
  await dbPool.insert(agentTable).values({
    ownerId: owner.id,
    name: "SECRET_AGENT",
    slug: `${TAG}-agent`,
    model: "claude-opus-5",
    vendor: "anthropic",
  });

  // the polyrepo graph and its neighbours. Seeded against the PRIVATE repository
  // so each row is one an anonymous caller must not reach: an edge leaks the
  // existence and id of a private repository even when the other end is public
  const [project] = await dbPool
    .insert(projectTable)
    .values({
      ownerId: owner.id,
      name: "SECRET_PROJECT",
      slug: `${TAG}-project`,
    })
    .returning();
  if (!project) throw new Error("failed to seed project");

  await dbPool
    .insert(projectRepositoryTable)
    .values({ projectId: project.id, repositoryId: privateRepo.id });

  const [relationshipType] = await dbPool
    .insert(repositoryRelationshipTypeTable)
    .values({ name: `${TAG}-SECRET_TYPE`, organizationId: organization.id })
    .returning();
  if (!relationshipType) throw new Error("failed to seed relationship type");

  const [relationship] = await dbPool
    .insert(repositoryRelationshipTable)
    .values({
      sourceRepositoryId: publicRepo.id,
      targetRepositoryId: privateRepo.id,
      relationshipTypeId: relationshipType.id,
    })
    .returning();
  if (!relationship) throw new Error("failed to seed relationship");

  await dbPool.insert(repositoryRelationshipMetadataTable).values({
    relationshipId: relationship.id,
    key: `${TAG}-key`,
    value: "SECRET_METADATA",
  });

  await dbPool.insert(externalDependencyTable).values({
    repositoryId: privateRepo.id,
    packageManager: "npm",
    packageName: "SECRET_DEPENDENCY",
  });

  await dbPool
    .insert(repositoryCollaboratorTable)
    .values({ repositoryId: privateRepo.id, userId: owner.id });

  const [batch] = await dbPool
    .insert(mergeBatchTable)
    .values({ repositoryId: privateRepo.id, speculativeBranch: "SECRET_BATCH" })
    .returning();
  if (!batch) throw new Error("failed to seed merge batch");

  await dbPool.insert(mergeQueueEntryTable).values({
    repositoryId: privateRepo.id,
    batchId: batch.id,
    state: "queued",
  });

  const [token] = await dbPool
    .insert(personalAccessTokenTable)
    .values({
      userId: owner.id,
      name: "SECRET_TOKEN",
      tokenHash: `${TAG}-hash`,
      tokenPrefix: `${TAG}-pref`,
    })
    .returning();
  if (!token) throw new Error("failed to seed token");

  await dbPool.insert(personalAccessTokenRepositoryTable).values({
    personalAccessTokenId: token.id,
    repositoryId: privateRepo.id,
  });

  return { privateRepoId: privateRepo.id };
};

/**
 * A read an unauthenticated caller must not be able to make.
 *
 * `mustReject` marks a field that was removed from the schema rather than
 * filtered. Those need an assertion of their own: a document naming a field that
 * does not exist fails validation and returns no data, which trivially contains
 * no secret marker, so a leak check alone would keep passing even if the field
 * came back.
 */
const cases = (
  privateRepoId: string,
): { name: string; document: string; mustReject?: boolean }[] => [
  {
    name: "repositories connection",
    document: `{ repositories(first:100){ nodes{ slug } } }`,
  },
  {
    name: "Organization.repositories",
    document: `{ organizations(first:20){ nodes{ repositories(first:50){ nodes{ slug } } } } }`,
  },
  {
    name: "pullRequests",
    document: `{ pullRequests(first:100){ nodes{ title } } }`,
  },
  {
    name: "pullRequestComments",
    document: `{ pullRequestComments(first:100){ nodes{ body } } }`,
  },
  {
    name: "pullRequestReviews",
    document: `{ pullRequestReviews(first:100){ nodes{ body } } }`,
  },
  { name: "agents", document: `{ agents(first:100){ nodes{ name } } }` },
  {
    name: "projects",
    document: `{ projects(first:100){ nodes{ name slug } } }`,
  },
  {
    name: "projectRepositories",
    document: `{ projectRepositories(first:100){ nodes{ repository{ slug } } } }`,
  },
  {
    name: "repositoryRelationships (edge to a private repo)",
    document: `{ repositoryRelationships(first:100){ nodes{ sourceRepository{ slug } targetRepository{ slug } } } }`,
  },
  {
    name: "repositoryRelationshipMetadata",
    document: `{ repositoryRelationshipMetadata(first:100){ nodes{ key value } } }`,
  },
  {
    name: "repositoryRelationshipTypes",
    document: `{ repositoryRelationshipTypes(first:100){ nodes{ name } } }`,
  },
  {
    name: "externalDependencies",
    document: `{ externalDependencies(first:100){ nodes{ packageName packageManager } } }`,
  },
  {
    name: "mergeBatches",
    document: `{ mergeBatches(first:100){ nodes{ speculativeBranch repository{ slug } } } }`,
  },
  {
    name: "mergeQueueEntries",
    document: `{ mergeQueueEntries(first:100){ nodes{ repository{ slug } } } }`,
  },
  {
    name: "repositoryCollaborators",
    document: `{ repositoryCollaborators(first:100){ nodes{ repository{ slug } user{ username } } } }`,
  },
  {
    name: "organizationMembers",
    document: `{ organizationMembers(first:100){ nodes{ user{ username } } } }`,
  },
  {
    name: "personalAccessTokenRepositories",
    document: `{ personalAccessTokenRepositories(first:100){ nodes{ repository{ slug } } } }`,
  },
  {
    name: "single-row accessor is gone",
    document: `{ repository(rowId:"${privateRepoId}"){ slug } }`,
    mustReject: true,
  },
  {
    name: "node accessor is gone",
    document: `{ repositoryById(id:"whatever"){ slug } }`,
    mustReject: true,
  },
  {
    name: "users connection is gone",
    document: `{ users(first:100){ nodes{ username } } }`,
    mustReject: true,
  },
  {
    name: "user(rowId:) is gone",
    document: `{ user(rowId:"${privateRepoId}"){ username } }`,
    mustReject: true,
  },
  {
    name: "userByEmail is gone (account-enumeration oracle)",
    document: `{ userByEmail(email:"${TAG}-owner@example.com"){ username } }`,
    mustReject: true,
  },
  {
    name: "userByUsername is gone",
    document: `{ userByUsername(username:"${TAG}-owner"){ name } }`,
    mustReject: true,
  },
  {
    name: "userById is gone",
    document: `{ userById(id:"whatever"){ username } }`,
    mustReject: true,
  },
  {
    // reached through a relation, which is the only way to a User row now. The
    // observer query exposes the caller's own email deliberately and is not
    // this field
    name: "User.email is gone",
    document: `{ repositories(first:100){ nodes{ owner{ email } } } }`,
    mustReject: true,
  },
];

const main = async () => {
  const { privateRepoId } = await seed();

  let failures = 0;

  for (const testCase of cases(privateRepoId)) {
    const body = await query(testCase.document);
    const leaked = SECRETS.filter((secret) => body.includes(secret));

    if (leaked.length > 0) {
      failures++;
      console.error(`LEAK  ${testCase.name}: ${leaked.join(", ")}`);
      continue;
    }

    // a removed field must fail validation. Anything else means the field is
    // back, and the leak check above passed only because this document did not
    // happen to ask for a seeded secret
    if (
      testCase.mustReject &&
      !/Cannot query field|Unknown argument/.test(body)
    ) {
      failures++;
      console.error(
        `LEAK  ${testCase.name}: the field still exists (expected a validation error)`,
      );
      continue;
    }

    console.info(`ok    ${testCase.name}`);
  }

  // the public repository must still be reachable, or the predicate is simply
  // denying everything and the checks above would pass for the wrong reason
  const publicBody = await query(
    `{ repositories(first:100){ nodes{ slug } } }`,
  );
  if (!publicBody.includes(`${TAG}-public`)) {
    failures++;
    console.error(
      "LEAK  control: the public repository is NOT visible, so the checks above prove nothing",
    );
  } else {
    console.info("ok    control: public repository still visible");
  }

  await cleanup();

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }

  console.info("\nAll read-authorization checks passed.");
  process.exit(0);
};

await main();
