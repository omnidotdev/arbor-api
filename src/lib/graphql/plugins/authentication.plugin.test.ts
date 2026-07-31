import { describe, expect, test } from "bun:test";

import { OBSERVER_SETTING, buildPgSettings } from "./authentication.plugin";

describe("buildPgSettings", () => {
  test("carries the observer id into the Postgres session", () => {
    const settings = buildPgSettings("8e7ffe48-fe56-48e6-b54e-4bb0aac1d2ea");

    expect(settings).toEqual({
      [OBSERVER_SETTING]: "8e7ffe48-fe56-48e6-b54e-4bb0aac1d2ea",
    });
  });

  test("sets the key explicitly for an anonymous caller", () => {
    // an omitted key reads back as null rather than empty, and a policy written
    // against the empty string would then not match. Always setting it keeps the
    // anonymous case explicit
    expect(buildPgSettings(undefined)).toEqual({ [OBSERVER_SETTING]: "" });
  });

  test("never omits the key, so a stale session value cannot be inherited", () => {
    for (const observerId of [undefined, "", "user-1"]) {
      expect(Object.keys(buildPgSettings(observerId))).toEqual([
        OBSERVER_SETTING,
      ]);
    }
  });

  test("produces a value a policy can cast without raising", () => {
    // policies must read this as nullif(current_setting(...), '')::uuid. The
    // empty string is what makes that null rather than a cast error
    expect(buildPgSettings(undefined)[OBSERVER_SETTING]).toBe("");
  });
});
