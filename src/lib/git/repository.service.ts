import * as fs from "node:fs";
import { access, rename, rm } from "node:fs/promises";

import git from "isomorphic-git";
import http from "isomorphic-git/http/node";

import {
  deleteRepositoryViaBackend,
  getArborGitClient,
  getRepositoryInfoViaBackend,
  initRepositoryViaBackend,
  isArborGitEnabled,
  renameRepositoryViaBackend,
  repositoryExistsViaBackend,
} from "./grpcClient";
import {
  ensureOwnerDirectory,
  getRepositoryPath,
  gitStorageConfig,
} from "./storage.config";

import type { dbPool } from "lib/db/db";

/**
 * Repository lifecycle management.
 */
export const repositoryService = {
  /**
   * Initialize a new bare repository.
   */
  async init(owner: string, repo: string): Promise<boolean> {
    const client = getArborGitClient();
    if (isArborGitEnabled() && client) {
      return initRepositoryViaBackend(
        client,
        owner,
        repo,
        gitStorageConfig.defaultBranch,
      );
    }

    const dir = getRepositoryPath(owner, repo);

    try {
      // Ensure owner directory exists
      await ensureOwnerDirectory(owner);

      // Initialize bare repository
      await git.init({
        fs,
        dir,
        bare: true,
        defaultBranch: gitStorageConfig.defaultBranch,
      });

      return true;
    } catch (error) {
      console.error(`[Git] Failed to init repository ${owner}/${repo}:`, error);
      return false;
    }
  },

  /**
   * Check if a repository exists on disk.
   */
  async exists(owner: string, repo: string): Promise<boolean> {
    const client = getArborGitClient();
    if (isArborGitEnabled() && client) {
      return repositoryExistsViaBackend(client, owner, repo);
    }

    const dir = getRepositoryPath(owner, repo);

    try {
      // Check if HEAD file exists (indicates a git repo)
      await fs.promises.access(`${dir}/HEAD`);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Delete a repository from disk.
   */
  async delete(owner: string, repo: string): Promise<boolean> {
    const client = getArborGitClient();
    if (isArborGitEnabled() && client) {
      return deleteRepositoryViaBackend(client, owner, repo);
    }

    const dir = getRepositoryPath(owner, repo);

    try {
      await rm(dir, { recursive: true, force: true });
      return true;
    } catch (error) {
      console.error(
        `[Git] Failed to delete repository ${owner}/${repo}:`,
        error,
      );
      return false;
    }
  },

  /**
   * Rename a repository's on-disk storage by moving its bare directory.
   *
   * A rename only changes the slug, so the owner directory is unchanged and the
   * move is {owner}/{oldSlug}.git to {owner}/{newSlug}.git. The move is guarded
   * so it can never clobber another repository: if the target path already
   * exists the rename is refused. A missing source surfaces as a failure too, so
   * a caller never assumes the storage moved when it did not. Consistent with
   * the other methods, failures are logged server-side and returned as false
   * rather than thrown, so no internal detail leaks to the client.
   */
  async rename(
    owner: string,
    oldSlug: string,
    newSlug: string,
  ): Promise<boolean> {
    // Nothing to move when the slug is unchanged
    if (oldSlug === newSlug) return true;

    const client = getArborGitClient();
    if (isArborGitEnabled() && client) {
      return renameRepositoryViaBackend(client, owner, oldSlug, newSlug);
    }

    const oldPath = getRepositoryPath(owner, oldSlug);
    const newPath = getRepositoryPath(owner, newSlug);

    try {
      // Refuse to move onto an existing target so a rename never clobbers
      // another repository's storage
      const targetExists = await access(newPath)
        .then(() => true)
        .catch(() => false);

      if (targetExists) {
        console.error(
          `[Git] Failed to rename repository ${owner}/${oldSlug}: target ${owner}/${newSlug} already exists`,
        );
        return false;
      }

      await rename(oldPath, newPath);
      return true;
    } catch (error) {
      console.error(
        `[Git] Failed to rename repository ${owner}/${oldSlug} to ${owner}/${newSlug}:`,
        error,
      );
      return false;
    }
  },

  /**
   * Clone a repository from a remote URL.
   */
  async clone(
    owner: string,
    repo: string,
    url: string,
    options: {
      depth?: number;
      singleBranch?: boolean;
      ref?: string;
      onProgress?: (progress: {
        phase: string;
        loaded: number;
        total: number;
      }) => void;
    } = {},
  ): Promise<boolean> {
    const dir = getRepositoryPath(owner, repo);

    try {
      await ensureOwnerDirectory(owner);

      await git.clone({
        fs,
        http,
        dir,
        url,
        depth: options.depth,
        singleBranch: options.singleBranch,
        ref: options.ref,
        onProgress: options.onProgress,
      });

      return true;
    } catch (error) {
      console.error(
        `[Git] Failed to clone repository ${owner}/${repo} from ${url}:`,
        error,
      );
      return false;
    }
  },

  /**
   * Get repository statistics.
   */
  async getStats(
    owner: string,
    repo: string,
  ): Promise<{
    exists: boolean;
    isEmpty: boolean;
    defaultBranch: string | null;
    branchCount: number;
    tagCount: number;
  }> {
    const client = getArborGitClient();
    if (isArborGitEnabled() && client) {
      const info = await getRepositoryInfoViaBackend(client, owner, repo);
      if (!info) {
        return {
          exists: false,
          isEmpty: true,
          defaultBranch: null,
          branchCount: 0,
          tagCount: 0,
        };
      }
      return {
        exists: true,
        isEmpty: info.commitCount === 0,
        defaultBranch: info.defaultBranch || null,
        branchCount: info.branchCount,
        tagCount: info.tagCount,
      };
    }

    const dir = getRepositoryPath(owner, repo);

    const exists = await this.exists(owner, repo);
    if (!exists) {
      return {
        exists: false,
        isEmpty: true,
        defaultBranch: null,
        branchCount: 0,
        tagCount: 0,
      };
    }

    try {
      const branches = await git.listBranches({ fs, dir });
      const tags = await git.listTags({ fs, dir });

      let defaultBranch: string | null = null;
      try {
        defaultBranch = (await git.currentBranch({ fs, dir })) || null;
      } catch {
        // Empty repo or no HEAD
      }

      return {
        exists: true,
        isEmpty: branches.length === 0,
        defaultBranch,
        branchCount: branches.length,
        tagCount: tags.length,
      };
    } catch {
      return {
        exists: true,
        isEmpty: true,
        defaultBranch: null,
        branchCount: 0,
        tagCount: 0,
      };
    }
  },

  /**
   * Get the clone URL for a repository.
   */
  getCloneUrl(owner: string, repo: string, baseUrl: string): string {
    return `${baseUrl}/git/${owner}/${repo}.git`;
  },
};

/**
 * Remove a repository's on-disk git storage given its row id.
 *
 * The on-disk owner directory is the owning user's username, for personal and
 * organization repositories alike: organization identity (name, slug) lives in
 * the IDP rather than the database, and the Smart-HTTP routes resolve a
 * repository from its owner username (see resolveRepositorySummary), so bare
 * repositories are always stored under {username}/{slug}.git. The row is
 * resolved while it is still present, then the storage is deleted from disk.
 *
 * Any failure (repository already gone, storage missing, filesystem error) is
 * logged server-side and swallowed so that repository deletion never fails, and
 * no internal detail leaks to the client, because of a storage-cleanup problem.
 */
export const deleteRepositoryStorageById = async (
  rowId: string,
  db: typeof dbPool,
): Promise<void> => {
  if (!rowId) return;

  try {
    const repository = await db.query.repositoryTable.findFirst({
      where: (table, { eq }) => eq(table.id, rowId),
      with: { owner: { columns: { username: true } } },
    });

    const ownerUsername = repository?.owner?.username;

    if (!ownerUsername) return;

    await repositoryService.delete(ownerUsername, repository.slug);
  } catch (error) {
    console.error(
      "[Git] Failed to remove repository storage on delete:",
      error,
    );
  }
};
