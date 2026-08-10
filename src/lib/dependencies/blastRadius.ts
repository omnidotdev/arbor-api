/**
 * Pure blast-radius computation: given the dependency edges of a graph, find
 * every repository transitively affected by a change to one repository. This is
 * the "what breaks if this library changes" question the dependency graph exists
 * to answer, kept pure so it is testable without a database.
 */

/** A directed dependency: `sourceRepositoryId` depends on `targetRepositoryId`. */
export interface DependencyEdge {
  sourceRepositoryId: string;
  targetRepositoryId: string;
}

/** An affected repository and its shortest dependency distance from the root. */
export interface BlastRadiusEntry {
  repositoryId: string;
  depth: number;
}

/**
 * Repositories transitively affected by a change to `rootRepositoryId`: every
 * repository that depends on it directly or through a chain, each with the
 * shortest dependency distance (a breadth-first walk of the reverse edges). The
 * root itself is excluded, and cycles terminate because each repository is
 * visited once.
 */
export const computeBlastRadius = (
  edges: DependencyEdge[],
  rootRepositoryId: string,
): BlastRadiusEntry[] => {
  // target -> repositories that depend on it
  const dependents = new Map<string, string[]>();
  for (const { sourceRepositoryId, targetRepositoryId } of edges) {
    const list = dependents.get(targetRepositoryId);
    if (list) list.push(sourceRepositoryId);
    else dependents.set(targetRepositoryId, [sourceRepositoryId]);
  }

  const affected: BlastRadiusEntry[] = [];
  const visited = new Set<string>([rootRepositoryId]);
  let frontier = [rootRepositoryId];
  let depth = 0;

  while (frontier.length > 0) {
    depth += 1;
    const next: string[] = [];
    for (const node of frontier) {
      for (const dependent of dependents.get(node) ?? []) {
        if (visited.has(dependent)) continue;
        visited.add(dependent);
        affected.push({ repositoryId: dependent, depth });
        next.push(dependent);
      }
    }
    frontier = next;
  }

  return affected;
};
