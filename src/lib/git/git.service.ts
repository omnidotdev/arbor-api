import * as fs from "node:fs";

import { diffLines } from "diff";
import git, { TREE } from "isomorphic-git";

import {
  getArborGitClient,
  getBlobViaBackend,
  getCommitLogViaBackend,
  getCommitViaBackend,
  getTreeViaBackend,
  isArborGitEnabled,
  listRefsViaBackend,
  resolveRefViaBackend,
  setDefaultBranchViaBackend,
} from "./grpcClient";
import { getRepositoryPath } from "./storage.config";

import type { Client } from "@grpc/grpc-js";
import type { BackendCommit } from "./grpcClient";

/** Map a commit as arbor-git returns it to the CommitInfo shape. */
const mapBackendCommit = (commit: BackendCommit): CommitInfo => ({
  sha: commit.oid,
  message: commit.message,
  author: {
    name: commit.author?.name ?? "",
    email: commit.author?.email ?? "",
    timestamp: Number(commit.author?.timestamp ?? 0),
  },
  committer: {
    name: commit.committer?.name ?? "",
    email: commit.committer?.email ?? "",
    timestamp: Number(commit.committer?.timestamp ?? 0),
  },
  parents: commit.parentOids ?? [],
});

/**
 * Resolve a file's bytes at a ref through the backend: navigate to the blob via
 * GetTree on its parent path, then stream it with GetBlob. Returns null when the
 * path is not a blob, matching the in-process getFileContent/getFileRaw.
 */
const resolveBlobViaBackend = async (
  client: Client,
  owner: string,
  repo: string,
  ref: string,
  path: string,
): Promise<Buffer | null> => {
  const parts = path.split("/").filter(Boolean);
  const fileName = parts.pop();
  if (!fileName) return null;

  const entries = await getTreeViaBackend(
    client,
    owner,
    repo,
    ref,
    parts.join("/"),
  );
  const entry = entries.find(
    (candidate) =>
      candidate.name === fileName && candidate.type === "TREE_ENTRY_TYPE_BLOB",
  );
  if (!entry) return null;

  return getBlobViaBackend(client, owner, repo, entry.oid);
};

/** arbor-git TreeEntryMode enum -> git mode string. */
const BACKEND_TREE_MODE: Record<string, string> = {
  TREE_ENTRY_MODE_FILE: "100644",
  TREE_ENTRY_MODE_EXECUTABLE: "100755",
  TREE_ENTRY_MODE_SYMLINK: "120000",
  TREE_ENTRY_MODE_TREE: "040000",
  TREE_ENTRY_MODE_SUBMODULE: "160000",
};

/** arbor-git TreeEntryType enum -> the type getTree returns. */
const BACKEND_TREE_TYPE: Record<string, "blob" | "tree" | "commit"> = {
  TREE_ENTRY_TYPE_BLOB: "blob",
  TREE_ENTRY_TYPE_TREE: "tree",
  TREE_ENTRY_TYPE_COMMIT: "commit",
};

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

/**
 * Last commit that touched a tree entry, used for the GitHub-style per-file
 * last-commit column in the file browser.
 */
export interface TreeEntryCommit {
  /** Entry basename, matching the `path` returned by getTree */
  path: string;
  commitOid: string;
  messageHeadline: string;
  committedDate: string;
  authorName: string;
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
 * Collect the set of blob paths that changed between a base and head tree.
 *
 * A null baseOid is treated as an empty tree, so every blob path is returned
 * (root-commit case). Only paths are produced (no blob content is read), keeping
 * the per-commit comparison cheap for the tree last-commit walk.
 */
async function collectChangedPaths(
  gitdir: string,
  baseOid: string | null,
  headOid: string,
): Promise<string[]> {
  const trees =
    baseOid === null
      ? [TREE({ ref: headOid })]
      : [TREE({ ref: baseOid }), TREE({ ref: headOid })];

  const paths = (await git.walk({
    fs,
    gitdir,
    trees,
    map: async (filepath, walkerEntries) => {
      if (filepath === ".") return;

      const [first, second] = walkerEntries as [
        WalkerEntry | null,
        WalkerEntry | null,
      ];
      const baseEntry = baseOid === null ? null : first;
      const headEntry = baseOid === null ? first : second;

      const baseType = baseEntry ? await baseEntry.type() : null;
      const headType = headEntry ? await headEntry.type() : null;

      // Only blobs are reported; walk still descends into trees
      if (baseType === "tree" || headType === "tree") return;

      const oldOid = baseEntry ? await baseEntry.oid() : null;
      const newOid = headEntry ? await headEntry.oid() : null;

      // Unchanged, or a non-blob on both sides
      if (oldOid === newOid) return;

      return filepath;
    },
  })) as string[];

  return paths;
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
    const client = getArborGitClient();
    if (isArborGitEnabled() && client) {
      return resolveRefViaBackend(client, owner, repo, "HEAD");
    }

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
    const client = getArborGitClient();
    if (isArborGitEnabled() && client) {
      return resolveRefViaBackend(client, owner, repo, ref);
    }

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
    const client = getArborGitClient();
    if (isArborGitEnabled() && client) {
      const commit = await getCommitViaBackend(client, owner, repo, sha);
      return commit ? mapBackendCommit(commit) : null;
    }

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
    const { depth = 20, skip = 0 } = options;

    const client = getArborGitClient();
    if (isArborGitEnabled() && client) {
      try {
        const commits = await getCommitLogViaBackend(
          client,
          owner,
          repo,
          ref,
          depth,
          skip,
        );
        return commits.map(mapBackendCommit);
      } catch {
        return [];
      }
    }

    const gitdir = getRepositoryPath(owner, repo);

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
    const client = getArborGitClient();
    if (isArborGitEnabled() && client) {
      try {
        const entries = await getTreeViaBackend(client, owner, repo, ref, path);
        return entries.map((entry) => ({
          path: entry.name,
          mode: BACKEND_TREE_MODE[entry.mode] ?? "100644",
          type: BACKEND_TREE_TYPE[entry.type] ?? "blob",
          oid: entry.oid,
        }));
      } catch {
        return [];
      }
    }

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
   * Get the last commit that touched each entry of the tree at `path` and `ref`.
   *
   * Lists the entries at that tree path, then walks commit history from `ref`
   * newest-first. For each commit it compares the commit tree against its first
   * parent and assigns, to each still-unassigned entry, the first (most recent)
   * commit whose change set touches that entry: a file entry matches an exact
   * changed path, a directory entry matches any changed path under `dir/`. The
   * walk stops early once every entry is assigned or history is exhausted, so
   * the expensive per-commit tree comparison is skipped as soon as possible.
   *
   * The root commit (no parent) is diffed against the empty tree. Entries never
   * touched in the walked history are simply omitted from the result. Wrapped in
   * try/catch to return a partial/empty result rather than throwing, matching
   * the other read methods.
   */
  async getTreeLastCommits(
    owner: string,
    repo: string,
    ref: string,
    path = "",
  ): Promise<TreeEntryCommit[]> {
    const gitdir = getRepositoryPath(owner, repo);

    try {
      const entries = await this.getTree(owner, repo, ref, path);
      if (entries.length === 0) return [];

      const prefix = path ? `${path.replace(/\/+$/, "")}/` : "";

      // Track each unassigned entry by its basename, carrying its full
      // repo-relative path and whether it is a directory
      const pending = new Map<
        string,
        { basename: string; fullPath: string; isDir: boolean }
      >();
      for (const entry of entries) {
        pending.set(entry.path, {
          basename: entry.path,
          fullPath: `${prefix}${entry.path}`,
          isDir: entry.type === "tree",
        });
      }

      const assigned: TreeEntryCommit[] = [];

      // Single history walk, newest-first, with early exit once all assigned
      const commits = await git.log({ fs, gitdir, ref });

      for (const { oid, commit } of commits) {
        if (pending.size === 0) break;

        const parentOid = commit.parent[0] ?? null;
        const changedPaths = await collectChangedPaths(gitdir, parentOid, oid);
        if (changedPaths.length === 0) continue;

        const changedSet = new Set(changedPaths);
        const headline = commit.message.split("\n")[0]?.trim() ?? "";
        const committedDate = new Date(
          commit.committer.timestamp * 1000,
        ).toISOString();

        // Safe to delete the current key from a Map during for..of iteration
        for (const [key, meta] of pending) {
          const touched = meta.isDir
            ? changedPaths.some((p) => p.startsWith(`${meta.fullPath}/`))
            : changedSet.has(meta.fullPath);

          if (!touched) continue;

          assigned.push({
            path: meta.basename,
            commitOid: oid,
            messageHeadline: headline,
            committedDate,
            authorName: commit.author.name,
          });
          pending.delete(key);
        }
      }

      return assigned;
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
    const client = getArborGitClient();
    if (isArborGitEnabled() && client) {
      try {
        const bytes = await resolveBlobViaBackend(
          client,
          owner,
          repo,
          ref,
          path,
        );
        return bytes === null ? null : new TextDecoder().decode(bytes);
      } catch {
        return null;
      }
    }

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
    const client = getArborGitClient();
    if (isArborGitEnabled() && client) {
      try {
        return await resolveBlobViaBackend(client, owner, repo, ref, path);
      } catch {
        return null;
      }
    }

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
   * Get a blob's raw bytes directly by its oid, or null if it cannot be read.
   * Used to serve content-addressed blobs (e.g. diff image bytes) where the
   * caller holds a blob oid rather than a commit ref plus path.
   */
  async getBlobRawByOid(
    owner: string,
    repo: string,
    oid: string,
  ): Promise<Uint8Array | null> {
    const gitdir = getRepositoryPath(owner, repo);
    return readBlobBytes(gitdir, oid);
  },

  /**
   * List all branches.
   */
  async listBranches(owner: string, repo: string): Promise<BranchInfo[]> {
    const client = getArborGitClient();
    if (isArborGitEnabled() && client) {
      const refs = await listRefsViaBackend(client, owner, repo);
      return refs
        .filter((ref) => ref.type === "REF_TYPE_BRANCH")
        .map((ref) => ({
          name: ref.shortName,
          sha: ref.oid,
          isDefault: ref.isDefault,
        }));
    }

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
   * Point the bare repository's HEAD at a branch as a symbolic ref.
   *
   * Keeps the on-disk default in sync with repository.defaultBranch so a fresh
   * clone checks out the intended branch. The branch ref is resolved first, and
   * HEAD is left untouched (returns false) when the branch does not exist, so
   * HEAD never points at a nonexistent ref.
   */
  async setDefaultBranch(
    owner: string,
    repo: string,
    branch: string,
  ): Promise<boolean> {
    const client = getArborGitClient();
    if (isArborGitEnabled() && client) {
      return setDefaultBranchViaBackend(client, owner, repo, branch);
    }

    const gitdir = getRepositoryPath(owner, repo);

    try {
      // Validate the branch exists before moving HEAD
      await git.resolveRef({ fs, gitdir, ref: `refs/heads/${branch}` });

      await git.writeRef({
        fs,
        gitdir,
        ref: "HEAD",
        value: `refs/heads/${branch}`,
        symbolic: true,
        force: true,
      });

      return true;
    } catch (error) {
      console.error("[gitService.setDefaultBranch] failed:", error);
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
   * Record a stacked-change merge intent as a new ref under the arbor namespace,
   * without ever touching a user branch or rewriting history.
   *
   * Writes refs/arbor/merge-intent/{changeId} pointing at oid. The write is
   * non-forced and refuses to overwrite: if an intent ref already exists it must
   * already point at the same oid (idempotent re-record), otherwise the write is
   * refused and false is returned. A user's existing branches, tags and history
   * are never modified, so this is safe on a live repository that auto-deploys on
   * branch updates. Failures are logged server-side and returned as false so no
   * internal detail leaks to the caller.
   */
  async recordMergeIntent(
    owner: string,
    repo: string,
    changeId: string,
    oid: string,
  ): Promise<boolean> {
    const gitdir = getRepositoryPath(owner, repo);
    const ref = `refs/arbor/merge-intent/${changeId}`;

    try {
      // Never clobber: an existing intent ref must already match the target oid
      const existing = await git
        .resolveRef({ fs, gitdir, ref })
        .catch(() => null);

      if (existing) return existing === oid;

      await git.writeRef({ fs, gitdir, ref, value: oid, force: false });
      return true;
    } catch (error) {
      console.error(
        `[Git] Failed to record merge intent for ${owner}/${repo} change ${changeId}:`,
        error,
      );
      return false;
    }
  },

  /**
   * Land a change commit onto its base branch and return the resulting tip.
   *
   * Advances refs/heads/{targetBranch} forward to the change: a fast-forward
   * when the base is an ancestor of the change, otherwise a merge commit whose
   * parents are the base tip and the change commit. Both only move the branch
   * forward, so no history is rewritten and no commits are lost; this is the
   * same operation a pull request merge performs. Conflict resolution takes the
   * change tree (the same simplification the pull request merge uses). Returns
   * the new tip and the mode, or a typed error with details logged server-side.
   */
  async mergeChangeIntoBranch(
    owner: string,
    repo: string,
    commitOid: string,
    targetBranch: string,
    author: { name: string; email: string },
    message: string,
  ): Promise<{
    sha: string | null;
    mode: "fast-forward" | "merge-commit" | "already-merged" | null;
    error?: string;
  }> {
    const gitdir = getRepositoryPath(owner, repo);
    const ref = `refs/heads/${targetBranch}`;

    try {
      const targetSha = await git.resolveRef({ fs, gitdir, ref });

      // Already contained in the base, nothing to advance
      const alreadyMerged = await git.isDescendent({
        fs,
        gitdir,
        oid: targetSha,
        ancestor: commitOid,
      });
      if (alreadyMerged) return { sha: targetSha, mode: "already-merged" };

      // Fast-forward when the change already builds on the base tip
      const isFastForward = await git.isDescendent({
        fs,
        gitdir,
        oid: commitOid,
        ancestor: targetSha,
      });
      if (isFastForward) {
        await git.writeRef({ fs, gitdir, ref, value: commitOid, force: true });
        return { sha: commitOid, mode: "fast-forward" };
      }

      // Diverged, create a merge commit taking the change tree, parented on both
      const changeCommit = await git.readCommit({ fs, gitdir, oid: commitOid });
      const mergeCommitSha = await git.commit({
        fs,
        gitdir,
        message,
        tree: changeCommit.commit.tree,
        parent: [targetSha, commitOid],
        author,
        committer: author,
      });
      await git.writeRef({
        fs,
        gitdir,
        ref,
        value: mergeCommitSha,
        force: true,
      });
      return { sha: mergeCommitSha, mode: "merge-commit" };
    } catch (error) {
      console.error(
        `[Git] Failed to merge change ${commitOid} into ${owner}/${repo} ${targetBranch}:`,
        error,
      );
      return { sha: null, mode: null, error: "merge failed" };
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
