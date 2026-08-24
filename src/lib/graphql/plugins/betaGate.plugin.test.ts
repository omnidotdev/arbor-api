import { describe, expect, test } from "bun:test";

import { getOperationAST, parse } from "graphql";

import {
  BETA_CARVE_OUT_FIELDS,
  betaGatePlugin,
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

  test("onSubscribe is a no-op when the gate is disabled (default test env)", async () => {
    const args = {
      document: parse("subscription { pullRequestCommentChanged { rowId } }"),
      operationName: undefined,
      contextValue: {
        observer: null,
        organizations: [],
        db: fakeDb(undefined),
      },
    };
    // gate is off by default in the test env, so the subscription must proceed
    await expect(
      betaGatePlugin.onSubscribe?.({ args } as unknown as Parameters<
        NonNullable<typeof betaGatePlugin.onSubscribe>
      >[0]),
    ).resolves.toBeUndefined();
  });
});
