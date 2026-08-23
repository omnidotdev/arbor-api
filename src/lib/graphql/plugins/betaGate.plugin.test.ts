import { describe, expect, test } from "bun:test";

import { getOperationAST, parse } from "graphql";

import {
  BETA_CARVE_OUT_FIELDS,
  betaGatePlugin,
  evaluateBetaGate,
  resolveBetaAllowed,
  selectionIsBetaSafe,
} from "./betaGate.plugin";

import type { OperationDefinitionNode } from "graphql";

/** Parse a GraphQL operation string into its root operation definition. */
const op = (source: string): OperationDefinitionNode => {
  const operation = getOperationAST(parse(source));
  if (!operation) throw new Error("no operation in fixture");
  return operation;
};

/**
 * Fake db exposing only the tester-application lookup resolveBetaAllowed needs,
 * returning the configured status (or no row) regardless of the where clause.
 */
const fakeDb = (status: string | undefined) =>
  ({
    query: {
      testerApplicationTable: {
        findFirst: async () => (status ? { status } : undefined),
      },
    },
  }) as never;

describe("selectionIsBetaSafe", () => {
  test("a single carve-out query field is safe", () => {
    expect(
      selectionIsBetaSafe(op("{ observer { rowId } }"), BETA_CARVE_OUT_FIELDS, {
        allowIntrospection: false,
      }),
    ).toBe(true);
  });

  test("a single carve-out mutation field is safe", () => {
    expect(
      selectionIsBetaSafe(
        op("mutation { submitTesterApplication(input: {}) { rowId } }"),
        BETA_CARVE_OUT_FIELDS,
        { allowIntrospection: false },
      ),
    ).toBe(true);
  });

  test("the self-status carve-out field is safe", () => {
    expect(
      selectionIsBetaSafe(
        op("{ myTesterApplication { status } }"),
        BETA_CARVE_OUT_FIELDS,
        { allowIntrospection: false },
      ),
    ).toBe(true);
  });

  test("a carve-out mixed with any other field is not safe", () => {
    expect(
      selectionIsBetaSafe(
        op("{ observer { rowId } repositories { totalCount } }"),
        BETA_CARVE_OUT_FIELDS,
        { allowIntrospection: false },
      ),
    ).toBe(false);
  });

  test("a non-carve-out field alone is not safe", () => {
    expect(
      selectionIsBetaSafe(
        op("{ repositories { totalCount } }"),
        BETA_CARVE_OUT_FIELDS,
        { allowIntrospection: false },
      ),
    ).toBe(false);
  });

  test("introspection is safe only when explicitly allowed", () => {
    const introspection = op("{ __schema { queryType { name } } }");
    expect(
      selectionIsBetaSafe(introspection, BETA_CARVE_OUT_FIELDS, {
        allowIntrospection: true,
      }),
    ).toBe(true);
    expect(
      selectionIsBetaSafe(introspection, BETA_CARVE_OUT_FIELDS, {
        allowIntrospection: false,
      }),
    ).toBe(false);
  });

  test("__typename is gated by the introspection flag too", () => {
    const typename = op("{ __typename }");
    expect(
      selectionIsBetaSafe(typename, BETA_CARVE_OUT_FIELDS, {
        allowIntrospection: true,
      }),
    ).toBe(true);
    expect(
      selectionIsBetaSafe(typename, BETA_CARVE_OUT_FIELDS, {
        allowIntrospection: false,
      }),
    ).toBe(false);
  });

  test("a non-field root selection (fragment spread) fails closed", () => {
    const withFragment = op(
      "query { ...Frag } fragment Frag on Query { observer { rowId } }",
    );
    expect(
      selectionIsBetaSafe(withFragment, BETA_CARVE_OUT_FIELDS, {
        allowIntrospection: false,
      }),
    ).toBe(false);
  });
});

describe("evaluateBetaGate", () => {
  const other = op("{ repositories { totalCount } }");
  const carveOut = op("{ observer { rowId } }");

  test("allows anything when the gate is disabled", () => {
    expect(
      evaluateBetaGate({
        gateEnabled: false,
        allowed: false,
        operation: other,
        carveOuts: BETA_CARVE_OUT_FIELDS,
        allowIntrospection: false,
      }).allow,
    ).toBe(true);
  });

  test("allows any field for an allowed (whitelisted) caller", () => {
    expect(
      evaluateBetaGate({
        gateEnabled: true,
        allowed: true,
        operation: other,
        carveOuts: BETA_CARVE_OUT_FIELDS,
        allowIntrospection: false,
      }).allow,
    ).toBe(true);
  });

  test("allows only carve-out fields for a non-allowed caller", () => {
    expect(
      evaluateBetaGate({
        gateEnabled: true,
        allowed: false,
        operation: carveOut,
        carveOuts: BETA_CARVE_OUT_FIELDS,
        allowIntrospection: false,
      }).allow,
    ).toBe(true);
  });

  test("denies non-carve-out fields for a non-allowed caller", () => {
    expect(
      evaluateBetaGate({
        gateEnabled: true,
        allowed: false,
        operation: other,
        carveOuts: BETA_CARVE_OUT_FIELDS,
        allowIntrospection: false,
      }).allow,
    ).toBe(false);
  });
});

describe("resolveBetaAllowed", () => {
  test("allows an observer with an approved application", async () => {
    expect(
      await resolveBetaAllowed({
        observer: { id: "u1" },
        organizations: [],
        db: fakeDb("approved"),
      }),
    ).toBe(true);
  });

  test("denies an observer with a pending application", async () => {
    expect(
      await resolveBetaAllowed({
        observer: { id: "u1" },
        organizations: [],
        db: fakeDb("pending"),
      }),
    ).toBe(false);
  });

  test("denies an anonymous caller", async () => {
    expect(
      await resolveBetaAllowed({
        observer: null,
        organizations: [],
        db: fakeDb(undefined),
      }),
    ).toBe(false);
  });

  test("allows an env-whitelisted user id", async () => {
    expect(
      await resolveBetaAllowed(
        { observer: { id: "u1" }, organizations: [], db: fakeDb(undefined) },
        { envIds: ["u1"] },
      ),
    ).toBe(true);
  });

  test("allows a member of a billing-bypass org", async () => {
    expect(
      await resolveBetaAllowed(
        {
          observer: { id: "u1" },
          organizations: [{ id: "org1" }],
          db: fakeDb(undefined),
        },
        { bypassOrgIds: ["org1"] },
      ),
    ).toBe(true);
  });

  test("denies a member of an unrelated org", async () => {
    expect(
      await resolveBetaAllowed(
        {
          observer: { id: "u1" },
          organizations: [{ id: "org2" }],
          db: fakeDb(undefined),
        },
        { bypassOrgIds: ["org1"] },
      ),
    ).toBe(false);
  });
});

describe("betaGatePlugin", () => {
  test("is a no-op when the gate is disabled (default test env)", async () => {
    const args = {
      document: parse("{ repositories { totalCount } }"),
      operationName: undefined,
      contextValue: {
        observer: null,
        organizations: [],
        db: fakeDb(undefined),
      },
    };
    // gate is off by default in the test env, so execution must proceed
    await expect(
      betaGatePlugin.onExecute?.({ args } as unknown as Parameters<
        NonNullable<typeof betaGatePlugin.onExecute>
      >[0]),
    ).resolves.toBeUndefined();
  });
});
