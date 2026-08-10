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

const CARGO_DEPENDENCY_GROUPS = [
  "dependencies",
  "dev-dependencies",
  "build-dependencies",
] as const;

/**
 * Parse a Rust `Cargo.toml` into a normalized dependency list, merging normal,
 * dev, and build dependencies. A crate's value is either a version string or a
 * table carrying `version` (and other keys); a table without a version (a git or
 * path dependency) is kept with a null constraint, since it still resolves to a
 * repository by name. The first version seen for a crate wins. Throws on input
 * that is not valid TOML, matching a boundary parser.
 */
export const parseCargoManifest = (content: string): ParsedManifest => {
  const parsed = Bun.TOML.parse(content) as Record<string, unknown>;

  const dependencies: ParsedDependency[] = [];
  const seen = new Set<string>();

  for (const group of CARGO_DEPENDENCY_GROUPS) {
    const section = parsed[group];
    if (!section || typeof section !== "object") continue;

    for (const [name, spec] of Object.entries(
      section as Record<string, unknown>,
    )) {
      if (seen.has(name)) continue;

      let versionConstraint: string | null;
      if (typeof spec === "string") {
        versionConstraint = spec;
      } else if (spec && typeof spec === "object") {
        const version = (spec as Record<string, unknown>).version;
        versionConstraint = typeof version === "string" ? version : null;
      } else {
        continue;
      }

      seen.add(name);
      dependencies.push({ name, versionConstraint });
    }
  }

  return { packageManager: "cargo", dependencies };
};

/**
 * Parse a Go `go.mod` into a normalized dependency list. Both the single-line
 * `require path version` form and the `require ( ... )` block are read; the
 * module path is the dependency name and the semantic version its constraint.
 * A trailing `// indirect` (or any) comment is stripped. Go module paths rarely
 * match an Arbor repository name, so these mostly land as external packages.
 */
export const parseGoManifest = (content: string): ParsedManifest => {
  const dependencies: ParsedDependency[] = [];
  const seen = new Set<string>();
  let inBlock = false;

  const record = (path: string, version: string | undefined) => {
    if (!path || !version || seen.has(path)) return;
    seen.add(path);
    dependencies.push({ name: path, versionConstraint: version });
  };

  for (const rawLine of content.split("\n")) {
    const line = rawLine.split("//")[0]?.trim() ?? "";
    if (!line) continue;

    if (inBlock) {
      if (line === ")") {
        inBlock = false;
        continue;
      }
      const [path, version] = line.split(/\s+/);
      record(path ?? "", version);
      continue;
    }

    if (line === "require (") {
      inBlock = true;
      continue;
    }
    if (line.startsWith("require ")) {
      const [, path, version] = line.split(/\s+/);
      record(path ?? "", version);
    }
  }

  return { packageManager: "go", dependencies };
};

// Leading package token in a requirements.txt line: a name, optional extras
const PIP_LINE = /^([A-Za-z0-9][A-Za-z0-9._-]*)\s*(?:\[[^\]]*\])?\s*(.*)$/;

/**
 * Parse a Python `requirements.txt` into a normalized dependency list. Each
 * requirement contributes its distribution name and version specifier (the
 * `==2.0`, `>=1,<2` clause, or null when unpinned); extras (`pkg[redis]`) and
 * environment markers (`; python_version >= "3.8"`) are dropped, and comment,
 * blank, option (`-e`, `-r`, `--hash`), and VCS/URL lines are skipped.
 */
export const parsePipManifest = (content: string): ParsedManifest => {
  const dependencies: ParsedDependency[] = [];
  const seen = new Set<string>();

  for (const rawLine of content.split("\n")) {
    const line = (rawLine.split("#")[0] ?? "").trim();
    if (!line || line.startsWith("-") || line.includes("://")) continue;

    const match = PIP_LINE.exec(line);
    if (!match) continue;
    const name = match[1];
    if (!name || seen.has(name)) continue;

    // Drop an environment marker, then keep the version specifier or null
    const specifier = (match[2] ?? "").split(";")[0]?.trim() ?? "";
    seen.add(name);
    dependencies.push({
      name,
      versionConstraint: specifier.length > 0 ? specifier : null,
    });
  }

  return { packageManager: "pip", dependencies };
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
