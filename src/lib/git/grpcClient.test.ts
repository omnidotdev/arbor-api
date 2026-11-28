import { describe, expect, test } from "bun:test";

import {
  checkArborGitHealth,
  createGitServiceClient,
  getArborGitClient,
  isArborGitEnabled,
  receivePackViaBackend,
} from "./grpcClient";

import type { Client } from "@grpc/grpc-js";
import type { ScopeBounds } from "./receivePackGuard";

/** A ReceivePack stream stub that captures the init message and ends immediately. */
const captureInit = () => {
  let init: Record<string, unknown> | undefined;
  const handlers: Record<string, (arg: unknown) => void> = {};
  const client = {
    receivePack: () => ({
      write: (message: unknown) => {
        const asInit = (message as { init?: Record<string, unknown> }).init;
        if (asInit) init = asInit;
      },
      end: () => handlers.end?.(undefined),
      on: (event: string, handler: (arg: unknown) => void) => {
        handlers[event] = handler;
      },
    }),
  } as unknown as Client;
  return { client, getInit: () => init };
};

/**
 * Boot grpcClient in a fresh process with the given backend env (the gate reads
 * env at import, so it cannot be flipped inside this one), run `initArborGitBackend`,
 * and report the resulting routing decision
 */
const bootGateWith = async (env: Record<string, string>) => {
  const script = `
    const m = await import(${JSON.stringify(`${import.meta.dir}/grpcClient.ts`)});
    await m.initArborGitBackend();
    console.log(JSON.stringify({
      enabled: m.isArborGitEnabled(),
      hasClient: m.getArborGitClient() !== null,
    }));
    process.exit(0);
  `;
  const proc = Bun.spawn([process.execPath, "-e", script], {
    cwd: `${import.meta.dir}/../../..`,
    env: { ...process.env, USE_ARBOR_GIT: "", GIT_SERVICE_URL: "", ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  const last = out.trim().split("\n").at(-1) ?? "";
  return JSON.parse(last) as { enabled: boolean; hasClient: boolean };
};

describe("arbor-git backend gate", () => {
  test("is off without the flag, so the in-process path is used", () => {
    // the suite runs without USE_ARBOR_GIT
    expect(isArborGitEnabled()).toBe(false);
    expect(getArborGitClient()).toBeNull();
  });

  test("stays on when the backend is unreachable at boot (no latched in-process fallback)", async () => {
    // regression: a boot-time health check that lost the race against arbor-git
    // starting used to latch arbor-api onto the stale local copies for the
    // whole process lifetime
    const gate = await bootGateWith({
      USE_ARBOR_GIT: "true",
      GIT_SERVICE_URL: "127.0.0.1:1",
    });
    expect(gate).toEqual({ enabled: true, hasClient: true });
  }, 15_000);

  test("needs a service URL as well as the flag", async () => {
    const gate = await bootGateWith({ USE_ARBOR_GIT: "true" });
    expect(gate).toEqual({ enabled: false, hasClient: false });
  }, 15_000);
});

describe("checkArborGitHealth", () => {
  test("reports unhealthy for an unreachable service rather than hanging or throwing", async () => {
    // nothing is listening on this port; the health check must resolve false
    // rather than hang or throw
    const client = createGitServiceClient("127.0.0.1:1");
    const healthy = await checkArborGitHealth(client, 500);
    expect(healthy).toBe(false);
    client.close();
  });
});

describe("receivePackViaBackend confinement mapping", () => {
  // The token's bounds must reach arbor-git in the ReceivePack init, since the
  // backend enforces them there. The enforcement itself is proven end to end in
  // arbor-git's confined_push integration test; here we assert the wire mapping.

  test("a ref-confined token sends its patterns and leaves paths unconfined", async () => {
    const { client, getInit } = captureInit();
    const bounds: ScopeBounds = {
      refPatterns: ["refs/heads/agent/*"],
      pathPatterns: null,
    };

    await receivePackViaBackend(
      client,
      "o",
      "r",
      "u",
      Buffer.from("x"),
      bounds,
    );

    const init = getInit();
    expect(init?.refConfined).toBe(true);
    expect(init?.refPatterns).toEqual(["refs/heads/agent/*"]);
    expect(init?.pathConfined).toBe(false);
    expect(init?.pathPatterns).toEqual([]);
  });

  test("an unconfined push marks both dimensions unconfined", async () => {
    const { client, getInit } = captureInit();

    await receivePackViaBackend(client, "o", "r", "u", Buffer.from("x"), null);

    const init = getInit();
    expect(init?.refConfined).toBe(false);
    expect(init?.pathConfined).toBe(false);
    expect(init?.refPatterns).toEqual([]);
    expect(init?.pathPatterns).toEqual([]);
  });

  test("carries the repository's protected-branch patterns in the init", async () => {
    const { client, getInit } = captureInit();

    await receivePackViaBackend(client, "o", "r", "u", Buffer.from("x"), null, [
      "main",
      "release/*",
    ]);

    const init = getInit();
    // protection travels independently of token confinement
    expect(init?.refConfined).toBe(false);
    expect(init?.protectedRefPatterns).toEqual(["main", "release/*"]);
  });

  test("an empty pattern list still confines (fails closed)", async () => {
    const { client, getInit } = captureInit();
    const bounds: ScopeBounds = { refPatterns: [], pathPatterns: ["src/**"] };

    await receivePackViaBackend(
      client,
      "o",
      "r",
      "u",
      Buffer.from("x"),
      bounds,
    );

    const init = getInit();
    // an empty ref list is still confined: the backend matches nothing, so a
    // token narrowed to zero refs cannot push anywhere
    expect(init?.refConfined).toBe(true);
    expect(init?.refPatterns).toEqual([]);
    expect(init?.pathConfined).toBe(true);
    expect(init?.pathPatterns).toEqual(["src/**"]);
  });
});
