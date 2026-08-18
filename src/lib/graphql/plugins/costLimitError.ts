import { GraphQLError } from "graphql";

/**
 * Error code surfaced to clients when a query exceeds the Armor cost limit.
 */
export const COST_LIMIT_CODE = "GRAPHQL_COST_LIMIT_EXCEEDED";

/**
 * Build the client-facing error for an over-cost query.
 *
 * graphql-armor's cost-limit throws a bare `GraphQLError` from its validation
 * visitor. graphql-yoga's masking turns that into an opaque "Unexpected error"
 * with HTTP 500, which clients then retry (the launch bug: the PR conversation
 * panel retried a too-large query four times against a 500).
 *
 * yoga derives the response status from `extensions.http.status` and preserves
 * that extension even through masking, so tagging the error with a 400 pins the
 * response to a non-retryable client error while keeping the reason legible.
 */
export const costLimitError = (message: string): GraphQLError =>
  new GraphQLError(message.replace(/^Syntax Error:\s*/, ""), {
    extensions: {
      code: COST_LIMIT_CODE,
      http: { status: 400 },
    },
  });
