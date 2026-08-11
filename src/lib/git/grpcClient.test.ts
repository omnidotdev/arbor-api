import { describe, expect, test } from "bun:test";

import {
  checkArborGitHealth,
  createGitServiceClient,
  receivePackViaBackend,
  resolveArborGitEnabled,
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

describe("resolveArborGitEnabled", () => {
  test("is off when the flag is not requested, even if healthy", () => {
    expect(resolveArborGitEnabled(false, true)).toBe(false);
  });

  test("is off when the backend is unhealthy, even if requested", () => {
    expect(resolveArborGitEnabled(true, false)).toBe(false);
  });

  test("is on only when both requested and healthy", () => {
    expect(resolveArborGitEnabled(true, true)).toBe(true);
  });
});

describe("checkArborGitHealth", () => {
  test("reports unhealthy for an unreachable service, so boot degrades gracefully", async () => {
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
