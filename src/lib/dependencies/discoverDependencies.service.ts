import { and, eq } from "drizzle-orm";

import {
  externalDependencyTable,
  repositoryRelationshipTable,
  repositoryRelationshipTypeTable,
} from "lib/db/schema";
import { gitService } from "lib/git";
import {
  parseCargoManifest,
  parseGoManifest,
  parseNpmManifest,
  parsePipManifest,
  partitionDependencies,
} from "./dependencyDiscovery";

import type { dbPool } from "lib/db/db";
import type {
  ExternalDependency,
  InternalEdge,
  ParsedManifest,
  RepositoryCandidate,
} from "./dependencyDiscovery";

/** Rows written by discovery carry this source, so a re-scan can replace only them. */
const DETECTION_SOURCE = "manifest";

/** The system-wide relationship type auto-detected dependency edges use. */
const DEPENDENCY_TYPE_NAME = "dependency";

/**
 * The manifests discovery reads at the default branch, each with its parser.
 * Add another ecosystem here alongside a parser to widen coverage.
 */
const MANIFESTS: {
  path: string;
  parse: (content: string) => ParsedManifest;
}[] = [
  { path: "package.json", parse: parseNpmManifest },
  { path: "Cargo.toml", parse: parseCargoManifest },
  { path: "go.mod", parse: parseGoManifest },
  { path: "requirements.txt", parse: parsePipManifest },
];

export interface DiscoverDependenciesResult {
  internalDependencies: number;
  externalDependencies: number;
  error: string | null;
}

/**
 * Whether the caller owns, or has write/admin on, a repository. Mirrors the
 * repository-relationship write gate; discovery mutates the same graph, so it
 * requires the same access.
 */
const hasWriteAccess = async (
  db: typeof dbPool,
  repositoryId: string,
  userId: string,
): Promise<boolean> => {
  const repository = await db.query.repositoryTable.findFirst({
    where: (table, { eq: equals }) => equals(table.id, repositoryId),
    with: {
      collaborators: {
        where: (table, { eq: equals }) => equals(table.userId, userId),
      },
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

/** Find or create the system-wide dependency relationship type, returning its id. */
const ensureDependencyType = async (
  tx: Parameters<Parameters<typeof dbPool.transaction>[0]>[0],
): Promise<string> => {
  const existing = await tx.query.repositoryRelationshipTypeTable.findFirst({
    where: (table, { and: all, eq: equals, isNull }) =>
      all(
        equals(table.name, DEPENDENCY_TYPE_NAME),
        isNull(table.organizationId),
      ),
  });
  if (existing) return existing.id;

  const [created] = await tx
    .insert(repositoryRelationshipTypeTable)
    .values({ name: DEPENDENCY_TYPE_NAME, isDirected: true })
    .returning({ id: repositoryRelationshipTypeTable.id });
  if (!created)
    throw new Error("failed to create dependency relationship type");
  return created.id;
};

/**
 * Scan a repository's package manifest at its default branch and reconcile the
 * dependency graph from it: dependencies that resolve to another repository the
 * owner also holds become `repositoryRelationship` edges, the rest become
 * `external_dependency` rows. Previous manifest-detected rows for the repository
 * are cleared first, so removing a dependency removes its edge; manually created
 * edges are left untouched (only `detectionSource = manifest` rows are replaced).
 */
export const discoverDependencies = async (args: {
  observer: { id: string } | null | undefined;
  db: typeof dbPool;
  input: { repositoryId: string };
}): Promise<DiscoverDependenciesResult> => {
  const { observer, db, input } = args;

  if (!observer) throw new Error("Unauthorized");
  if (!(await hasWriteAccess(db, input.repositoryId, observer.id)))
    throw new Error("Unauthorized");

  const repository = await db.query.repositoryTable.findFirst({
    where: (table, { eq: equals }) => equals(table.id, input.repositoryId),
    with: { owner: true, organization: true },
  });
  if (!repository) throw new Error("Repository not found");

  const ownerSlug =
    repository.organization?.slug ?? repository.owner?.username ?? null;
  if (!ownerSlug)
    return { internalDependencies: 0, externalDependencies: 0, error: null };

  // Candidate targets: repositories the same owner or organization holds
  const candidates: RepositoryCandidate[] = (
    await db.query.repositoryTable.findMany({
      where: (table, { or, eq: equals }) =>
        repository.organizationId
          ? or(
              equals(table.ownerId, repository.ownerId),
              equals(table.organizationId, repository.organizationId),
            )
          : equals(table.ownerId, repository.ownerId),
      columns: { id: true, name: true, slug: true },
    })
  ).map((repo) => ({ id: repo.id, name: repo.name, slug: repo.slug }));

  // Read each supported manifest at the default branch and accumulate its
  // dependencies. An internal edge is de-duplicated by target (two names could
  // resolve to the same repository), an external dependency by package manager
  // plus name (so npm `x` and cargo `x` stay distinct, matching the table's key)
  const internalByTarget = new Map<string, InternalEdge>();
  const externalByKey = new Map<string, ExternalDependency>();
  let anyManifestFound = false;

  for (const { path, parse } of MANIFESTS) {
    const content = await gitService.getFileContent(
      ownerSlug,
      repository.slug,
      repository.defaultBranch,
      path,
    );
    if (content === null) continue;
    anyManifestFound = true;

    let manifest: ParsedManifest;
    try {
      manifest = parse(content);
    } catch {
      // A malformed manifest is skipped so the others still reconcile
      continue;
    }

    const { internal, external } = partitionDependencies(
      manifest,
      candidates,
      repository.id,
    );
    for (const edge of internal) {
      if (!internalByTarget.has(edge.targetRepositoryId))
        internalByTarget.set(edge.targetRepositoryId, edge);
    }
    for (const dependency of external) {
      const key = `${dependency.packageManager}:${dependency.packageName}`;
      if (!externalByKey.has(key)) externalByKey.set(key, dependency);
    }
  }

  if (!anyManifestFound)
    return {
      internalDependencies: 0,
      externalDependencies: 0,
      error:
        "No supported package manifest (package.json, Cargo.toml, go.mod, requirements.txt) found on the default branch",
    };

  await db.transaction(async (tx) => {
    await tx
      .delete(repositoryRelationshipTable)
      .where(
        and(
          eq(repositoryRelationshipTable.sourceRepositoryId, repository.id),
          eq(repositoryRelationshipTable.detectionSource, DETECTION_SOURCE),
        ),
      );
    await tx
      .delete(externalDependencyTable)
      .where(
        and(
          eq(externalDependencyTable.repositoryId, repository.id),
          eq(externalDependencyTable.detectionSource, DETECTION_SOURCE),
        ),
      );

    if (internalByTarget.size > 0) {
      const typeId = await ensureDependencyType(tx);
      await tx
        .insert(repositoryRelationshipTable)
        .values(
          [...internalByTarget.values()].map((edge) => ({
            sourceRepositoryId: repository.id,
            targetRepositoryId: edge.targetRepositoryId,
            relationshipTypeId: typeId,
            detectionSource: DETECTION_SOURCE,
            versionConstraint: edge.versionConstraint,
          })),
        )
        // a manually created edge for the same pair wins; skip rather than dupe
        .onConflictDoNothing();
    }

    if (externalByKey.size > 0) {
      await tx
        .insert(externalDependencyTable)
        .values(
          [...externalByKey.values()].map((dependency) => ({
            repositoryId: repository.id,
            packageManager: dependency.packageManager,
            packageName: dependency.packageName,
            versionConstraint: dependency.versionConstraint,
            detectionSource: DETECTION_SOURCE,
          })),
        )
        .onConflictDoNothing();
    }
  });

  return {
    internalDependencies: internalByTarget.size,
    externalDependencies: externalByKey.size,
    error: null,
  };
};
