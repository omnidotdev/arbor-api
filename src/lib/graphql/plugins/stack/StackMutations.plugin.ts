import { EXPORTABLE } from "graphile-export";
import { context, lambda, object } from "postgraphile/grafast";
import { extendSchema } from "postgraphile/utils";

import { stackService } from "lib/stack";

import type { FieldArgs } from "postgraphile/grafast";

/**
 * Map a merge failure reason to a generic, user-facing message.
 *
 * Reasons are stable and machine-readable server-side; the client only ever
 * sees a generic actionable message so no internal detail leaks.
 */
function mergeErrorMessage(reason: string): string {
  switch (reason) {
    case "not-found":
      return "Change not found";
    case "not-open":
      return "Change is not open";
    case "not-mergeable":
      return "Change has required checks that have not passed";
    case "parent-unmerged":
      return "The change below this one has not merged yet";
    case "repository-unavailable":
      return "Repository is not available";
    default:
      return "Merge could not be completed";
  }
}

/**
 * Stack mutations plugin.
 *
 * Backend operations for Arbor's stacked-change + merge model:
 * - stackMergeability(changeId): whether a change's required checks have passed
 * - mergeChange(changeId): land the bottom mergeable change of a stack (records
 *   merge intent non-destructively; the base-branch advance is deferred)
 *
 * Auto-generated Postgraphile CRUD for creating and updating stacks and changes
 * is intentionally left in place; only these custom operations are added.
 */
const StackMutationsPlugin = extendSchema((_build) => {
  return {
    typeDefs: /* GraphQL */ `
      """
      Whether a change can merge, derived from its required verification checks.
      """
      type StackMergeabilityResult {
        """
        True when every required check has passed.
        """
        mergeable: Boolean!

        """
        Names of the required checks that are not yet passed.
        """
        blockingChecks: [String!]!
      }

      """
      Input for merging a change onto its stack base branch.
      """
      input MergeChangeInput {
        """
        The change ID to merge.
        """
        changeId: UUID!
      }

      """
      Payload for the mergeChange mutation.
      """
      type MergeChangePayload {
        """
        Whether the merge intent was recorded successfully.
        """
        success: Boolean!

        """
        The change that was merged.
        """
        changeId: UUID

        """
        The landing shape: "fast-forward" or "merge-commit".
        """
        mode: String

        """
        The commit the merge intent was recorded against.
        """
        recordedTargetOid: String

        """
        Always true: the base-branch ref advance is deferred to the merge queue.
        """
        deferred: Boolean!

        """
        Names of required checks blocking the merge, when it was not mergeable.
        """
        blockingChecks: [String!]

        """
        Error message if the merge did not proceed.
        """
        error: String
      }

      extend type Query {
        """
        Whether a change can merge, from its required verification checks.
        """
        stackMergeability(changeId: UUID!): StackMergeabilityResult
      }

      extend type Mutation {
        """
        Merge a change onto its stack base branch.
        Only the bottom mergeable change of a stack can be merged, and only when
        every required check has passed. Requires write access to the repository.
        """
        mergeChange(input: MergeChangeInput!): MergeChangePayload
      }
    `,

    objects: {
      StackMergeabilityResult: {
        plans: {
          mergeable: EXPORTABLE(
            (lambda) => ($result: any) =>
              lambda($result, (r) => (r as any)?.mergeable ?? false),
            [lambda],
          ),
          blockingChecks: EXPORTABLE(
            (lambda) => ($result: any) =>
              lambda($result, (r) => (r as any)?.blockingChecks ?? []),
            [lambda],
          ),
        },
      },

      MergeChangePayload: {
        plans: {
          success: EXPORTABLE(
            (lambda) => ($payload: any) =>
              lambda($payload, (p) => (p as any)?.success ?? false),
            [lambda],
          ),
          changeId: EXPORTABLE(
            (lambda) => ($payload: any) =>
              lambda($payload, (p) => (p as any)?.changeId ?? null),
            [lambda],
          ),
          mode: EXPORTABLE(
            (lambda) => ($payload: any) =>
              lambda($payload, (p) => (p as any)?.mode ?? null),
            [lambda],
          ),
          recordedTargetOid: EXPORTABLE(
            (lambda) => ($payload: any) =>
              lambda($payload, (p) => (p as any)?.recordedTargetOid ?? null),
            [lambda],
          ),
          deferred: EXPORTABLE(
            (lambda) => ($payload: any) =>
              lambda($payload, (p) => (p as any)?.deferred ?? false),
            [lambda],
          ),
          blockingChecks: EXPORTABLE(
            (lambda) => ($payload: any) =>
              lambda($payload, (p) => (p as any)?.blockingChecks ?? null),
            [lambda],
          ),
          error: EXPORTABLE(
            (lambda) => ($payload: any) =>
              lambda($payload, (p) => (p as any)?.error ?? null),
            [lambda],
          ),
        },
      },

      Query: {
        plans: {
          stackMergeability: EXPORTABLE(
            (lambda, object, context, stackService) =>
              (_$root: any, fieldArgs: FieldArgs) => {
                const $changeId = fieldArgs.getRaw("changeId");
                const $observer = context().get("observer");

                return lambda(
                  object({ changeId: $changeId, observer: $observer }),
                  async (args: any) => {
                    const { changeId, observer } = args;

                    if (!observer) return null;

                    return stackService.computeMergeability(changeId);
                  },
                );
              },
            [lambda, object, context, stackService],
          ),
        },
      },

      Mutation: {
        plans: {
          mergeChange: EXPORTABLE(
            (lambda, object, context, stackService, mergeErrorMessage) =>
              (_$root: any, fieldArgs: FieldArgs) => {
                const $input = fieldArgs.getRaw("input");
                const $db = context().get("db");
                const $observer = context().get("observer");

                return lambda(
                  object({ input: $input, db: $db, observer: $observer }),
                  async (args: any) => {
                    const { input, db, observer } = args;

                    if (!observer) {
                      return {
                        success: false,
                        deferred: false,
                        error: "Unauthorized",
                      };
                    }

                    const { changeId } = input;

                    // Load the change's repository with the observer's
                    // collaborator row to gate on write access, matching the
                    // gating used by the git mutations
                    const change = await db.query.changeTable.findFirst({
                      where: (table: any, { eq }: any) =>
                        eq(table.id, changeId),
                      with: {
                        repository: {
                          with: {
                            owner: true,
                            organization: true,
                            collaborators: {
                              where: (table: any, { eq }: any) =>
                                eq(table.userId, observer.id),
                            },
                          },
                        },
                      },
                    });

                    if (!change?.repository) {
                      return {
                        success: false,
                        deferred: false,
                        error: "Change not found",
                      };
                    }

                    const repository = change.repository;
                    const isOwner = repository.ownerId === observer.id;
                    const hasWriteAccess = repository.collaborators?.some(
                      (c: any) =>
                        c.permission === "admin" || c.permission === "write",
                    );

                    if (!isOwner && !hasWriteAccess) {
                      return {
                        success: false,
                        deferred: false,
                        error: "Unauthorized - requires write access",
                      };
                    }

                    const outcome = await stackService.mergeChange(
                      changeId,
                      observer.id,
                    );

                    if (!outcome.ok) {
                      return {
                        success: false,
                        deferred: false,
                        blockingChecks: outcome.blockingChecks ?? null,
                        error: mergeErrorMessage(outcome.reason),
                      };
                    }

                    return {
                      success: true,
                      changeId: outcome.changeId,
                      mode: outcome.mode,
                      recordedTargetOid: outcome.recordedTargetOid,
                      deferred: outcome.deferred,
                      blockingChecks: null,
                      error: null,
                    };
                  },
                );
              },
            [lambda, object, context, stackService, mergeErrorMessage],
          ),
        },
      },
    },
  };
});

export default StackMutationsPlugin;
