import { mkdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * Git storage configuration.
 */
export const gitStorageConfig = {
  /** Base path for all git repositories */
  repositoriesPath:
    process.env.GIT_REPOS_PATH || "/var/lib/arbor/repos",

  /** Maximum repository size in bytes (default: 1GB) */
  maxRepoSize: Number(process.env.GIT_MAX_REPO_SIZE) || 1024 * 1024 * 1024,

  /** Default branch name for new repositories */
  defaultBranch: process.env.GIT_DEFAULT_BRANCH || "main",
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
