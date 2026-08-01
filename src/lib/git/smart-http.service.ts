import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { getRepositoryPath } from "./storage.config";

import type { Readable } from "node:stream";
import type { ScopeBounds } from "./receivePackGuard";

/** Absolute path to this project's git hooks (contains `pre-receive`) */
export const HOOKS_DIR = join(dirname(fileURLToPath(import.meta.url)), "hooks");

/**
 * Build the pattern environment the pre-receive hook reads.
 *
 * Returns `{}` when there is nothing to enforce (`bounds` is null). Otherwise the
 * repository's ref/path patterns travel in `ARBOR_REF_PATTERNS` /
 * `ARBOR_PATH_PATTERNS`; an unconfined dimension is omitted, which the hook reads
 * as null (all). `core.hooksPath` itself is set on the spawn argv via
 * `git -c` (see `executeGitService`), which is the only form local push and the
 * plumbing both honor; env-provided `core.hooksPath` is silently ignored.
 */
export const buildReceivePackHookEnv = (
  bounds: ScopeBounds | null,
): Record<string, string> => {
  if (!bounds) return {};

  const env: Record<string, string> = {};

  if (bounds.refPatterns !== null)
    env.ARBOR_REF_PATTERNS = JSON.stringify(bounds.refPatterns);
  if (bounds.pathPatterns !== null)
    env.ARBOR_PATH_PATTERNS = JSON.stringify(bounds.pathPatterns);

  return env;
};

/**
 * Git Smart HTTP Protocol Service.
 *
 * Implements the Git Smart HTTP protocol for clone, push, and pull operations.
 * This shells out to git commands for proper protocol handling.
 *
 * @see https://git-scm.com/docs/http-protocol
 * @see https://git-scm.com/book/en/v2/Git-on-the-Server-Smart-HTTP
 */

export type GitService = "git-upload-pack" | "git-receive-pack";

/**
 * Validate and parse git service name from query parameter.
 */
export function parseGitService(
  service: string | undefined,
): GitService | null {
  if (service === "git-upload-pack" || service === "git-receive-pack") {
    return service;
  }
  return null;
}

/**
 * Get content type for git service.
 */
export function getServiceContentType(service: GitService): string {
  return `application/x-${service}-advertisement`;
}

/**
 * Get result content type for git service.
 */
export function getServiceResultContentType(service: GitService): string {
  return `application/x-${service}-result`;
}

/**
 * Create a pkt-line formatted string.
 * Pkt-line format: 4 hex digits length + data + LF
 */
function pktLine(data: string): string {
  const length = data.length + 5; // +4 for length prefix, +1 for LF
  return `${length.toString(16).padStart(4, "0")}${data}\n`;
}

/**
 * Flush packet (0000).
 */
const PKT_FLUSH = "0000";

/**
 * Advertise refs for a git service.
 * Used by: GET /info/refs?service=git-upload-pack (or git-receive-pack)
 */
export async function advertiseRefs(
  owner: string,
  repo: string,
  service: GitService,
): Promise<{ data: Buffer; success: boolean }> {
  const repoPath = getRepositoryPath(owner, repo);

  return new Promise((resolve) => {
    const args = ["--stateless-rpc", "--advertise-refs", repoPath];
    const gitProcess = spawn(service, args, {
      env: { ...process.env, GIT_PROTOCOL: "version=2" },
    });

    const chunks: Buffer[] = [];

    gitProcess.stdout.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    gitProcess.stderr.on("data", (chunk: Buffer) => {
      console.error(`[git ${service}] stderr:`, chunk.toString());
    });

    gitProcess.on("close", (code) => {
      if (code !== 0) {
        console.error(`[git ${service}] exited with code ${code}`);
        resolve({ data: Buffer.alloc(0), success: false });
        return;
      }

      // Build the advertise response
      // Format: service announcement + refs from git
      const serviceAnnouncement = pktLine(`# service=${service}`);
      const gitOutput = Buffer.concat(chunks);

      const result = Buffer.concat([
        Buffer.from(serviceAnnouncement),
        Buffer.from(PKT_FLUSH),
        gitOutput,
      ]);

      resolve({ data: result, success: true });
    });

    gitProcess.on("error", (err) => {
      console.error(`[git ${service}] error:`, err);
      resolve({ data: Buffer.alloc(0), success: false });
    });
  });
}

/**
 * Execute git-upload-pack (for clone/fetch/pull).
 */
export async function uploadPack(
  owner: string,
  repo: string,
  input: Buffer | Readable,
): Promise<{ data: Buffer; success: boolean }> {
  return executeGitService(owner, repo, "git-upload-pack", input);
}

/**
 * Execute git-receive-pack (for push).
 *
 * When `bounds` is provided the spawn is pointed at the pre-receive credential
 * boundary (see `buildReceivePackHookEnv`), which enforces the token's ref/path
 * confinement against the actual pushed objects. Null bounds means unconfined
 * and the push runs exactly as before.
 */
export async function receivePack(
  owner: string,
  repo: string,
  input: Buffer | Readable,
  bounds: ScopeBounds | null = null,
): Promise<{ data: Buffer; success: boolean }> {
  return executeGitService(owner, repo, "git-receive-pack", input, bounds);
}

/**
 * Execute a git service command with input data.
 */
async function executeGitService(
  owner: string,
  repo: string,
  service: GitService,
  input: Buffer | Readable,
  bounds: ScopeBounds | null = null,
): Promise<{ data: Buffer; success: boolean }> {
  const repoPath = getRepositoryPath(owner, repo);

  return new Promise((resolve) => {
    // When a push is confined, run receive-pack through `git -c core.hooksPath`
    // so the credential boundary hook fires. `-c` applies config to the very
    // process running the hook, which is the only form honored here (an
    // env-provided core.hooksPath is ignored). Unconfined pushes and every fetch
    // spawn the plumbing binary directly, exactly as before
    const confined = service === "git-receive-pack" && bounds !== null;
    const command = confined ? "git" : service;
    const args = confined
      ? [
          "-c",
          `core.hooksPath=${HOOKS_DIR}`,
          "receive-pack",
          "--stateless-rpc",
          repoPath,
        ]
      : ["--stateless-rpc", repoPath];

    const gitProcess = spawn(command, args, {
      env: {
        ...process.env,
        GIT_PROTOCOL: "version=2",
        ...buildReceivePackHookEnv(bounds),
      },
    });

    const chunks: Buffer[] = [];

    gitProcess.stdout.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    gitProcess.stderr.on("data", (chunk: Buffer) => {
      console.error(`[git ${service}] stderr:`, chunk.toString());
    });

    gitProcess.on("close", (code) => {
      if (code !== 0) {
        console.error(`[git ${service}] exited with code ${code}`);
        resolve({ data: Buffer.alloc(0), success: false });
        return;
      }

      resolve({ data: Buffer.concat(chunks), success: true });
    });

    gitProcess.on("error", (err) => {
      console.error(`[git ${service}] error:`, err);
      resolve({ data: Buffer.alloc(0), success: false });
    });

    // Write input data to stdin
    if (Buffer.isBuffer(input)) {
      gitProcess.stdin.end(input);
    } else {
      input.pipe(gitProcess.stdin);
    }
  });
}
