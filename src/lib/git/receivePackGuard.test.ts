import { describe, expect, test } from "bun:test";

import { evaluateReceivePack, parseUpdateLines } from "./receivePackGuard";

import type { ScopeBounds } from "./receivePackGuard";

/** Bounds unconfined in both dimensions */
const OPEN: ScopeBounds = { refPatterns: null, pathPatterns: null };

describe("parseUpdateLines", () => {
  test("parses old/new/ref triples, one per line", () => {
    const input =
      "aaaa1111 bbbb2222 refs/heads/master\n" +
      "0000000000000000000000000000000000000000 cccc3333 refs/heads/agent/x\n";

    expect(parseUpdateLines(input)).toEqual([
      { oldOid: "aaaa1111", newOid: "bbbb2222", ref: "refs/heads/master" },
      {
        oldOid: "0000000000000000000000000000000000000000",
        newOid: "cccc3333",
        ref: "refs/heads/agent/x",
      },
    ]);
  });

  test("ignores blank trailing lines", () => {
    expect(parseUpdateLines("a b refs/heads/m\n\n")).toEqual([
      { oldOid: "a", newOid: "b", ref: "refs/heads/m" },
    ]);
  });
});

describe("evaluateReceivePack", () => {
  test("unconfined bounds reject nothing", () => {
    const updates = [
      {
        oldOid: "a",
        newOid: "b",
        ref: "refs/heads/master",
        changedPaths: ["infra/x"],
      },
    ];
    expect(evaluateReceivePack(OPEN, updates)).toEqual([]);
  });

  test("rejects a ref outside the ref patterns", () => {
    const bounds: ScopeBounds = {
      refPatterns: ["refs/heads/agent/*"],
      pathPatterns: null,
    };
    const rejections = evaluateReceivePack(bounds, [
      { oldOid: "a", newOid: "b", ref: "refs/heads/master", changedPaths: [] },
    ]);
    expect(rejections).toHaveLength(1);
    expect(rejections[0]?.ref).toBe("refs/heads/master");
  });

  test("allows a ref inside the ref patterns", () => {
    const bounds: ScopeBounds = {
      refPatterns: ["refs/heads/agent/*"],
      pathPatterns: null,
    };
    expect(
      evaluateReceivePack(bounds, [
        {
          oldOid: "a",
          newOid: "b",
          ref: "refs/heads/agent/task-1",
          changedPaths: ["anything/at/all"],
        },
      ]),
    ).toEqual([]);
  });

  test("rejects an update that changes a path outside the path patterns", () => {
    const bounds: ScopeBounds = {
      refPatterns: null,
      pathPatterns: ["src/**"],
    };
    const rejections = evaluateReceivePack(bounds, [
      {
        oldOid: "a",
        newOid: "b",
        ref: "refs/heads/master",
        changedPaths: ["src/ok.ts", "infra/prod.tf"],
      },
    ]);
    expect(rejections).toHaveLength(1);
    expect(rejections[0]?.ref).toBe("refs/heads/master");
    // the reason should name the offending path so the agent can see why
    expect(rejections[0]?.reason).toContain("infra/prod.tf");
  });

  test("allows an update whose every changed path is inside the patterns", () => {
    const bounds: ScopeBounds = {
      refPatterns: null,
      pathPatterns: ["src/**"],
    };
    expect(
      evaluateReceivePack(bounds, [
        {
          oldOid: "a",
          newOid: "b",
          ref: "refs/heads/master",
          changedPaths: ["src/a.ts", "src/lib/b.ts"],
        },
      ]),
    ).toEqual([]);
  });

  test("a deletion (no changed paths) is judged on its ref alone", () => {
    const bounds: ScopeBounds = {
      refPatterns: ["refs/heads/agent/*"],
      pathPatterns: ["src/**"],
    };
    // deleting an allowed ref: fine, no paths to check
    expect(
      evaluateReceivePack(bounds, [
        {
          oldOid: "b",
          newOid: "0000000000000000000000000000000000000000",
          ref: "refs/heads/agent/x",
          changedPaths: [],
        },
      ]),
    ).toEqual([]);
    // deleting a forbidden ref: rejected on the ref
    expect(
      evaluateReceivePack(bounds, [
        {
          oldOid: "b",
          newOid: "0000000000000000000000000000000000000000",
          ref: "refs/heads/master",
          changedPaths: [],
        },
      ]),
    ).toHaveLength(1);
  });

  test("evaluates each update independently and collects every rejection", () => {
    const bounds: ScopeBounds = {
      refPatterns: ["refs/heads/agent/*"],
      pathPatterns: null,
    };
    const rejections = evaluateReceivePack(bounds, [
      {
        oldOid: "a",
        newOid: "b",
        ref: "refs/heads/agent/ok",
        changedPaths: [],
      },
      { oldOid: "a", newOid: "b", ref: "refs/heads/master", changedPaths: [] },
      { oldOid: "a", newOid: "b", ref: "refs/tags/v1", changedPaths: [] },
    ]);
    expect(rejections.map((r) => r.ref)).toEqual([
      "refs/heads/master",
      "refs/tags/v1",
    ]);
  });
});
