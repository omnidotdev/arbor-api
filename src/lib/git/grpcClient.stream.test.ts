import { describe, expect, test } from "bun:test";

import { uploadPackStreamViaBackend } from "./grpcClient";

import type { Client } from "@grpc/grpc-js";

/**
 * An UploadPack stream stub that captures the client's writes and, on `end`,
 * replays the given frames as discrete `data` events followed by `end`. Each
 * frame arrives as its own event so a consumer that concatenates rather than
 * streams would be observable.
 */
const streamStub = (frames: string[]) => {
  const handlers: Record<string, (arg: unknown) => void> = {};
  const writes: unknown[] = [];
  let cancelled = false;
  const client = {
    uploadPack: () => ({
      write: (message: unknown) => {
        writes.push(message);
      },
      end: () => {
        for (const frame of frames)
          handlers.data?.({ data: Buffer.from(frame) });
        handlers.end?.(undefined);
      },
      cancel: () => {
        cancelled = true;
      },
      on: (event: string, handler: (arg: unknown) => void) => {
        handlers[event] = handler;
      },
    }),
  } as unknown as Client;
  return { client, getWrites: () => writes, wasCancelled: () => cancelled };
};

/** A stub that emits one frame then errors, to prove errors surface. */
const errorStub = (message: string) => {
  const handlers: Record<string, (arg: unknown) => void> = {};
  let cancelled = false;
  const client = {
    uploadPack: () => ({
      write: () => {},
      end: () => {
        handlers.data?.({ data: Buffer.from("partial") });
        handlers.error?.(new Error(message));
      },
      cancel: () => {
        cancelled = true;
      },
      on: (event: string, handler: (arg: unknown) => void) => {
        handlers[event] = handler;
      },
    }),
  } as unknown as Client;
  return { client, wasCancelled: () => cancelled };
};

describe("uploadPackStreamViaBackend", () => {
  test("yields each gRPC data frame incrementally, in order", async () => {
    const { client } = streamStub(["a", "b"]);

    const chunks: string[] = [];
    for await (const chunk of uploadPackStreamViaBackend(
      client,
      "o",
      "r",
      Buffer.from("req"),
    )) {
      // each yielded value is a discrete Buffer, not a concatenation
      expect(Buffer.isBuffer(chunk)).toBe(true);
      chunks.push(chunk.toString());
    }

    expect(chunks).toEqual(["a", "b"]);
  });

  test("sends the repository init then the request bytes before ending", async () => {
    const { client, getWrites } = streamStub([]);

    // drive the generator to completion so the writes fire
    for await (const _ of uploadPackStreamViaBackend(
      client,
      "o",
      "r",
      Buffer.from("req"),
    )) {
      // no frames
    }

    const writes = getWrites();
    expect(writes[0]).toEqual({
      init: { repository: { owner: "o", name: "r" } },
    });
    expect(writes[1]).toEqual({ data: Buffer.from("req") });
  });

  test("yields the partial frame before throwing on a stream error", async () => {
    const { client } = errorStub("boom");

    const chunks: string[] = [];
    const run = async () => {
      for await (const chunk of uploadPackStreamViaBackend(
        client,
        "o",
        "r",
        Buffer.from("req"),
      )) {
        chunks.push(chunk.toString());
      }
    };

    // the error drains the queued frame first, then throws, so a truncated pack
    // is delivered as far as it got and never masquerades as a clean completion
    await expect(run()).rejects.toThrow("boom");
    expect(chunks).toEqual(["partial"]);
  });

  test("cancels the backend call when the consumer stops early", async () => {
    const { client, wasCancelled } = streamStub(["a", "b", "c"]);

    for await (const chunk of uploadPackStreamViaBackend(
      client,
      "o",
      "r",
      Buffer.from("req"),
    )) {
      // stop after the first frame, driving the generator's `return`
      expect(chunk.toString()).toBe("a");
      break;
    }

    // the early return must cancel the underlying gRPC call so the backend stops
    // generating the rest of the pack into an abandoned queue
    expect(wasCancelled()).toBe(true);
  });

  test("cancels the backend call after a normal completion", async () => {
    const { client, wasCancelled } = streamStub(["a", "b"]);

    for await (const _ of uploadPackStreamViaBackend(
      client,
      "o",
      "r",
      Buffer.from("req"),
    )) {
      // drain fully
    }

    expect(wasCancelled()).toBe(true);
  });
});
