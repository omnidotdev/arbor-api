import { mkdir, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

import {
  getArborGitClient,
  getRepositorySizeViaBackend,
  isArborGitEnabled,
} from "./grpcClient";
import { resolveStorageOwner } from "./storageOwner";

import type { dbPool } from "lib/db/db";

/**
 * Git storage configuration.
 */
export const gitStorageConfig = {
  /** Base path for all git repositories */
  repositoriesPath: process.env.GIT_REPOS_PATH || "/var/lib/arbor/repos",

  /** Maximum repository size in bytes (default: 1GB) */
  maxRepoSize: Number(process.env.GIT_MAX_REPO_SIZE) || 1024 * 1024 * 1024,

  /** Default branch name for new repositories */
  defaultBranch: process.env.GIT_DEFAULT_BRANCH || "master",
};

/**
 * Get the filesystem path for a repository.
 * Repositories are stored as bare repos at: {basePath}/{owner}/{repo}.git
 */
export function getRepositoryPath(owner: string, repo: string): string {
  return join(gitStorageConfig.repositoriesPath, owner, `${repo}.git`);
}

/**
 * Ensure the repositories directory exists.
 */
export async function ensureReposDirectory(): Promise<void> {
  await mkdir(gitStorageConfig.repositoriesPath, { recursive: true });
}

/**
 * Ensure the owner directory exists.
 */
export async function ensureOwnerDirectory(owner: string): Promise<void> {
  const ownerPath = join(gitStorageConfig.repositoriesPath, owner);
  await mkdir(ownerPath, { recursive: true });
}

// --- Storage size calculation ---

/** Cache TTL for repository size calculations (30 seconds) */
const SIZE_CACHE_TTL_MS = 30_000;

/** Cached size entries: path -> { bytes, expiresAt } */
const sizeCache = new Map<string, { bytes: number; expiresAt: number }>();

/**
 * Calculate the total size of a directory recursively.
 */
async function getDirectorySize(dirPath: string): Promise<number> {
  let totalBytes = 0;

  const entries = await readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = join(dirPath, entry.name);

    if (entry.isDirectory()) {
      totalBytes += await getDirectorySize(entryPath);
    } else if (entry.isFile()) {
      const fileStat = await stat(entryPath);
      totalBytes += fileStat.size;
    }
  }

  return totalBytes;
}

/**
 * Get the on-disk size of a single repository in bytes.
 * Results are cached for 30 seconds to avoid expensive traversals on every push.
 *
 * With arbor-git configured the size is measured on its volume, where the
 * repositories live; a backend error rejects so a storage limit is never
 * checked against the stale local copy (or a guessed 0).
 */
export async function getRepositorySize(
  owner: string,
  repo: string,
): Promise<number> {
  const repoPath = getRepositoryPath(owner, repo);
  const now = Date.now();

  const cached = sizeCache.get(repoPath);
  if (cached && cached.expiresAt > now) {
    return cached.bytes;
  }

  const client = getArborGitClient();
  if (isArborGitEnabled() && client) {
    const bytes = await getRepositorySizeViaBackend(client, owner, repo);
    sizeCache.set(repoPath, { bytes, expiresAt: now + SIZE_CACHE_TTL_MS });
    return bytes;
  }

  try {
    const bytes = await getDirectorySize(repoPath);
    sizeCache.set(repoPath, { bytes, expiresAt: now + SIZE_CACHE_TTL_MS });
    return bytes;
  } catch {
    // Repository doesn't exist on disk yet
    return 0;
  }
}

/**
 * Get the total storage usage for an organization by summing all its repo sizes.
 * Queries the DB for repo slugs belonging to the org, then calculates disk usage.
 *
 * @param organizationId - Internal organization UUID
 * @param db - Drizzle database client
 */
export async function getOrganizationStorageBytes(
  organizationId: string,
  db: typeof dbPool,
): Promise<number> {
  const repos = await db.query.repositoryTable.findMany({
    where: (table, { eq }) => eq(table.organizationId, organizationId),
    columns: { slug: true },
    with: { owner: { columns: { username: true } } },
  });

  const sizes = await Promise.all(
    repos.map(async (repo) => {
      const owner = await resolveStorageOwner(repo, db);
      return owner ? getRepositorySize(owner, repo.slug) : 0;
    }),
  );

  return sizes.reduce((sum, size) => sum + size, 0);
}

/**
 * Invalidate the size cache for a specific repository.
 * Call after a push completes so the next check reflects the new size.
 */
export function invalidateRepositorySizeCache(
  owner: string,
  repo: string,
): void {
  const repoPath = getRepositoryPath(owner, repo);
  sizeCache.delete(repoPath);
}
