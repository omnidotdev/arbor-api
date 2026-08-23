import { describe, expect, test } from "bun:test";

import { getApplicationStatus } from "./applicationStatus";

/**
 * Fake db exposing only the tester-application lookup getApplicationStatus needs,
 * so the resolution can be tested without a live database. Returns the configured
 * row (or undefined for no row) regardless of the where clause.
 */
const dbWithApplication = (row: { status: string } | undefined) =>
  ({
    query: {
      testerApplicationTable: {
        findFirst: async () => row,
      },
    },
  }) as never;

describe("getApplicationStatus", () => {
  test("returns the row's status when an application exists", async () => {
    expect(
      await getApplicationStatus(
        dbWithApplication({ status: "approved" }),
        "u1",
      ),
    ).toBe("approved");
  });

  test("returns pending / declined statuses verbatim", async () => {
    expect(
      await getApplicationStatus(
        dbWithApplication({ status: "pending" }),
        "u1",
      ),
    ).toBe("pending");
    expect(
      await getApplicationStatus(
        dbWithApplication({ status: "declined" }),
        "u1",
      ),
    ).toBe("declined");
  });

  test("returns null when the user has no application", async () => {
    expect(await getApplicationStatus(dbWithApplication(undefined), "u1")).toBe(
      null,
    );
  });
});
