import { describe, expect, test } from "bun:test";

import { extractIssueReferences } from "./issueReferences";

describe("extractIssueReferences", () => {
  test("extracts keyword-anchored product IDs, normalized + deduped", () => {
    const text = "Fixes BF-45 and resolves runa-99. Also closes RUNA-99.";
    expect(extractIssueReferences(text).sort()).toEqual(["BF-45", "RUNA-99"]);
  });

  test("recognizes the common linking keywords", () => {
    for (const kw of [
      "close",
      "closes",
      "fixed",
      "resolve",
      "addresses",
      "ref",
      "see",
    ]) {
      expect(extractIssueReferences(`${kw} RUNA-1`)).toEqual(["RUNA-1"]);
    }
  });

  test("does not extract IDs without a linking keyword (avoids SHA-256 etc.)", () => {
    expect(
      extractIssueReferences("bumped to SHA-256 and UTF-8 support"),
    ).toEqual([]);
    expect(extractIssueReferences("no references here")).toEqual([]);
  });
});
