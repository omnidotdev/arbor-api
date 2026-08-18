import { describe, expect, it } from "bun:test";

import { GraphQLError } from "graphql";

import { COST_LIMIT_CODE, costLimitError } from "./costLimitError";

describe("costLimitError", () => {
  it("is a GraphQLError carrying a 400 http status so yoga returns 400, not a masked 500", () => {
    const error = costLimitError(
      "Query cost limit of 8000 exceeded, found 9001.",
    );

    expect(error).toBeInstanceOf(GraphQLError);
    // yoga derives the HTTP status from extensions.http.status (error.js) and
    // mask-error.js preserves extensions.http even when masking, so this pins
    // the response to a non-retryable 400
    expect(error.extensions.http).toEqual({ status: 400 });
    expect(error.extensions.code).toBe(COST_LIMIT_CODE);
  });

  it('preserves the informative detail and drops Armor\'s misleading "Syntax Error" prefix', () => {
    const error = costLimitError(
      "Syntax Error: Query cost limit of 8000 exceeded, found 9001.",
    );

    expect(error.message).toBe(
      "Query cost limit of 8000 exceeded, found 9001.",
    );
  });
});
