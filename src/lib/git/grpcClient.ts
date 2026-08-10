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
