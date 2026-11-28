import path from "node:path";

import { credentials, loadPackageDefinition, status } from "@grpc/grpc-js";
import { loadSync } from "@grpc/proto-loader";

import { GIT_SERVICE_URL, useArborGit } from "lib/config/env.config";

import type { Client } from "@grpc/grpc-js";
import type { ScopeBounds } from "./receivePackGuard";

/**
 * gRPC client for the arbor-git backend (the Rust/gitoxide daemon).
 *
 * When `USE_ARBOR_GIT` is on, arbor-git is the repository of record: every git
 * operation goes to it and there is no in-process fallback. arbor-git is
 * cluster-internal (no public auth), so the connection is insecure; the
 * auth/authz gates stay at the arbor-api edge either way.
 */

const PROTO_PATH = path.join(import.meta.dir, "proto", "arbor_git.proto");

/** Load the generated GitService constructor from the vendored proto. */
const loadGitServiceCtor = () => {
  const definition = loadSync(PROTO_PATH, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const pkg = loadPackageDefinition(definition) as unknown as {
    arbor: { git: { v1: { GitService: new (...args: unknown[]) => Client } } };
  };
  return pkg.arbor.git.v1.GitService;
};

/**
 * Reconnect backoff for the backend channel. Capped low so arbor-api recovers
 * within seconds once arbor-git comes back (e.g. both pods rescheduled together)
 * instead of the multi-minute grpc-js default
 */
const CHANNEL_OPTIONS = {
  "grpc.initial_reconnect_backoff_ms": 500,
  "grpc.max_reconnect_backoff_ms": 5000,
};

/** Create a GitService client for a `host:port` address (insecure, cluster-internal). */
export const createGitServiceClient = (url: string): Client => {
  const GitService = loadGitServiceCtor();
  return new GitService(url, credentials.createInsecure(), CHANNEL_OPTIONS);
};

/**
 * Whether the backend answers within the deadline. Resolves false rather than
 * throwing or hanging when it is unreachable.
 */
export const checkArborGitHealth = (
  client: Client,
  deadlineMs = 2000,
): Promise<boolean> =>
  new Promise((resolve) => {
    const deadline = new Date(Date.now() + deadlineMs);
    client.waitForReady(deadline, (error) => resolve(!error));
  });

let backendClient: Client | null = null;

/**
 * Whether git operations are served by arbor-git. Decided by configuration alone
 * (`USE_ARBOR_GIT` plus `GIT_SERVICE_URL`), never by reachability: the in-process
 * path under `GIT_REPOS_PATH` is not the repository of record once the backend
 * is on, so an unreachable backend must fail requests rather than silently serve
 * (or write to) that local copy.
 */
export const isArborGitEnabled = (): boolean => useArborGit;

/**
 * The GitService client, or null when the backend is not configured. Created on
 * first use, so a request arriving before `initArborGitBackend` finishes still
 * routes to the backend; grpc-js connects (and reconnects) the channel lazily.
 */
export const getArborGitClient = (): Client | null => {
  if (!useArborGit) return null;
  backendClient ??= createGitServiceClient(GIT_SERVICE_URL as string);
  return backendClient;
};

/**
 * Connect to the backend at boot and report its reachability. Never throws and
 * never changes routing: when the backend is configured but not reachable yet,
 * git requests fail until it is, instead of degrading to the in-process path.
 */
export const initArborGitBackend = async (): Promise<void> => {
  const client = getArborGitClient();

  if (!client) {
    console.warn("USE_ARBOR_GIT not enabled, using in-process git");
    return;
  }

  if (await checkArborGitHealth(client)) {
    console.info("arbor-git backend reachable, git delegated to arbor-git");
  } else {
    console.warn(
      `GIT_SERVICE_URL (${GIT_SERVICE_URL}) not reachable yet, git requests fail until it is (no in-process fallback)`,
    );
  }
};

/** Helper for a unary GitService call that resolves a boolean from one response field. */
const unaryBool = (
  client: Client,
  method: string,
  request: unknown,
  field: string,
): Promise<boolean> =>
  new Promise((resolve) => {
    (
      client as unknown as Record<
        string,
        (
          request: unknown,
          callback: (
            error: Error | null,
            response?: Record<string, unknown>,
          ) => void,
        ) => void
      >
    )[method]?.(request, (error, response) => {
      resolve(!error && Boolean(response?.[field]));
    });
  });

/** Create a bare repository in the backend (InitRepository). */
export const initRepositoryViaBackend = (
  client: Client,
  owner: string,
  repo: string,
  defaultBranch: string,
): Promise<boolean> =>
  unaryBool(
    client,
    "initRepository",
    { repository: { owner, name: repo }, defaultBranch },
    "created",
  );

/** Delete a repository from the backend (DeleteRepository). */
export const deleteRepositoryViaBackend = (
  client: Client,
  owner: string,
  repo: string,
): Promise<boolean> =>
  unaryBool(
    client,
    "deleteRepository",
    { repository: { owner, name: repo } },
    "deleted",
  );

/** Whether a repository exists in the backend (RepositoryExists). */
export const repositoryExistsViaBackend = (
  client: Client,
  owner: string,
  repo: string,
): Promise<boolean> =>
  unaryBool(
    client,
    "repositoryExists",
    { repository: { owner, name: repo } },
    "exists",
  );

/** Rename a repository within its owner in the backend (RenameRepository). */
export const renameRepositoryViaBackend = (
  client: Client,
  owner: string,
  oldName: string,
  newName: string,
): Promise<boolean> =>
  unaryBool(
    client,
    "renameRepository",
    { repository: { owner, name: oldName }, newName },
    "renamed",
  );

/**
 * Move a repository to another owner path through the backend
 * (RenameRepository with a new owner). Refused (false) when the source is
 * missing or the target exists
 */
export const relocateRepositoryViaBackend = (
  client: Client,
  owner: string,
  name: string,
  newOwner: string,
  newName: string,
): Promise<boolean> =>
  unaryBool(
    client,
    "renameRepository",
    { repository: { owner, name }, newName, newOwner },
    "renamed",
  );

/**
 * Land a change onto a target branch through the backend (MergeChange).
 * Returns the resulting tip and the mode, or null on a backend error so the
 * caller can surface a generic failure. A refusal that left the target
 * untouched comes back with an empty sha and mode "out-of-date" (diverged,
 * with `fastForwardOnly`) or "unrelated-histories" (no common ancestor).
 * Without `fastForwardOnly` a diverged target gets a merge commit taking the
 * change's tree, the stack-landing semantics.
 */
export const mergeChangeViaBackend = (
  client: Client,
  owner: string,
  repo: string,
  commitOid: string,
  targetBranch: string,
  author: { name: string; email: string },
  message: string,
  fastForwardOnly = false,
): Promise<{ sha: string; mode: string } | null> =>
  new Promise((resolve) => {
    (
      client as unknown as {
        mergeChange: (
          request: unknown,
          callback: (
            error: Error | null,
            response?: { sha?: string; mode?: string },
          ) => void,
        ) => void;
      }
    ).mergeChange(
      {
        repository: { owner, name: repo },
        commitOid,
        targetBranch,
        authorName: author.name,
        authorEmail: author.email,
        message,
        fastForwardOnly,
      },
      (error, response) => {
        resolve(
          error || !response?.mode
            ? null
            : { sha: response.sha ?? "", mode: response.mode },
        );
      },
    );
  });

/** Point HEAD at a branch in the backend (SetDefaultBranch). */
export const setDefaultBranchViaBackend = (
  client: Client,
  owner: string,
  repo: string,
  branch: string,
): Promise<boolean> =>
  unaryBool(
    client,
    "setDefaultBranch",
    { repository: { owner, name: repo }, branch },
    "success",
  );

/** Repository info as arbor-git returns it (GetRepositoryInfo). */
export interface BackendRepositoryInfo {
  defaultBranch: string;
  branchCount: number;
  tagCount: number;
  commitCount: number;
  headOid: string;
}

/** Read repository info (default branch, counts) through the backend, or null. */
export const getRepositoryInfoViaBackend = (
  client: Client,
  owner: string,
  repo: string,
): Promise<BackendRepositoryInfo | null> =>
  new Promise((resolve) => {
    (
      client as unknown as {
        getRepositoryInfo: (
          request: unknown,
          callback: (
            error: Error | null,
            response?: BackendRepositoryInfo,
          ) => void,
        ) => void;
      }
    ).getRepositoryInfo(
      { repository: { owner, name: repo } },
      (error, response) => {
        resolve(error || !response ? null : response);
      },
    );
  });

/** A reference as arbor-git returns it (camelCased by the proto loader). */
export interface BackendRef {
  name: string;
  shortName: string;
  oid: string;
  /** The RefType enum as a string, e.g. "REF_TYPE_BRANCH". */
  type: string;
  isDefault: boolean;
}

/** List a repository's refs through the backend (ListRefs unary call). */
export const listRefsViaBackend = (
  client: Client,
  owner: string,
  repo: string,
): Promise<BackendRef[]> =>
  new Promise((resolve, reject) => {
    (
      client as unknown as {
        listRefs: (
          request: unknown,
          callback: (
            error: Error | null,
            response?: { refs?: BackendRef[] },
          ) => void,
        ) => void;
      }
    ).listRefs({ repository: { owner, name: repo } }, (error, response) => {
      if (error) reject(error);
      else resolve(response?.refs ?? []);
    });
  });

/** Resolve a ref (branch/tag/SHA/HEAD) to a commit oid through the backend, or null. */
export const resolveRefViaBackend = (
  client: Client,
  owner: string,
  repo: string,
  ref: string,
): Promise<string | null> =>
  new Promise((resolve) => {
    (
      client as unknown as {
        resolveRef: (
          request: unknown,
          callback: (error: Error | null, response?: { oid?: string }) => void,
        ) => void;
      }
    ).resolveRef(
      { repository: { owner, name: repo }, ref },
      (error, response) => {
        resolve(error || !response?.oid ? null : response.oid);
      },
    );
  });

/** A commit signature as arbor-git returns it (timestamp is a string with longs:String). */
export interface BackendSignature {
  name: string;
  email: string;
  timestamp: string | number;
}

/** A commit as arbor-git returns it. */
export interface BackendCommit {
  oid: string;
  message: string;
  author?: BackendSignature;
  committer?: BackendSignature;
  parentOids?: string[];
}

/** Read a single commit by oid through the backend (GetCommit), or null. */
export const getCommitViaBackend = (
  client: Client,
  owner: string,
  repo: string,
  oid: string,
): Promise<BackendCommit | null> =>
  new Promise((resolve) => {
    (
      client as unknown as {
        getCommit: (
          request: unknown,
          callback: (error: Error | null, response?: BackendCommit) => void,
        ) => void;
      }
    ).getCommit(
      { repository: { owner, name: repo }, oid },
      (error, response) => {
        resolve(error || !response?.oid ? null : response);
      },
    );
  });

/**
 * Read commit history through the backend (GetCommitLog server stream). Skips
 * `skip` commits from `ref` then collects up to `limit`.
 */
export const getCommitLogViaBackend = (
  client: Client,
  owner: string,
  repo: string,
  ref: string,
  limit: number,
  skip: number,
): Promise<BackendCommit[]> =>
  new Promise((resolve, reject) => {
    const call = (
      client as unknown as {
        getCommitLog: (request: unknown) => {
          on: (event: string, handler: (arg: unknown) => void) => void;
        };
      }
    ).getCommitLog({
      repository: { owner, name: repo },
      startRef: ref,
      limit,
      skip,
    });

    const commits: BackendCommit[] = [];
    call.on("data", (commit: unknown) => commits.push(commit as BackendCommit));
    call.on("end", () => resolve(commits));
    call.on("error", (error: unknown) => reject(error));
  });

/** A changed file as arbor-git returns it from GetDiff (status is an enum string). */
export interface BackendDiffEntry {
  path: string;
  status: string;
  oldPath?: string;
  oldOid: string;
  newOid: string;
  additions: number;
  deletions: number;
  isBinary: boolean;
}

/** Stream the changed files between two refs through the backend (GetDiff). */
export const getDiffViaBackend = (
  client: Client,
  owner: string,
  repo: string,
  baseRef: string,
  headRef: string,
): Promise<BackendDiffEntry[]> =>
  new Promise((resolve, reject) => {
    const call = (
      client as unknown as {
        getDiff: (request: unknown) => {
          on: (event: string, handler: (arg: unknown) => void) => void;
        };
      }
    ).getDiff({
      repository: { owner, name: repo },
      baseRef,
      headRef,
    });

    const entries: BackendDiffEntry[] = [];
    call.on("data", (entry: unknown) =>
      entries.push(entry as BackendDiffEntry),
    );
    call.on("end", () => resolve(entries));
    call.on("error", (error: unknown) => reject(error));
  });

/** A tree entry as arbor-git returns it (mode/type are enum strings). */
export interface BackendTreeEntry {
  name: string;
  oid: string;
  /** TreeEntryMode enum, e.g. "TREE_ENTRY_MODE_FILE". */
  mode: string;
  /** TreeEntryType enum, e.g. "TREE_ENTRY_TYPE_BLOB". */
  type: string;
}

/** Read a tree at a ref and path through the backend (GetTree unary call). */
export const getTreeViaBackend = (
  client: Client,
  owner: string,
  repo: string,
  ref: string,
  path: string,
): Promise<BackendTreeEntry[]> =>
  new Promise((resolve, reject) => {
    (
      client as unknown as {
        getTree: (
          request: unknown,
          callback: (
            error: Error | null,
            response?: { entries?: BackendTreeEntry[] },
          ) => void,
        ) => void;
      }
    ).getTree(
      { repository: { owner, name: repo }, ref, path, recursive: false },
      (error, response) => {
        if (error) reject(error);
        else resolve(response?.entries ?? []);
      },
    );
  });

/** Read a blob's bytes by oid through the backend (GetBlob server stream). */
/**
 * Fetch the Smart-HTTP ref advertisement from the backend (AdvertiseRefs). Returns
 * the raw `--advertise-refs` bytes (the caller prepends the `# service=` line), or
 * null on error so the caller can fail the request. `service`
 * is the plumbing name (`upload-pack` / `receive-pack`), not the `git-` form.
 */
export const advertiseRefsViaBackend = (
  client: Client,
  owner: string,
  repo: string,
  service: "upload-pack" | "receive-pack",
): Promise<Buffer | null> =>
  new Promise((resolve) => {
    (
      client as unknown as {
        advertiseRefs: (
          request: unknown,
          callback: (
            error: Error | null,
            response?: { data?: Buffer | Uint8Array },
          ) => void,
        ) => void;
      }
    ).advertiseRefs(
      { repository: { owner, name: repo }, service },
      (error, response) => {
        if (error) console.error("[arbor-git] advertise_refs failed:", error);
        resolve(error || !response?.data ? null : Buffer.from(response.data));
      },
    );
  });

export const getBlobViaBackend = (
  client: Client,
  owner: string,
  repo: string,
  oid: string,
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const call = (
      client as unknown as {
        getBlob: (request: unknown) => {
          on: (event: string, handler: (arg: unknown) => void) => void;
        };
      }
    ).getBlob({ repository: { owner, name: repo }, oid });

    const chunks: Buffer[] = [];
    call.on("data", (chunk: unknown) => {
      const data = (chunk as { data?: Buffer | Uint8Array }).data;
      if (data && data.length > 0) chunks.push(Buffer.from(data));
    });
    call.on("end", () => resolve(Buffer.concat(chunks)));
    call.on("error", (error: unknown) => reject(error));
  });

/**
 * Serve git-receive-pack (push) through the backend, mirroring uploadPackViaBackend
 * over the ReceivePack stream. `userId` is carried in the init for the backend's
 * own record. When `bounds` is provided the token's ref/path confinement travels
 * in the init and the backend enforces it against the actual pushed objects via
 * its pre-receive boundary hook, so a confined push is safe to route here; null
 * bounds is an unconfined push. A `null` pattern list in a dimension leaves it
 * unconfined, matching the in-process `ScopeBounds` shape. `protectedRefPatterns`
 * carries the repository's protected-branch globs, which the backend enforces for
 * every pusher (no delete / no force-push), independent of token confinement.
 */
export const receivePackViaBackend = (
  client: Client,
  owner: string,
  repo: string,
  userId: string,
  input: Buffer,
  bounds: ScopeBounds | null = null,
  protectedRefPatterns: string[] = [],
): Promise<{ data: Buffer; success: boolean }> =>
  new Promise((resolve) => {
    const call = (
      client as unknown as {
        receivePack: () => {
          write: (message: unknown) => void;
          end: () => void;
          on: (event: string, handler: (arg: unknown) => void) => void;
        };
      }
    ).receivePack();

    const chunks: Buffer[] = [];
    call.on("data", (response: unknown) => {
      const data = (response as { data?: Buffer | Uint8Array }).data;
      if (data && data.length > 0) chunks.push(Buffer.from(data));
    });
    call.on("end", () =>
      resolve({ data: Buffer.concat(chunks), success: true }),
    );
    call.on("error", (error: unknown) => {
      console.error("[arbor-git] receive_pack stream failed:", error);
      resolve({ data: Buffer.concat(chunks), success: false });
    });

    call.write({
      init: {
        repository: { owner, name: repo },
        userId,
        refConfined: bounds?.refPatterns != null,
        refPatterns: bounds?.refPatterns ?? [],
        pathConfined: bounds?.pathPatterns != null,
        pathPatterns: bounds?.pathPatterns ?? [],
        protectedRefPatterns,
      },
    });
    call.write({ data: input });
    call.end();
  });

/**
 * Serve git-upload-pack (clone/fetch) through the backend. Opens the bidirectional
 * UploadPack stream, sends the repository then the client's request bytes, and
 * concatenates the streamed response into a single buffer, matching the shape the
 * in-process `uploadPack` returns. On a stream error it resolves `success: false`
 * so the caller can fail the request rather than throw.
 */
export const uploadPackViaBackend = (
  client: Client,
  owner: string,
  repo: string,
  input: Buffer,
): Promise<{ data: Buffer; success: boolean }> =>
  new Promise((resolve) => {
    const call = (
      client as unknown as {
        uploadPack: () => {
          write: (message: unknown) => void;
          end: () => void;
          on: (event: string, handler: (arg: unknown) => void) => void;
        };
      }
    ).uploadPack();

    const chunks: Buffer[] = [];
    call.on("data", (response: unknown) => {
      const data = (response as { data?: Buffer | Uint8Array }).data;
      if (data && data.length > 0) chunks.push(Buffer.from(data));
    });
    call.on("end", () =>
      resolve({ data: Buffer.concat(chunks), success: true }),
    );
    call.on("error", (error: unknown) => {
      console.error("[arbor-git] upload_pack stream failed:", error);
      resolve({ data: Buffer.concat(chunks), success: false });
    });

    call.write({ init: { repository: { owner, name: repo } } });
    call.write({ data: input });
    call.end();
  });

/** Whether a backend call failed because the thing asked for does not exist */
export const isBackendNotFound = (error: unknown): boolean =>
  (error as { code?: number } | null)?.code === status.NOT_FOUND;

/** Invoke a unary GitService method, rejecting on any backend error */
const unary = <T>(
  client: Client,
  method: string,
  request: unknown,
): Promise<T> =>
  new Promise((resolve, reject) => {
    const call = (
      client as unknown as Record<
        string,
        (
          request: unknown,
          callback: (error: Error | null, response?: T) => void,
        ) => void
      >
    )[method];
    if (!call) {
      reject(new Error(`arbor-git client has no ${method} method`));
      return;
    }
    call.call(client, request, (error, response) => {
      if (error || response === undefined) reject(error ?? new Error(method));
      else resolve(response);
    });
  });

/** Create a branch at a start point through the backend (CreateBranch); rejects on error */
export const createBranchViaBackend = async (
  client: Client,
  owner: string,
  repo: string,
  name: string,
  startPoint: string,
): Promise<void> => {
  await unary(client, "createBranch", {
    repository: { owner, name: repo },
    name,
    startPoint,
  });
};

/**
 * Delete a branch through the backend (DeleteBranch, never forced, so the
 * backend also refuses the default branch); rejects on error
 */
export const deleteBranchViaBackend = async (
  client: Client,
  owner: string,
  repo: string,
  name: string,
): Promise<boolean> => {
  const response = await unary<{ deleted?: boolean }>(client, "deleteBranch", {
    repository: { owner, name: repo },
    name,
    force: false,
  });
  return Boolean(response.deleted);
};

/**
 * Merge base of two refs through the backend (GetMergeBase). Null when either
 * ref names no commit or they share no history; rejects on a backend error
 */
export const getMergeBaseViaBackend = async (
  client: Client,
  owner: string,
  repo: string,
  refA: string,
  refB: string,
): Promise<string | null> => {
  const response = await unary<{ oid?: string; found?: boolean }>(
    client,
    "getMergeBase",
    { repository: { owner, name: repo }, refA, refB },
  );
  return response.found && response.oid ? response.oid : null;
};

/**
 * Record a stacked-change merge intent through the backend (RecordMergeIntent,
 * create-only). False when an intent already points at another commit;
 * rejects on a backend error
 */
export const recordMergeIntentViaBackend = async (
  client: Client,
  owner: string,
  repo: string,
  changeId: string,
  oid: string,
): Promise<boolean> => {
  const response = await unary<{ recorded?: boolean }>(
    client,
    "recordMergeIntent",
    { repository: { owner, name: repo }, changeId, oid },
  );
  return Boolean(response.recorded);
};

/**
 * On-disk size of a repository on the backend's volume (GetRepositorySize). A
 * repository the backend does not have occupies 0 bytes; any other backend
 * error rejects, so a storage limit is never checked against a guess
 */
export const getRepositorySizeViaBackend = async (
  client: Client,
  owner: string,
  repo: string,
): Promise<number> => {
  try {
    const response = await unary<{ sizeBytes?: string | number }>(
      client,
      "getRepositorySize",
      { repository: { owner, name: repo } },
    );
    return Number(response.sizeBytes ?? 0);
  } catch (error) {
    if (isBackendNotFound(error)) return 0;
    throw error;
  }
};

/** Clone a remote into a new repository on the backend (CloneRepository); rejects on error */
export const cloneRepositoryViaBackend = async (
  client: Client,
  owner: string,
  repo: string,
  url: string,
  options: { depth?: number; singleBranch?: boolean; ref?: string },
): Promise<void> => {
  await unary(client, "cloneRepository", {
    repository: { owner, name: repo },
    url,
    depth: options.depth ?? 0,
    singleBranch: options.singleBranch ?? false,
    ref: options.ref ?? "",
  });
};

/** Create a lightweight tag at a target through the backend (CreateTag); rejects on error */
export const createTagViaBackend = async (
  client: Client,
  owner: string,
  repo: string,
  name: string,
  target: string,
): Promise<void> => {
  await unary(client, "createTag", {
    repository: { owner, name: repo },
    name,
    target,
  });
};

/** Delete a tag through the backend (DeleteTag), never a branch; rejects on error */
export const deleteTagViaBackend = async (
  client: Client,
  owner: string,
  repo: string,
  name: string,
): Promise<boolean> => {
  const response = await unary<{ deleted?: boolean }>(client, "deleteTag", {
    repository: { owner, name: repo },
    name,
  });
  return Boolean(response.deleted);
};
