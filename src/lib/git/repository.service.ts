import * as fs from "node:fs";
import { rm } from "node:fs/promises";

import git from "isomorphic-git";
import http from "isomorphic-git/http/node";

import {
  ensureOwnerDirectory,
  getRepositoryPath,
  gitStorageConfig,
} from "./storage.config";

/**
 * Repository lifecycle management.
 */
export const repositoryService = {
  /**
   * Initialize a new bare repository.
   */
  async init(owner: string, repo: string): Promise<boolean> {
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
