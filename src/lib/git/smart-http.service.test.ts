import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";

import {
  advertiseRefs,
  buildReceivePackHookEnv,
  receivePack,
  uploadPack,
} from "./smart-http.service";

import type { Client } from "@grpc/grpc-js";

describe("buildReceivePackHookEnv", () => {
  test("injects nothing when there are no bounds to enforce", () => {
    expect(buildReceivePackHookEnv(null)).toEqual({});
  });

  test("passes ref patterns as JSON and omits an unconfined path dimension", () => {
    const env = buildReceivePackHookEnv({
      refPatterns: ["refs/heads/agent/*"],
      pathPatterns: null,
    });
    expect(env.ARBOR_REF_PATTERNS).toBe(JSON.stringify(["refs/heads/agent/*"]));
    expect(env.ARBOR_PATH_PATTERNS).toBeUndefined();
  });

  test("passes both dimensions when both are confined", () => {
    const env = buildReceivePackHookEnv({
      refPatterns: ["refs/heads/agent/*"],
      pathPatterns: ["src/**"],
    });
    expect(env.ARBOR_REF_PATTERNS).toBe(JSON.stringify(["refs/heads/agent/*"]));
    expect(env.ARBOR_PATH_PATTERNS).toBe(JSON.stringify(["src/**"]));
  });

  test("passes a path-only confinement with no ref dimension", () => {
    const env = buildReceivePackHookEnv({
      refPatterns: null,
      pathPatterns: ["src/**"],
    });
    expect(env.ARBOR_REF_PATTERNS).toBeUndefined();
    expect(env.ARBOR_PATH_PATTERNS).toBe(JSON.stringify(["src/**"]));
  });
});

/**
 * A GitService stub recording every backend call. `fail` makes each call error
 * (as an unreachable or failing arbor-git would); otherwise advertisement returns
 * `refs` and the pack streams answer `reply`
 */
const stubBackend = ({ fail = false } = {}) => {
  const calls: { method: string; messages: unknown[] }[] = [];

  const stream = (method: string) => () => {
    const call = { method, messages: [] as unknown[] };
    calls.push(call);
    const handlers: Record<string, (arg: unknown) => void> = {};
    return {
      write: (message: unknown) => call.messages.push(message),
      end: () => {
        if (fail) {
          handlers.error?.(new Error("14 UNAVAILABLE"));
          return;
        }
        handlers.data?.({ data: Buffer.from("reply") });
        handlers.end?.(undefined);
      },
      on: (event: string, handler: (arg: unknown) => void) => {
        handlers[event] = handler;
      },
    };
  };

  const client = {
    advertiseRefs: (
      request: unknown,
      callback: (error: Error | null, response?: { data: Buffer }) => void,
    ) => {
      calls.push({ method: "advertiseRefs", messages: [request] });
      if (fail) callback(new Error("14 UNAVAILABLE"));
      else callback(null, { data: Buffer.from("refs") });
    },
    uploadPack: stream("uploadPack"),
    receivePack: stream("receivePack"),
  } as unknown as Client;

  return { client, calls };
};

/** The raw bytes a stub stream received in its `data` frames. */
const sentData = (messages: unknown[]) =>
  Buffer.concat(
    messages
      .map((message) => (message as { data?: Buffer }).data)
      .filter((data): data is Buffer => Boolean(data)),
  ).toString();

describe("smart HTTP with the arbor-git backend", () => {
  test("advertisement is framed from the backend's refs", async () => {
    const { client, calls } = stubBackend();

    const result = await advertiseRefs("o", "r", "git-upload-pack", client);

    expect(result.success).toBe(true);
    expect(result.data.toString()).toBe(
      "001e# service=git-upload-pack\n0000refs",
    );
    expect(calls[0]?.messages[0]).toEqual({
      repository: { owner: "o", name: "r" },
      service: "upload-pack",
    });
  });

  test("a backend advertisement error fails the request", async () => {
    const { client } = stubBackend({ fail: true });

    const result = await advertiseRefs("o", "r", "git-receive-pack", client);

    expect(result).toEqual({ data: Buffer.alloc(0), success: false });
  });

  test("upload-pack delegates a streamed body to the backend", async () => {
    const { client, calls } = stubBackend();

    const result = await uploadPack(
      "o",
      "r",
      Readable.from([Buffer.from("want "), Buffer.from("abc")]),
      client,
    );

    expect(result.success).toBe(true);
    expect(result.data.toString()).toBe("reply");
    expect(calls.map((call) => call.method)).toEqual(["uploadPack"]);
    expect(sentData(calls[0]?.messages ?? [])).toBe("want abc");
  });

  test("receive-pack delegates a streamed body to the backend", async () => {
    const { client, calls } = stubBackend();

    const result = await receivePack(
      "o",
      "r",
      Readable.from([Buffer.from("push")]),
      null,
      "user",
      [],
      client,
    );

    expect(result.success).toBe(true);
    expect(calls.map((call) => call.method)).toEqual(["receivePack"]);
    expect(sentData(calls[0]?.messages ?? [])).toBe("push");
  });

  test("a backend pack error fails the request", async () => {
    const { client } = stubBackend({ fail: true });

    const upload = await uploadPack("o", "r", Buffer.from("x"), client);
    const push = await receivePack(
      "o",
      "r",
      Buffer.from("x"),
      null,
      "user",
      [],
      client,
    );

    expect(upload.success).toBe(false);
    expect(push.success).toBe(false);
  });

  test("never falls back to the local copy, even when one exists", async () => {
    // A real local repository at GIT_REPOS_PATH makes a fallback observable: the
    // in-process path would advertise it successfully. Runs in a fresh process
    // because the storage path is read at import (and stubbed by other suites)
    const reposPath = mkdtempSync(join(tmpdir(), "arbor-smart-http-"));
    try {
      const gitdir = join(reposPath, "o", "r.git");
      execFileSync("git", ["init", "--bare", "--quiet", gitdir]);

      const script = `
        const m = await import(${JSON.stringify(`${import.meta.dir}/smart-http.service.ts`)});
        const failing = {
          advertiseRefs: (_request, callback) => callback(new Error("14 UNAVAILABLE")),
        };
        const viaBackend = await m.advertiseRefs("o", "r", "git-upload-pack", failing);
        const inProcess = await m.advertiseRefs("o", "r", "git-upload-pack", null);
        console.log(JSON.stringify({
          viaBackend: viaBackend.success,
          inProcess: inProcess.success,
        }));
        process.exit(0);
      `;
      const proc = Bun.spawn([process.execPath, "-e", script], {
        cwd: `${import.meta.dir}/../../..`,
        env: { ...process.env, GIT_REPOS_PATH: reposPath },
        stdout: "pipe",
        stderr: "pipe",
      });
      const out = await new Response(proc.stdout).text();
      await proc.exited;

      // the local copy is servable (control), yet a failing backend is not
      // papered over with it
      expect(JSON.parse(out.trim().split("\n").at(-1) ?? "")).toEqual({
        viaBackend: false,
        inProcess: true,
      });
    } finally {
      rmSync(reposPath, { recursive: true, force: true });
    }
  }, 15_000);
});
