import { describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";

import verifyHmacSignature from "./verifyHmacSignature";

const SECRET = "shhh";
const sign = (body: string) =>
  createHmac("sha256", SECRET).update(body).digest("hex");

describe("verifyHmacSignature", () => {
  test("accepts a correct signature", () => {
    const body = '{"hello":"world"}';
    expect(verifyHmacSignature(body, sign(body), SECRET)).toBe(true);
  });

  test("rejects a signature for a different body", () => {
    expect(verifyHmacSignature('{"a":1}', sign('{"b":2}'), SECRET)).toBe(false);
  });

  test("rejects a signature under a different secret", () => {
    const body = "payload";
    expect(verifyHmacSignature(body, sign(body), "other")).toBe(false);
  });

  test("rejects a malformed (non-hex) signature without throwing", () => {
    expect(verifyHmacSignature("payload", "not-hex!!", SECRET)).toBe(false);
  });
});
