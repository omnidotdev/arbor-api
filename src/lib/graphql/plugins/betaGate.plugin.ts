import { GraphQLError, Kind, getOperationAST } from "graphql";

import { resolveBetaAllowed } from "lib/beta/resolveBetaAllowed";
import { betaGateEnabled, isProdEnv } from "lib/config/env.config";

import type { Plugin } from "@envelop/core";
import type { OperationDefinitionNode } from "graphql";
import type { GraphQLContext } from "lib/graphql/createGraphqlContext";

/**
 * The GraphQL whitelist gate for the arbor closed beta.
 *
 * Runs as an Envelop `onExecute` hook after the authentication plugin, so the
 * observer, organization claims, and db are already on the context. When the
 * closed-beta gate is active every operation is denied by default; a
 * non-whitelisted signed-in caller is allowed through only for a minimal
 * carve-out of root fields so they can still learn who they are, apply, and
 * check their application status. Everything else is rejected with a masked,
 * generic BETA_ACCESS_REQUIRED error.
 *
 * The decision is fail-closed: any ambiguity (no resolvable operation, a
 * non-field root selection, a mixed selection) denies the whole operation.
 */

/**
 * Root fields a non-whitelisted signed-in caller may still select, the minimum
 * to sign in, apply, and see status.
 *
 * - `observer` is the viewer query (see observer.plugin.ts) so the caller can
 *   learn who they are
 * - `submitTesterApplication` is the apply mutation (Task 5)
 * - `myTesterApplication` is the self-status query (Task 6)
 *
 * Referenced by name so the set is stable before the later mutations/queries
 * exist. Introspection fields are handled separately (env-gated), not listed
 * here.
 */
export const BETA_CARVE_OUT_FIELDS: ReadonlySet<string> = new Set([
  "observer",
  "submitTesterApplication",
  "myTesterApplication",
]);

/** Introspection root fields, allowed only when the gate permits introspection. */
const INTROSPECTION_FIELDS: ReadonlySet<string> = new Set([
  "__schema",
  "__type",
  "__typename",
]);

/**
 * Client-visible error for a caller without closed-beta access.
 *
 * MUST be a GraphQLError with a stable `extensions.code`, not a plain Error:
 * graphql-yoga masks any thrown plain Error to "Unexpected error" in production,
 * so the code the app routes on would never reach the client. The message is
 * deliberately generic and leaks no internal detail.
 */
const betaAccessRequiredError = (): GraphQLError =>
  new GraphQLError("Closed beta access is required", {
    extensions: { code: "BETA_ACCESS_REQUIRED" },
  });

/**
 * Whether every selected ROOT field of an operation is in the carve-out set.
 *
 * Fail-closed: an empty selection, a non-field root selection (fragment spread
 * or inline fragment, which we cannot statically resolve to their fields), or
 * any field outside the carve-out set denies the whole operation. Introspection
 * root fields pass only when `allowIntrospection` is set.
 */
export const selectionIsBetaSafe = (
  operation: OperationDefinitionNode,
  carveOuts: ReadonlySet<string>,
  { allowIntrospection }: { allowIntrospection: boolean },
): boolean => {
  const selections = operation.selectionSet.selections;
  if (selections.length === 0) return false;

  return selections.every((selection) => {
    // a non-field root selection cannot be resolved to its fields here, deny
    if (selection.kind !== Kind.FIELD) return false;
    const name = selection.name.value;
    if (INTROSPECTION_FIELDS.has(name)) return allowIntrospection;
    return carveOuts.has(name);
  });
};

/**
 * Resolve the allow decision from a GraphQL context, shared by the onExecute and
 * onSubscribe hooks.
 */
const resolveAllowedFromContext = (context: GraphQLContext): Promise<boolean> =>
  resolveBetaAllowed({
    observer: context.observer,
    organizations: context.organizations ?? [],
    db: context.db,
  });

/**
 * Envelop plugin enforcing the closed-beta whitelist on every operation.
 *
 * Inserted after the authentication plugin so `observer`, `organizations`, and
 * `db` are present on the context.
 */
export const betaGatePlugin: Plugin<GraphQLContext> = {
  async onExecute({ args }) {
    // gate inert until explicitly enabled, avoid the db lookup entirely
    if (!betaGateEnabled) return;

    // fail closed if the operation cannot be resolved from the document
    const operation = getOperationAST(
      args.document,
      args.operationName ?? undefined,
    );
    if (!operation) throw betaAccessRequiredError();

    // cheap static check first: a carve-out-only operation (observer, apply,
    // status, or dev introspection) is allowed regardless of whitelist status,
    // so it never pays for the DB lookup resolveBetaAllowed would run
    if (
      selectionIsBetaSafe(operation, BETA_CARVE_OUT_FIELDS, {
        // introspection allowed in non-prod only, so tooling works in dev
        // without opening prod
        allowIntrospection: !isProdEnv,
      })
    ) {
      return;
    }

    const allowed = await resolveAllowedFromContext(args.contextValue);
    if (!allowed) throw betaAccessRequiredError();
  },

  // subscriptions run through the onSubscribe path, not onExecute, so they must
  // be gated here too or a non-whitelisted caller could stream data from a
  // non-carve-out subscription field, bypassing the whitelist. There is no
  // legitimate subscription carve-out for the closed beta, so a non-allowed
  // caller is denied every subscription root field
  async onSubscribe({ args }) {
    if (!betaGateEnabled) return;

    const allowed = await resolveAllowedFromContext(args.contextValue);
    if (!allowed) throw betaAccessRequiredError();
  },
};

export default betaGatePlugin;
