/**
 * Pure dependency-discovery logic: parse a package manifest into a normalized
 * dependency list, then partition those dependencies into edges that resolve to
 * another Arbor repository and external packages that do not. The service layer
 * reads the manifest through the git service and upserts the result; keeping the
 * parsing and resolution pure makes both independently testable.
 */

/** A single declared dependency, normalized across manifest sections. */
interface ParsedDependency {
  name: string;
  versionConstraint: string | null;
}

/** A manifest reduced to the package manager and its dependency list. */
export interface ParsedManifest {
  packageManager: string;
  dependencies: ParsedDependency[];
}

/** A repository a dependency name could resolve to. */
export interface RepositoryCandidate {
  id: string;
  name: string;
  slug: string;
}

/** A dependency that resolved to another Arbor repository. */
export interface InternalEdge {
  targetRepositoryId: string;
  versionConstraint: string | null;
}

/** A dependency that did not resolve to an Arbor repository. */
export interface ExternalDependency {
  packageManager: string;
  packageName: string;
  versionConstraint: string | null;
}

const NPM_DEPENDENCY_GROUPS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;

/**
 * Parse an npm `package.json` into a normalized dependency list. Runtime, dev,
 * peer, and optional dependencies are merged; the first version seen for a name
 * wins, so a package listed in more than one group appears once. Entries whose
 * value is not a string (a rare object form) are skipped rather than guessed at.
 * Throws on input that is not valid JSON, matching a boundary parser.
 */
export const parseNpmManifest = (content: string): ParsedManifest => {
  const parsed: unknown = JSON.parse(content);

  const dependencies: ParsedDependency[] = [];
  const seen = new Set<string>();

  if (parsed && typeof parsed === "object") {
    for (const group of NPM_DEPENDENCY_GROUPS) {
      const section = (parsed as Record<string, unknown>)[group];
      if (!section || typeof section !== "object") continue;

      for (const [name, constraint] of Object.entries(
        section as Record<string, unknown>,
      )) {
        if (typeof constraint !== "string" || seen.has(name)) continue;
        seen.add(name);
        dependencies.push({ name, versionConstraint: constraint });
      }
    }
  }

  return { packageManager: "npm", dependencies };
};

/**
 * Split a manifest's dependencies into internal edges (a dependency whose name
 * matches another repository's name or slug) and external packages (everything
 * else). A repository never resolves to itself, so a package sharing the repo's
 * own name produces no edge and no external row.
 */
export const partitionDependencies = (
  manifest: ParsedManifest,
  candidates: RepositoryCandidate[],
  selfRepositoryId: string,
): { internal: InternalEdge[]; external: ExternalDependency[] } => {
  const byKey = new Map<string, RepositoryCandidate>();
  for (const candidate of candidates) {
    byKey.set(candidate.name.toLowerCase(), candidate);
    byKey.set(candidate.slug.toLowerCase(), candidate);
  }

  const internal: InternalEdge[] = [];
  const external: ExternalDependency[] = [];

  for (const dependency of manifest.dependencies) {
    const match = byKey.get(dependency.name.toLowerCase());

    if (match) {
      // a repository depending on itself is not an edge
      if (match.id === selfRepositoryId) continue;
      internal.push({
        targetRepositoryId: match.id,
        versionConstraint: dependency.versionConstraint,
      });
      continue;
    }

    external.push({
      packageManager: manifest.packageManager,
      packageName: dependency.name,
      versionConstraint: dependency.versionConstraint,
    });
  }

  return { internal, external };
};
