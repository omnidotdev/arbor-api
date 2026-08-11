import { describe, expect, test } from "bun:test";

import { evaluateTopicReadiness } from "./topicReadiness";

const member = (pullRequestId: string, state: string, mergeable: boolean) => ({
  pullRequestId,
  state,
  mergeable,
});

describe("evaluateTopicReadiness", () => {
  test("is ready when every open member is mergeable", () => {
    const result = evaluateTopicReadiness([
      member("pr-1", "open", true),
      member("pr-2", "open", true),
    ]);
    expect(result).toEqual({ ready: true, blocking: [] });
  });

  test("is not ready, listing the members that cannot land", () => {
    const result = evaluateTopicReadiness([
      member("pr-1", "open", true),
      member("pr-2", "open", false),
    ]);
    expect(result).toEqual({ ready: false, blocking: ["pr-2"] });
  });

  test("treats an already-merged member as satisfied", () => {
    // a topic partly landed is still on track; the merged member does not block
    const result = evaluateTopicReadiness([
      member("pr-1", "merged", false),
      member("pr-2", "open", true),
    ]);
    expect(result).toEqual({ ready: true, blocking: [] });
  });

  test("blocks on a member that was closed without merging", () => {
    const result = evaluateTopicReadiness([
      member("pr-1", "open", true),
      member("pr-2", "closed", false),
    ]);
    expect(result).toEqual({ ready: false, blocking: ["pr-2"] });
  });

  test("an empty topic is not ready (nothing to submit)", () => {
    expect(evaluateTopicReadiness([])).toEqual({ ready: false, blocking: [] });
  });
});
