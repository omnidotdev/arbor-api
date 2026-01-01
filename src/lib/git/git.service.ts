import * as fs from "node:fs";

import git from "isomorphic-git";

import { getRepositoryPath } from "./storage.config";

import type { ReadCommitResult } from "isomorphic-git";

export interface CommitInfo {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    timestamp: number;
  };
  committer: {
    name: string;
    email: string;
    timestamp: number;
  };
  parents: string[];
}

export interface TreeEntry {
  path: string;
  mode: string;
  type: "blob" | "tree" | "commit";
  oid: string;
}

export interface BranchInfo {
  name: string;
  sha: string;
  isDefault: boolean;
}

export interface TagInfo {
  name: string;
  sha: string;
  message?: string;
}

/**
 * Core git operations service using isomorphic-git.
 *
 * NOTE: We use `gitdir` instead of `dir` for all isomorphic-git calls
 * because our repositories are bare (no working tree).
 */
export const gitService = {
  /**
   * Get the current HEAD commit SHA.
   */
  async getHead(owner: string, repo: string): Promise<string | null> {
    const gitdir = getRepositoryPath(owner, repo);

    try {
      const sha = await git.resolveRef({ fs, gitdir, ref: "HEAD" });
      return sha;
    } catch {
      return null;
    }
  },

  /**
   * Resolve a ref (branch name, tag, or SHA) to a commit SHA.
   */
  async resolveRef(
    owner: string,
    repo: string,
    ref: string,
  ): Promise<string | null> {
    const gitdir = getRepositoryPath(owner, repo);

    try {
      const sha = await git.resolveRef({ fs, gitdir, ref });
      return sha;
    } catch {
      // Try as a short SHA
      try {
        const sha = await git.expandOid({ fs, gitdir, oid: ref });
        return sha;
      } catch {
        return null;
      }
    }
  },

  /**
   * Get commit information.
   */
  async getCommit(
    owner: string,
    repo: string,
    sha: string,
  ): Promise<CommitInfo | null> {
    const gitdir = getRepositoryPath(owner, repo);

    try {
      const result: ReadCommitResult = await git.readCommit({
        fs,
        gitdir,
        oid: sha,
      });
      const { commit, oid } = result;

      return {
        sha: oid,
        message: commit.message,
        author: {
          name: commit.author.name,
          email: commit.author.email,
          timestamp: commit.author.timestamp,
        },
        committer: {
          name: commit.committer.name,
          email: commit.committer.email,
          timestamp: commit.committer.timestamp,
        },
        parents: commit.parent,
      };
    } catch {
      return null;
    }
  },

  /**
   * Get commit log for a ref.
   */
  async getLog(
    owner: string,
    repo: string,
    ref: string,
    options: { depth?: number; skip?: number } = {},
  ): Promise<CommitInfo[]> {
    const gitdir = getRepositoryPath(owner, repo);
    const { depth = 20, skip = 0 } = options;

    try {
      const commits = await git.log({
        fs,
        gitdir,
        ref,
        depth: depth + skip,
      });

      return commits.slice(skip, skip + depth).map((entry) => ({
        sha: entry.oid,
        message: entry.commit.message,
        author: {
          name: entry.commit.author.name,
          email: entry.commit.author.email,
          timestamp: entry.commit.author.timestamp,
        },
        committer: {
          name: entry.commit.committer.name,
          email: entry.commit.committer.email,
          timestamp: entry.commit.committer.timestamp,
        },
        parents: entry.commit.parent,
      }));
    } catch {
      return [];
    }
  },

  /**
   * Get the tree (directory listing) at a specific path and ref.
   */
  async getTree(
    owner: string,
    repo: string,
    ref: string,
    path = "",
  ): Promise<TreeEntry[]> {
    const gitdir = getRepositoryPath(owner, repo);

    try {
      const sha = await git.resolveRef({ fs, gitdir, ref });

      // Read the commit to get the tree SHA
      const commit = await git.readCommit({ fs, gitdir, oid: sha });
      let treeSha = commit.commit.tree;

      // Navigate to the specified path
      if (path) {
        const pathParts = path.split("/").filter(Boolean);

        for (const part of pathParts) {
          const tree = await git.readTree({ fs, gitdir, oid: treeSha });
          const entry = tree.tree.find((e) => e.path === part);

          if (!entry || entry.type !== "tree") {
            return [];
          }

          treeSha = entry.oid;
        }
      }

      // Read the tree
      const tree = await git.readTree({ fs, gitdir, oid: treeSha });

      return tree.tree.map((entry) => ({
        path: entry.path,
        mode: entry.mode,
        type: entry.type as "blob" | "tree" | "commit",
        oid: entry.oid,
      }));
    } catch {
      return [];
    }
  },

  /**
   * Get file content as a string.
   */
  async getFileContent(
    owner: string,
    repo: string,
    ref: string,
    path: string,
  ): Promise<string | null> {
    const gitdir = getRepositoryPath(owner, repo);

    try {
      const sha = await git.resolveRef({ fs, gitdir, ref });
      const commit = await git.readCommit({ fs, gitdir, oid: sha });
      let treeSha = commit.commit.tree;

      // Navigate to the file
      const pathParts = path.split("/").filter(Boolean);
      const fileName = pathParts.pop();

      if (!fileName) return null;

      for (const part of pathParts) {
        const tree = await git.readTree({ fs, gitdir, oid: treeSha });
        const entry = tree.tree.find((e) => e.path === part);

        if (!entry || entry.type !== "tree") {
          return null;
        }

        treeSha = entry.oid;
      }

      // Find the file in the tree
      const tree = await git.readTree({ fs, gitdir, oid: treeSha });
      const fileEntry = tree.tree.find((e) => e.path === fileName);

      if (!fileEntry || fileEntry.type !== "blob") {
        return null;
      }

      // Read the blob
      const blob = await git.readBlob({ fs, gitdir, oid: fileEntry.oid });

      return new TextDecoder().decode(blob.blob);
    } catch {
      return null;
    }
  },

  /**
   * Get raw file content as a Buffer.
   */
  async getFileRaw(
    owner: string,
    repo: string,
    ref: string,
    path: string,
  ): Promise<Uint8Array | null> {
    const gitdir = getRepositoryPath(owner, repo);

    try {
      const sha = await git.resolveRef({ fs, gitdir, ref });
      const commit = await git.readCommit({ fs, gitdir, oid: sha });
      let treeSha = commit.commit.tree;

      const pathParts = path.split("/").filter(Boolean);
      const fileName = pathParts.pop();

      if (!fileName) return null;

      for (const part of pathParts) {
        const tree = await git.readTree({ fs, gitdir, oid: treeSha });
        const entry = tree.tree.find((e) => e.path === part);

        if (!entry || entry.type !== "tree") {
          return null;
        }

        treeSha = entry.oid;
      }

      const tree = await git.readTree({ fs, gitdir, oid: treeSha });
      const fileEntry = tree.tree.find((e) => e.path === fileName);

      if (!fileEntry || fileEntry.type !== "blob") {
        return null;
      }

      const blob = await git.readBlob({ fs, gitdir, oid: fileEntry.oid });

      return blob.blob;
    } catch {
      return null;
    }
  },

  /**
   * List all branches.
   */
  async listBranches(owner: string, repo: string): Promise<BranchInfo[]> {
    const gitdir = getRepositoryPath(owner, repo);

    try {
      const branches = await git.listBranches({ fs, gitdir });
      let defaultBranch: string | null = null;

      // Try to get HEAD to determine default branch
      try {
        // HEAD points to refs/heads/{branch}
        const headRef = await git.currentBranch({ fs, gitdir });
        defaultBranch = headRef || null;
      } catch {
        // Ignore errors
      }

      const result: BranchInfo[] = [];

      for (const branch of branches) {
        try {
          const sha = await git.resolveRef({
            fs,
            gitdir,
            ref: `refs/heads/${branch}`,
          });
          result.push({
            name: branch,
            sha,
            isDefault: branch === defaultBranch,
          });
        } catch {
          // Skip branches that can't be resolved
        }
      }

      return result;
    } catch {
      return [];
    }
  },

  /**
   * List all tags.
   */
  async listTags(owner: string, repo: string): Promise<TagInfo[]> {
    const gitdir = getRepositoryPath(owner, repo);

    try {
      const tags = await git.listTags({ fs, gitdir });
      const result: TagInfo[] = [];

      for (const tag of tags) {
        try {
          const sha = await git.resolveRef({
            fs,
            gitdir,
            ref: `refs/tags/${tag}`,
          });
          result.push({ name: tag, sha });
        } catch {
          // Skip tags that can't be resolved
        }
      }

      return result;
    } catch {
      return [];
    }
  },

  /**
   * Create a new branch from a ref.
   */
  async createBranch(
    owner: string,
    repo: string,
    branchName: string,
    ref: string,
  ): Promise<boolean> {
    const gitdir = getRepositoryPath(owner, repo);

    try {
      await git.branch({
        fs,
        gitdir,
        ref: branchName,
        checkout: false,
        object: ref,
      });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Delete a branch.
   */
  async deleteBranch(
    owner: string,
    repo: string,
    branchName: string,
  ): Promise<boolean> {
    const gitdir = getRepositoryPath(owner, repo);

    try {
      await git.deleteBranch({ fs, gitdir, ref: branchName });
      return true;
    } catch {
      return false;
    }
  },
};
