import { GraphQLError, Kind, getOperationAST } from "graphql";

import { getApplicationStatus } from "lib/beta/applicationStatus";
import { isWhitelisted } from "lib/beta/whitelist";
import {
  betaGateEnabled,
  betaWhitelistUserIds,
  isProdEnv,
} from "lib/config/env.config";
import { billingBypassOrgIds } from "./authorization/constants";

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

/** Inputs to the pure beta-gate decision. */
export interface BetaGateDecisionInput {
  /** Whether the closed-beta gate is active at all */
  gateEnabled: boolean;
  /** Whether the caller is whitelisted or a billing-bypass org member */
  allowed: boolean;
  /** The operation being executed */
  operation: OperationDefinitionNode;
  /** The carve-out root field set */
  carveOuts: ReadonlySet<string>;
  /** Whether introspection root fields are permitted */
  allowIntrospection: boolean;
}

/**
 * Pure allow/deny decision for the beta gate.
 *
 * Gate disabled -> allow. Allowed caller -> allow any field. Otherwise allow
 * only when every selected root field is in the carve-out set.
 */
export const evaluateBetaGate = ({
  gateEnabled,
  allowed,
  operation,
  carveOuts,
  allowIntrospection,
}: BetaGateDecisionInput): { allow: boolean } => {
  if (!gateEnabled) return { allow: true };
  if (allowed) return { allow: true };
  return {
    allow: selectionIsBetaSafe(operation, carveOuts, { allowIntrospection }),
  };
};

/**
 * Pure allow/deny decision for a SUBSCRIPTION under the beta gate.
 *
 * Subscriptions have no legitimate carve-out in the closed beta (there is no
 * subscription a non-whitelisted applicant needs to open to sign in, apply, or
 * check status), so a non-allowed caller is denied every subscription root
 * field. Gate-off and the allowed path stay identical to the query path.
 */
export const evaluateSubscriptionBetaGate = ({
  gateEnabled,
  allowed,
}: {
  gateEnabled: boolean;
  allowed: boolean;
}): { allow: boolean } => {
  if (!gateEnabled) return { allow: true };
  return { allow: allowed };
};

/**
 * Resolve whether a caller may use arbor while the gate is active.
 *
 * Combines the env/application whitelist (via isWhitelisted, looking up the
 * caller's application status) with the internal billing-bypass org escape
 * hatch. The env-whitelist ids and bypass org ids are injectable so the
 * resolution is unit-testable, defaulting to the live config.
 */
export const resolveBetaAllowed = async (
  {
    observer,
    organizations,
    db,
  }: {
    observer: { id: string } | null | undefined;
    organizations: ReadonlyArray<{ id: string }>;
    db: Parameters<typeof getApplicationStatus>[0];
  },
  {
    envIds = betaWhitelistUserIds,
    bypassOrgIds = billingBypassOrgIds,
  }: { envIds?: string[]; bypassOrgIds?: string[] } = {},
): Promise<boolean> => {
  const applicationStatus = observer
    ? await getApplicationStatus(db, observer.id)
    : null;

  const whitelisted = isWhitelisted({
    gateEnabled: true,
    userId: observer?.id,
    envIds,
    applicationStatus,
  });

  // internal-org escape hatch: a member of a billing-bypass org is allowed
  // through regardless of application status
  const isBillingBypassOrgMember = organizations.some((org) =>
    bypassOrgIds.includes(org.id),
  );

  return whitelisted || isBillingBypassOrgMember;
};

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

    const context = args.contextValue;
    const allowed = await resolveBetaAllowed({
      observer: context.observer,
      organizations: context.organizations ?? [],
      db: context.db,
    });

    const { allow } = evaluateBetaGate({
      gateEnabled: true,
      allowed,
      operation,
      carveOuts: BETA_CARVE_OUT_FIELDS,
      // introspection allowed in non-prod only, so tooling works in dev without
      // opening prod
      allowIntrospection: !isProdEnv,
    });

    if (!allow) throw betaAccessRequiredError();
  },

  // subscriptions run through the onSubscribe path, not onExecute, so they must
  // be gated here too or a non-whitelisted caller could stream data from a
  // non-carve-out subscription field, bypassing the whitelist. There is no
  // legitimate subscription carve-out for the closed beta, so a non-allowed
  // caller is denied every subscription root field
  async onSubscribe({ args }) {
    if (!betaGateEnabled) return;

    const context = args.contextValue;
    const allowed = await resolveBetaAllowed({
      observer: context.observer,
      organizations: context.organizations ?? [],
      db: context.db,
    });

    const { allow } = evaluateSubscriptionBetaGate({
      gateEnabled: true,
      allowed,
    });

    if (!allow) throw betaAccessRequiredError();
  },
};

export default betaGatePlugin;
