import * as fs from "node:fs";

import { diffLines } from "diff";
import git, { TREE } from "isomorphic-git";

import { getRepositoryPath } from "./storage.config";

import type { ReadCommitResult, WalkerEntry } from "isomorphic-git";

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
 * Change status for a file between two trees.
 * Rename and copy detection is out of scope for the initial diff surface, so
 * only ADDED / DELETED / MODIFIED / TYPE_CHANGED are currently produced.
 */
export type DiffStatus =
  | "ADDED"
  | "DELETED"
  | "MODIFIED"
  | "RENAMED"
  | "COPIED"
  | "TYPE_CHANGED";

export interface ChangedFile {
  path: string;
  oldPath: string | null;
  status: DiffStatus;
  oldOid: string | null;
  newOid: string | null;
  isBinary: boolean;
  isImage: boolean;
  additions: number;
  deletions: number;
}

export interface FileDiffContent {
  path: string;
  status: DiffStatus;
  isBinary: boolean;
  oldText: string | null;
  newText: string | null;
}

/** File extensions rendered as images in the diff viewer */
const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "avif",
  "bmp",
  "ico",
  "svg",
]);

/**
 * Whether a path is an image, derived from its extension.
 */
function isImagePath(path: string): boolean {
  const dot = path.lastIndexOf(".");
  if (dot < 0) return false;
  return IMAGE_EXTENSIONS.has(path.slice(dot + 1).toLowerCase());
}

/**
 * Whether a blob is binary, using git's heuristic of a NUL byte in the first
 * 8000 bytes (mirrors the isBinary notion already surfaced on Blob).
 */
function isBinaryContent(bytes: Uint8Array): boolean {
  const limit = Math.min(bytes.length, 8000);
  for (let i = 0; i < limit; i++) {
    if (bytes[i] === 0) return true;
  }
  return false;
}

/**
 * Count added and removed lines between two texts.
 */
function countLineChanges(
  oldText: string,
  newText: string,
): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  for (const part of diffLines(oldText, newText)) {
    if (part.added) additions += part.count ?? 0;
    else if (part.removed) deletions += part.count ?? 0;
  }
  return { additions, deletions };
}

/**
 * Read a blob's bytes by oid, or null if it cannot be read.
 */
async function readBlobBytes(
  gitdir: string,
  oid: string,
): Promise<Uint8Array | null> {
  try {
    const { blob } = await git.readBlob({ fs, gitdir, oid });
    return blob;
  } catch {
    return null;
  }
}

const decoder = new TextDecoder();

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

          if (entry?.type !== "tree") {
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

        if (entry?.type !== "tree") {
          return null;
        }

        treeSha = entry.oid;
      }

      // Find the file in the tree
      const tree = await git.readTree({ fs, gitdir, oid: treeSha });
      const fileEntry = tree.tree.find((e) => e.path === fileName);

      if (fileEntry?.type !== "blob") {
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

        if (entry?.type !== "tree") {
          return null;
        }

        treeSha = entry.oid;
      }

      const tree = await git.readTree({ fs, gitdir, oid: treeSha });
      const fileEntry = tree.tree.find((e) => e.path === fileName);

      if (fileEntry?.type !== "blob") {
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

  /**
   * Merge source branch into target branch.
   * Returns the merge commit SHA on success, null on failure.
   *
   * NOTE: isomorphic-git's merge requires a working directory, but we use bare repos.
   * For bare repos, we perform a fast-forward merge when possible, or create a
   * merge commit by writing the tree and commit objects directly.
   */
  async merge(
    owner: string,
    repo: string,
    sourceBranch: string,
    targetBranch: string,
    author: { name: string; email: string },
    message: string,
  ): Promise<{ sha: string | null; error?: string }> {
    const gitdir = getRepositoryPath(owner, repo);

    try {
      // Resolve both branches to their commit SHAs
      const sourceSha = await git.resolveRef({
        fs,
        gitdir,
        ref: `refs/heads/${sourceBranch}`,
      });
      const targetSha = await git.resolveRef({
        fs,
        gitdir,
        ref: `refs/heads/${targetBranch}`,
      });

      // Read source commit to get its tree for merge commit
      const sourceCommit = await git.readCommit({ fs, gitdir, oid: sourceSha });

      // Check if it's a fast-forward (source is descendant of target)
      const isAncestor = await git.isDescendent({
        fs,
        gitdir,
        oid: sourceSha,
        ancestor: targetSha,
      });

      if (isAncestor) {
        // Fast-forward merge: just update the target branch to point to source
        await git.writeRef({
          fs,
          gitdir,
          ref: `refs/heads/${targetBranch}`,
          value: sourceSha,
          force: true,
        });
        return { sha: sourceSha };
      }

      // Check if source is behind target (already merged)
      const isAlreadyMerged = await git.isDescendent({
        fs,
        gitdir,
        oid: targetSha,
        ancestor: sourceSha,
      });

      if (isAlreadyMerged) {
        return { sha: null, error: "Source branch is already merged" };
      }

      // Non-fast-forward merge: create a merge commit
      // Find the merge base
      const [mergeBase] = await git.findMergeBase({
        fs,
        gitdir,
        oids: [sourceSha, targetSha],
      });

      if (!mergeBase) {
        return { sha: null, error: "No common ancestor found" };
      }

      // For simplicity, we'll use the source tree if there are no conflicts
      // A full merge would require tree diffing and conflict detection
      // For MVP, we'll do a simple merge that takes the source tree
      const mergeCommitSha = await git.commit({
        fs,
        gitdir,
        message,
        tree: sourceCommit.commit.tree,
        parent: [targetSha, sourceSha],
        author: {
          name: author.name,
          email: author.email,
        },
        committer: {
          name: author.name,
          email: author.email,
        },
      });

      // Update the target branch to point to the merge commit
      await git.writeRef({
        fs,
        gitdir,
        ref: `refs/heads/${targetBranch}`,
        value: mergeCommitSha,
        force: true,
      });

      return { sha: mergeCommitSha };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return { sha: null, error: errorMessage };
    }
  },

  /**
   * Find the merge base (most recent common ancestor) of two refs.
   * Returns null when either ref is unresolvable or no common ancestor exists.
   */
  async getMergeBase(
    owner: string,
    repo: string,
    refA: string,
    refB: string,
  ): Promise<string | null> {
    const gitdir = getRepositoryPath(owner, repo);

    try {
      const [oidA, oidB] = await Promise.all([
        git.resolveRef({ fs, gitdir, ref: refA }),
        git.resolveRef({ fs, gitdir, ref: refB }),
      ]);

      const bases = await git.findMergeBase({
        fs,
        gitdir,
        oids: [oidA, oidB],
      });

      return bases[0] ?? null;
    } catch {
      return null;
    }
  },

  /**
   * List the files that changed between a base and head ref.
   *
   * Walks both trees with isomorphic-git and derives per-file status, blob
   * oids, binary/image flags and line counts. A null baseRef is treated as an
   * empty tree, so every file resolves to ADDED (root-commit / initial diff).
   */
  async getChangedFiles(
    owner: string,
    repo: string,
    baseRef: string | null,
    headRef: string,
  ): Promise<ChangedFile[]> {
    const gitdir = getRepositoryPath(owner, repo);

    try {
      const trees =
        baseRef === null
          ? [TREE({ ref: headRef })]
          : [TREE({ ref: baseRef }), TREE({ ref: headRef })];

      const entries = (await git.walk({
        fs,
        gitdir,
        trees,
        map: async (filepath, walkerEntries) => {
          if (filepath === ".") return;

          const [first, second] = walkerEntries as [
            WalkerEntry | null,
            WalkerEntry | null,
          ];
          const baseEntry = baseRef === null ? null : first;
          const headEntry = baseRef === null ? first : second;

          const baseType = baseEntry ? await baseEntry.type() : null;
          const headType = headEntry ? await headEntry.type() : null;

          // Only blobs are reported; walk still descends into trees
          if (baseType === "tree" || headType === "tree") return;

          const oldOid = baseEntry ? await baseEntry.oid() : null;
          const newOid = headEntry ? await headEntry.oid() : null;

          // Unchanged, or a non-blob on both sides
          if (oldOid === newOid) return;

          let status: DiffStatus;
          if (!oldOid) {
            status = "ADDED";
          } else if (!newOid) {
            status = "DELETED";
          } else {
            const oldMode = await baseEntry?.mode();
            const newMode = await headEntry?.mode();
            status = oldMode !== newMode ? "TYPE_CHANGED" : "MODIFIED";
          }

          return { filepath, status, oldOid, newOid };
        },
      })) as Array<{
        filepath: string;
        status: DiffStatus;
        oldOid: string | null;
        newOid: string | null;
      }>;

      const files: ChangedFile[] = [];

      for (const entry of entries) {
        const { filepath, status, oldOid, newOid } = entry;

        const newBytes = newOid ? await readBlobBytes(gitdir, newOid) : null;
        const oldBytes = oldOid ? await readBlobBytes(gitdir, oldOid) : null;

        const sample = newBytes ?? oldBytes;
        const isBinary = sample ? isBinaryContent(sample) : false;

        let additions = 0;
        let deletions = 0;
        if (!isBinary) {
          const oldText = oldBytes ? decoder.decode(oldBytes) : "";
          const newText = newBytes ? decoder.decode(newBytes) : "";
          ({ additions, deletions } = countLineChanges(oldText, newText));
        }

        files.push({
          path: filepath,
          oldPath: null,
          status,
          oldOid,
          newOid,
          isBinary,
          isImage: isImagePath(filepath),
          additions,
          deletions,
        });
      }

      return files;
    } catch {
      return [];
    }
  },

  /**
   * Read the old and new content for a single file between two refs.
   *
   * Text is returned for both sides of a modification; the missing side of an
   * add/delete is null, and binary files return null on both sides (their bytes
   * are served separately over the raw HTTP endpoint). A null baseRef is treated
   * as an empty tree. Returns null when the path exists on neither side.
   */
  async getFileDiffContent(
    owner: string,
    repo: string,
    baseRef: string | null,
    headRef: string,
    path: string,
  ): Promise<FileDiffContent | null> {
    try {
      const newBytes = await this.getFileRaw(owner, repo, headRef, path);
      const oldBytes =
        baseRef === null
          ? null
          : await this.getFileRaw(owner, repo, baseRef, path);

      if (!newBytes && !oldBytes) return null;

      let status: DiffStatus;
      if (!oldBytes) status = "ADDED";
      else if (!newBytes) status = "DELETED";
      else status = "MODIFIED";

      const sample = newBytes ?? oldBytes;
      const isBinary = sample ? isBinaryContent(sample) : false;

      return {
        path,
        status,
        isBinary,
        oldText: isBinary || !oldBytes ? null : decoder.decode(oldBytes),
        newText: isBinary || !newBytes ? null : decoder.decode(newBytes),
      };
    } catch {
      return null;
    }
  },
};
