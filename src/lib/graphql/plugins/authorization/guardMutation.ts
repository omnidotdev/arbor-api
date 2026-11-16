import { EXPORTABLE } from "graphile-export";
import { context, sideEffect } from "postgraphile/grafast";

import { createAuthorizationLookup } from "./generatedMutationAuthorization";

import type { PlanWrapperFn } from "postgraphile/utils";
import type {
  AuthorizationLookup,
  AuthorizationSubject,
} from "./generatedMutationAuthorization";

/**
 * An authorization decision: resolves when the caller may proceed, throws
 * otherwise. Receives the raw values read from each requested argument path,
 * in order
 */
type Decision = (
  lookup: AuthorizationLookup,
  subject: AuthorizationSubject,
  ...args: any[]
) => Promise<void>;

/**
 * Wrap a generated mutation with a server-side authorization decision.
 *
 * Reads each argument path (e.g. `["input", "rowId"]`) from the mutation's raw
 * input, refuses an anonymous caller, then runs `decide` before the mutation's
 * own plan executes, so a refusal aborts the write
 */
export const guardMutation = (argPaths: string[][], decide: Decision) =>
  EXPORTABLE(
    (
      context,
      sideEffect,
      createAuthorizationLookup,
      argPaths,
      decide,
    ): PlanWrapperFn =>
      (plan, _, fieldArgs) => {
        const $observer = context().get("observer");
        const $organizations = context().get("organizations");
        const $db = context().get("db");
        const $args = argPaths.map((path) => fieldArgs.getRaw(path));

        sideEffect(
          [$observer, $organizations, $db, ...$args],
          async ([observer, organizations, db, ...args]) => {
            if (!observer) throw new Error("Unauthorized");

            await decide(
              createAuthorizationLookup(db),
              { observerId: observer.id, organizations: organizations ?? [] },
              ...args,
            );
          },
        );

        return plan();
      },
    [context, sideEffect, createAuthorizationLookup, argPaths, decide],
  );

/**
 * Refuse a mutation unconditionally.
 *
 * For generated mutations the schema hides because only the server writes the
 * table (SmartTag.plugin.ts). If a tag is ever dropped and the mutation
 * reappears, this keeps it closed
 */
export const denyMutation = EXPORTABLE(
  (sideEffect, context): PlanWrapperFn =>
    (plan) => {
      sideEffect([context().get("observer")], async () => {
        throw new Error("Unauthorized");
      });

      return plan();
    },
  [sideEffect, context],
);
