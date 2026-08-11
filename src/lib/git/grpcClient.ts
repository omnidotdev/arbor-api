import path from "node:path";

import { credentials, loadPackageDefinition } from "@grpc/grpc-js";
import { loadSync } from "@grpc/proto-loader";

import { GIT_SERVICE_URL, useArborGit } from "lib/config/env.config";

import type { Client } from "@grpc/grpc-js";

/**
 * gRPC client for the arbor-git backend (the Rust/gitoxide daemon).
 *
 * This is the plumbing only: it establishes the client and a boot-time health
 * check behind the `USE_ARBOR_GIT` flag, and never changes behavior on its own.
 * arbor-git is cluster-internal (no public auth), so the connection is insecure;
 * the auth/authz gates stay at the arbor-api edge either way.
 */

const PROTO_PATH = path.join(import.meta.dir, "proto", "arbor_git.proto");

/**
 * The backend is used only when it is both requested (flag + URL) and reachable.
 * Pure so the gate is testable; the health result comes from `checkArborGitHealth`.
 */
export const resolveArborGitEnabled = (
  flagRequested: boolean,
  healthy: boolean,
): boolean => flagRequested && healthy;

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

/** Create a GitService client for a `host:port` address (insecure, cluster-internal). */
export const createGitServiceClient = (url: string): Client => {
  const GitService = loadGitServiceCtor();
  return new GitService(url, credentials.createInsecure());
};

/**
 * Whether the backend answers within the deadline. Resolves false rather than
 * throwing or hanging when it is unreachable, so a missing backend degrades to
 * the in-process path.
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
let backendEnabled = false;

/**
 * Initialize the backend at boot. Off unless `USE_ARBOR_GIT=true` with a
 * reachable `GIT_SERVICE_URL`; on failure it warns and leaves the in-process git
 * path in place (never throws, per the graceful-degradation rule).
 */
export const initArborGitBackend = async (): Promise<void> => {
  if (!useArborGit) {
    console.warn("USE_ARBOR_GIT not enabled, using in-process git");
    return;
  }

  const client = createGitServiceClient(GIT_SERVICE_URL as string);
  const healthy = await checkArborGitHealth(client);
  backendEnabled = resolveArborGitEnabled(useArborGit, healthy);

  if (backendEnabled) {
    backendClient = client;
    console.info("arbor-git backend reachable, git delegation available");
  } else {
    console.warn(
      `GIT_SERVICE_URL (${GIT_SERVICE_URL}) unreachable, falling back to in-process git`,
    );
    client.close();
  }
};

/** Whether git operations may be delegated to arbor-git (post health check). */
export const isArborGitEnabled = (): boolean => backendEnabled;

/** The connected GitService client, or null when the backend is not in use. */
export const getArborGitClient = (): Client | null => backendClient;

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
 * own record. Only unconfined pushes are routed here; a token confined to
 * specific refs/paths keeps the in-process path so its pre-receive boundary hook
 * still runs (arbor-git does not carry that hook).
 */
export const receivePackViaBackend = (
  client: Client,
  owner: string,
  repo: string,
  userId: string,
  input: Buffer,
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

    call.write({ init: { repository: { owner, name: repo }, userId } });
    call.write({ data: input });
    call.end();
  });

/**
 * Serve git-upload-pack (clone/fetch) through the backend. Opens the bidirectional
 * UploadPack stream, sends the repository then the client's request bytes, and
 * concatenates the streamed response into a single buffer, matching the shape the
 * in-process `uploadPack` returns. On a stream error it resolves `success: false`
 * so the caller can fall back rather than throw.
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
