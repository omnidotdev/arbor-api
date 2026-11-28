import * as fs from "node:fs";

import { diffLines } from "diff";
import git, { TREE } from "isomorphic-git";

import {
  createBranchViaBackend,
  createTagViaBackend,
  deleteBranchViaBackend,
  deleteTagViaBackend,
  getArborGitClient,
  getBlobViaBackend,
  getCommitLogViaBackend,
  getCommitViaBackend,
  getDiffViaBackend,
  getMergeBaseViaBackend,
  getTreeViaBackend,
  isArborGitEnabled,
  isBackendNotFound,
  listRefsViaBackend,
  mergeChangeViaBackend,
  recordMergeIntentViaBackend,
  resolveRefViaBackend,
  setDefaultBranchViaBackend,
} from "./grpcClient";

/** arbor-git DiffStatus enum -> the status getChangedFiles returns. */
const BACKEND_DIFF_STATUS: Record<string, DiffStatus> = {
  DIFF_STATUS_ADDED: "ADDED",
  DIFF_STATUS_DELETED: "DELETED",
  DIFF_STATUS_MODIFIED: "MODIFIED",
  DIFF_STATUS_RENAMED: "RENAMED",
  DIFF_STATUS_COPIED: "COPIED",
  DIFF_STATUS_TYPE_CHANGED: "TYPE_CHANGED",
};

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

/**
 * {@link resolveBlobViaBackend}, but a path, ref or blob the backend reports
 * missing reads as null, while any other backend error still rejects. Lets a
 * caller treat an absent file (the base side of an added file, say) as absent
 * and fail closed on a backend that could not answer
 */
const resolveBlobOrAbsentViaBackend = async (
  client: Client,
  owner: string,
  repo: string,
  ref: string,
  path: string,
): Promise<Buffer | null> => {
  try {
    return await resolveBlobViaBackend(client, owner, repo, ref, path);
  } catch (error) {
    if (isBackendNotFound(error)) return null;
    throw error;
  }
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

/** A fully qualified branch or tag ref name, split into its kind and short name */
export interface ParsedRefName {
  kind: "branch" | "tag";
  shortName: string;
}

/**
 * Whether a fully qualified ref name is valid, by git's `check-ref-format`
 * rules: no empty, `.`-leading or `.lock`-ending component, no `..`, `@{`,
 * `//`, control character, space or any of `~ ^ : ? * [ \`, not ending in `/`
 * or `.`, and not `@`.
 */
export function isValidRefName(name: string): boolean {
  if (!name || name === "@" || name.endsWith("/") || name.endsWith(".")) {
    return false;
  }
  if (name.includes("..") || name.includes("@{") || name.includes("//")) {
    return false;
  }
  for (const char of name) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f || " ~^:?*[\\".includes(char)) {
      return false;
    }
  }
  return name
    .split("/")
    .every(
      (component) =>
        component.length > 0 &&
        !component.startsWith(".") &&
        !component.endsWith(".lock"),
    );
}

/**
 * Parse `refs/heads/{name}` or `refs/tags/{name}`. Anything else is null:
 * another namespace, an empty short name, a short name that is itself
 * qualified (`refs/tags/refs/heads/master` must never address the default
 * branch), `HEAD`, an option-like name, or an invalid ref name. So a caller
 * can never mistake one kind of ref for the other.
 */
export function parseRefName(name: string): ParsedRefName | null {
  for (const [prefix, kind] of [
    ["refs/heads/", "branch"],
    ["refs/tags/", "tag"],
  ] as const) {
    if (!name.startsWith(prefix)) continue;

    const shortName = name.slice(prefix.length);
    if (
      !shortName ||
      shortName.startsWith("refs/") ||
      shortName === "HEAD" ||
      shortName.startsWith("-") ||
      !isValidRefName(name)
    ) {
      return null;
    }
    return { kind, shortName };
  }
  return null;
}

/**
 * Whether a short branch or tag name stays within its own kind once qualified
 * (see {@link parseRefName}). The short-name git operations refuse anything
 * else, so no caller can reach another ref through them.
 */
function isShortRefName(kind: "branch" | "tag", shortName: string): boolean {
  const prefix = kind === "branch" ? "refs/heads/" : "refs/tags/";
  return parseRefName(`${prefix}${shortName}`)?.shortName === shortName;
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
 * Client-facing reasons a pull request merge was refused with the target left
 * untouched, keyed by the landing mode that refused it.
 */
const MERGE_REFUSALS: Record<string, string> = {
  "already-merged": "Source branch is already merged",
  "out-of-date":
    "The branch is out of date with its target, update it first and try again",
  "unrelated-histories": "No common ancestor found",
};

/**
 * Shape one file's old and new bytes into a FileDiffContent, or null when the
 * path exists on neither side.
 */
function buildFileDiffContent(
  path: string,
  oldBytes: Uint8Array | null,
  newBytes: Uint8Array | null,
): FileDiffContent | null {
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
}

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
 * Core git operations service.
 *
 * With arbor-git configured (`USE_ARBOR_GIT` plus `GIT_SERVICE_URL`) every
 * operation goes to it over gRPC and none reads or writes the local
 * `GIT_REPOS_PATH` copy, which is not the repository of record; a backend
 * error fails the operation instead of falling back. Without it (local dev)
 * operations run in-process with isomorphic-git.
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
    const client = getArborGitClient();
    if (isArborGitEnabled() && client) {
      try {
        const entries = await this.getTree(owner, repo, ref, path);
        if (entries.length === 0) return [];

        const prefix = path ? `${path.replace(/\/+$/, "")}/` : "";
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
        // Full history, newest-first (limit 0 = unlimited)
        const commits = await getCommitLogViaBackend(
          client,
          owner,
          repo,
          ref,
          0,
          0,
        );

        for (const commit of commits) {
          if (pending.size === 0) break;

          // Empty base for a root commit -> diff against the empty tree
          const parentOid = commit.parentOids?.[0] ?? "";
          const changed = await getDiffViaBackend(
            client,
            owner,
            repo,
            parentOid,
            commit.oid,
          );
          if (changed.length === 0) continue;

          const changedPaths = changed.map((entry) => entry.path);
          const changedSet = new Set(changedPaths);
          const headline = commit.message.split("\n")[0]?.trim() ?? "";
          const committedDate = new Date(
            Number(commit.committer?.timestamp ?? 0) * 1000,
          ).toISOString();

          for (const [key, meta] of pending) {
            const touched = meta.isDir
              ? changedPaths.some((p) => p.startsWith(`${meta.fullPath}/`))
              : changedSet.has(meta.fullPath);
            if (!touched) continue;

            assigned.push({
              path: meta.basename,
              commitOid: commit.oid,
              messageHeadline: headline,
              committedDate,
              authorName: commit.author?.name ?? "",
            });
            pending.delete(key);
          }
        }

        return assigned;
      } catch {
        return [];
      }
    }

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
    const client = getArborGitClient();
    if (isArborGitEnabled() && client) {
      // A missing blob is a 404; a backend that cannot answer rejects
      try {
        return await getBlobViaBackend(client, owner, repo, oid);
      } catch (error) {
        if (isBackendNotFound(error)) return null;
        throw error;
      }
    }

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
    const client = getArborGitClient();
    if (isArborGitEnabled() && client) {
      const refs = await listRefsViaBackend(client, owner, repo);
      return refs
        .filter((ref) => ref.type === "REF_TYPE_TAG")
        .map((ref) => ({ name: ref.shortName, sha: ref.oid }));
    }

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
    if (!isShortRefName("branch", branchName)) return false;

    const client = getArborGitClient();
    if (isArborGitEnabled() && client) {
      try {
        await createBranchViaBackend(client, owner, repo, branchName, ref);
        return true;
      } catch (error) {
        console.error("[gitService.createBranch] arbor-git failed:", error);
        return false;
      }
    }

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
    if (!isShortRefName("branch", branchName)) return false;

    const client = getArborGitClient();
    if (isArborGitEnabled() && client) {
      try {
        return await deleteBranchViaBackend(client, owner, repo, branchName);
      } catch (error) {
        console.error("[gitService.deleteBranch] arbor-git failed:", error);
        return false;
      }
    }

    const gitdir = getRepositoryPath(owner, repo);

    try {
      await git.deleteBranch({ fs, gitdir, ref: branchName });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Create a lightweight tag pointing at a ref or oid. Never touches a branch.
   */
  async createTag(
    owner: string,
    repo: string,
    tagName: string,
    target: string,
  ): Promise<boolean> {
    if (!isShortRefName("tag", tagName)) return false;

    const client = getArborGitClient();
    if (isArborGitEnabled() && client) {
      try {
        await createTagViaBackend(client, owner, repo, tagName, target);
        return true;
      } catch (error) {
        console.error("[gitService.createTag] arbor-git failed:", error);
        return false;
      }
    }

    const gitdir = getRepositoryPath(owner, repo);

    try {
      await git.tag({ fs, gitdir, ref: tagName, object: target });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Delete a tag. Only `refs/tags/{tagName}` is removed, so a branch of the same
   * name is never touched.
   */
  async deleteTag(
    owner: string,
    repo: string,
    tagName: string,
  ): Promise<boolean> {
    if (!isShortRefName("tag", tagName)) return false;

    const client = getArborGitClient();
    if (isArborGitEnabled() && client) {
      try {
        return await deleteTagViaBackend(client, owner, repo, tagName);
      } catch (error) {
        console.error("[gitService.deleteTag] arbor-git failed:", error);
        return false;
      }
    }

    const gitdir = getRepositoryPath(owner, repo);

    try {
      // deleteTag removes only refs/tags/{ref}; confirm it existed first so a
      // missing tag reports failure like the backend does
      await git.resolveRef({ fs, gitdir, ref: `refs/tags/${tagName}` });
      await git.deleteTag({ fs, gitdir, ref: tagName });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Create a fully qualified `refs/heads/*` or `refs/tags/*` ref, as a branch
   * or a tag respectively. Any other name is refused (false).
   */
  async createRef(
    owner: string,
    repo: string,
    name: string,
    target: string,
  ): Promise<boolean> {
    const parsed = parseRefName(name);
    if (!parsed) return false;
    return parsed.kind === "branch"
      ? this.createBranch(owner, repo, parsed.shortName, target)
      : this.createTag(owner, repo, parsed.shortName, target);
  },

  /**
   * Delete a fully qualified `refs/heads/*` or `refs/tags/*` ref. A tag name
   * only ever deletes the tag, never a same-named branch; any other name is
   * refused (false).
   */
  async deleteRef(owner: string, repo: string, name: string): Promise<boolean> {
    const parsed = parseRefName(name);
    if (!parsed) return false;
    return parsed.kind === "branch"
      ? this.deleteBranch(owner, repo, parsed.shortName)
      : this.deleteTag(owner, repo, parsed.shortName);
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
   * Merge a pull request's source branch into its target branch.
   * Returns the new target tip on success, or a null sha with an error.
   *
   * Fast-forward only: until a real three-way merge exists, a target that has
   * diverged from the source is refused ("out of date") rather than given a
   * merge commit taking the source tree, which would silently drop work only
   * the target has. Histories with no common ancestor are refused too. The
   * target is never rewritten.
   */
  async merge(
    owner: string,
    repo: string,
    sourceBranch: string,
    targetBranch: string,
    author: { name: string; email: string },
    message: string,
  ): Promise<{ sha: string | null; error?: string }> {
    const client = getArborGitClient();
    if (isArborGitEnabled() && client) {
      // MergeChange in fast-forward-only mode, the same landing as the
      // in-process path below. arbor-git's Merge RPC is a stub that never
      // writes a commit or moves the branch, so it is not used
      const sourceSha = await resolveRefViaBackend(
        client,
        owner,
        repo,
        `refs/heads/${sourceBranch}`,
      );
      if (!sourceSha) {
        return { sha: null, error: "Source branch could not be resolved" };
      }

      const result = await mergeChangeViaBackend(
        client,
        owner,
        repo,
        sourceSha,
        targetBranch,
        author,
        message,
        true,
      );
      if (!result) return { sha: null, error: "Merge failed" };
      if (result.mode !== "fast-forward") {
        return {
          sha: null,
          error: MERGE_REFUSALS[result.mode] ?? "Merge failed",
        };
      }
      return { sha: result.sha };
    }

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

      if (sourceSha === targetSha) {
        return { sha: null, error: MERGE_REFUSALS["already-merged"] };
      }

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
        return { sha: null, error: MERGE_REFUSALS["already-merged"] };
      }

      // Diverged: never replace the target with the source tree
      const [mergeBase] = await git.findMergeBase({
        fs,
        gitdir,
        oids: [sourceSha, targetSha],
      });

      return {
        sha: null,
        error: mergeBase
          ? MERGE_REFUSALS["out-of-date"]
          : MERGE_REFUSALS["unrelated-histories"],
      };
    } catch (error) {
      // Logged server-side only: the raw git error is not for the client
      console.error(`[Git] Failed to merge ${owner}/${repo}:`, error);
      return { sha: null, error: "Merge failed" };
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
    const client = getArborGitClient();
    if (isArborGitEnabled() && client) {
      try {
        return await recordMergeIntentViaBackend(
          client,
          owner,
          repo,
          changeId,
          oid,
        );
      } catch (error) {
        console.error(
          `[Git] Failed to record merge intent for ${owner}/${repo} change ${changeId}:`,
          error,
        );
        return false;
      }
    }

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
    const client = getArborGitClient();
    if (isArborGitEnabled() && client) {
      const result = await mergeChangeViaBackend(
        client,
        owner,
        repo,
        commitOid,
        targetBranch,
        author,
        message,
      );
      if (!result) return { sha: null, mode: null, error: "merge failed" };
      // Unrelated histories are refused with the target untouched
      if (
        result.mode !== "fast-forward" &&
        result.mode !== "merge-commit" &&
        result.mode !== "already-merged"
      ) {
        return {
          sha: null,
          mode: null,
          error: MERGE_REFUSALS[result.mode] ?? "merge failed",
        };
      }
      return { sha: result.sha, mode: result.mode };
    }

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

      // Histories with no common ancestor are never merged: the target's tree
      // would be replaced wholesale
      const [mergeBase] = await git.findMergeBase({
        fs,
        gitdir,
        oids: [commitOid, targetSha],
      });
      if (!mergeBase) {
        return {
          sha: null,
          mode: null,
          error: MERGE_REFUSALS["unrelated-histories"],
        };
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
   * With arbor-git configured a backend error rejects rather than reading as
   * "no merge base", so a diff is never computed against the wrong base.
   */
  async getMergeBase(
    owner: string,
    repo: string,
    refA: string,
    refB: string,
  ): Promise<string | null> {
    const client = getArborGitClient();
    if (isArborGitEnabled() && client) {
      return getMergeBaseViaBackend(client, owner, repo, refA, refB);
    }

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
    const client = getArborGitClient();
    if (isArborGitEnabled() && client) {
      try {
        const entries = await getDiffViaBackend(
          client,
          owner,
          repo,
          baseRef ?? "",
          headRef,
        );
        return entries.map((entry) => ({
          path: entry.path,
          oldPath: entry.oldPath ?? null,
          status: BACKEND_DIFF_STATUS[entry.status] ?? "MODIFIED",
          oldOid: entry.oldOid || null,
          newOid: entry.newOid || null,
          isBinary: entry.isBinary,
          isImage: isImagePath(entry.path),
          additions: entry.additions,
          deletions: entry.deletions,
        }));
      } catch {
        return [];
      }
    }

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
   *
   * With arbor-git configured a side the backend reports missing is absent,
   * but any other backend error rejects, so a failed read never shows up as a
   * spurious add or delete.
   */
  async getFileDiffContent(
    owner: string,
    repo: string,
    baseRef: string | null,
    headRef: string,
    path: string,
  ): Promise<FileDiffContent | null> {
    const client = getArborGitClient();
    if (isArborGitEnabled() && client) {
      const newBytes = await resolveBlobOrAbsentViaBackend(
        client,
        owner,
        repo,
        headRef,
        path,
      );
      const oldBytes =
        baseRef === null
          ? null
          : await resolveBlobOrAbsentViaBackend(
              client,
              owner,
              repo,
              baseRef,
              path,
            );
      return buildFileDiffContent(path, oldBytes, newBytes);
    }

    try {
      const newBytes = await this.getFileRaw(owner, repo, headRef, path);
      const oldBytes =
        baseRef === null
          ? null
          : await this.getFileRaw(owner, repo, baseRef, path);

      return buildFileDiffContent(path, oldBytes, newBytes);
    } catch {
      return null;
    }
  },
};
