import { EXPORTABLE } from "graphile-export";
import { context, lambda, object } from "postgraphile/grafast";
import { extendSchema } from "postgraphile/utils";

import { mergeQueueService } from "lib/mergeQueue";

import type { FieldArgs } from "postgraphile/grafast";

/**
 * Map an enqueue failure reason to a generic, user-facing message.
 *
 * Reasons are stable and machine-readable server-side; the client only ever
 * sees a generic actionable message so no internal detail leaks.
 */
function enqueueErrorMessage(reason: string): string {
  switch (reason) {
    case "stack-not-found":
      return "Stack not found";
    default:
      return "Stack could not be enqueued";
  }
}

/**
 * Merge queue mutations plugin.
 *
 * Custom operations for Arbor's merge queue, layered on top of the
 * auto-generated Postgraphile CRUD for merge_queue_entry (which is intentionally
 * left intact):
 * - enqueueStack(stackId): add a stack to its repository's merge queue
 * - processMergeQueue(repositoryId): run one serial pass, landing what it safely
 *   can through the existing non-destructive merge path
 *
 * Both mutations require write access to the repository, mirroring mergeChange.
 */
const MergeQueueMutationsPlugin = extendSchema((_build) => {
  return {
    typeDefs: /* GraphQL */ `
      """
      Input for enqueuing a stack onto its repository's merge queue.
      """
      input EnqueueStackInput {
        """
        The stack ID to enqueue.
        """
        stackId: UUID!
      }

      """
      Payload for the enqueueStack mutation.
      """
      type EnqueueStackPayload {
        """
        Whether the stack was enqueued (or already had an active entry).
        """
        success: Boolean!

        """
        The merge queue entry for the stack.
        """
        entryId: UUID

        """
        True when an active entry already existed, so no new entry was inserted.
        """
        alreadyQueued: Boolean

        """
        Error message if the stack could not be enqueued.
        """
        error: String
      }

      """
      Input for processing a repository's merge queue.
      """
      input ProcessMergeQueueInput {
        """
        The repository ID whose queue to process.
        """
        repositoryId: UUID!
      }

      """
      Result of processing a single merge queue entry.
      """
      type MergeQueueEntryResult {
        """
        The merge queue entry that was processed.
        """
        entryId: UUID!

        """
        The stack the entry references, when it is a stack entry.
        """
        stackId: UUID

        """
        The entry's status after this pass: "merged", "blocked" or "skipped".
        """
        status: String!

        """
        The changes that landed during this pass, bottom-up.
        """
        mergedChangeIds: [UUID!]!

        """
        A generic explanation when the entry was blocked or skipped.
        """
        detail: String

        """
        Names of required checks blocking the entry, when it was gated.
        """
        blockingChecks: [String!]
      }

      """
      Payload for the processMergeQueue mutation.
      """
      type ProcessMergeQueuePayload {
        """
        Whether the queue pass ran.
        """
        success: Boolean!

        """
        Per-entry results of the pass, in queue order.
        """
        results: [MergeQueueEntryResult!]

        """
        Error message if the pass did not run.
        """
        error: String
      }

      extend type Mutation {
        """
        Enqueue a stack onto its repository's merge queue.
        Idempotent: an already-queued stack returns its existing entry. Requires
        write access to the repository.
        """
        enqueueStack(input: EnqueueStackInput!): EnqueueStackPayload

        """
        Process a repository's merge queue with one serial pass, landing the
        changes it safely can through the existing merge path. Requires write
        access to the repository.
        """
        processMergeQueue(
          input: ProcessMergeQueueInput!
        ): ProcessMergeQueuePayload
      }
    `,

    objects: {
      EnqueueStackPayload: {
        plans: {
          success: EXPORTABLE(
            (lambda) => ($payload: any) =>
              lambda($payload, (p) => (p as any)?.success ?? false),
            [lambda],
          ),
          entryId: EXPORTABLE(
            (lambda) => ($payload: any) =>
              lambda($payload, (p) => (p as any)?.entryId ?? null),
            [lambda],
          ),
          alreadyQueued: EXPORTABLE(
            (lambda) => ($payload: any) =>
              lambda($payload, (p) => (p as any)?.alreadyQueued ?? null),
            [lambda],
          ),
          error: EXPORTABLE(
            (lambda) => ($payload: any) =>
              lambda($payload, (p) => (p as any)?.error ?? null),
            [lambda],
          ),
        },
      },

      MergeQueueEntryResult: {
        plans: {
          entryId: EXPORTABLE(
            (lambda) => ($result: any) =>
              lambda($result, (r) => (r as any)?.entryId ?? null),
            [lambda],
          ),
          stackId: EXPORTABLE(
            (lambda) => ($result: any) =>
              lambda($result, (r) => (r as any)?.stackId ?? null),
            [lambda],
          ),
          status: EXPORTABLE(
            (lambda) => ($result: any) =>
              lambda($result, (r) => (r as any)?.status ?? null),
            [lambda],
          ),
          mergedChangeIds: EXPORTABLE(
            (lambda) => ($result: any) =>
              lambda($result, (r) => (r as any)?.mergedChangeIds ?? []),
            [lambda],
          ),
          detail: EXPORTABLE(
            (lambda) => ($result: any) =>
              lambda($result, (r) => (r as any)?.detail ?? null),
            [lambda],
          ),
          blockingChecks: EXPORTABLE(
            (lambda) => ($result: any) =>
              lambda($result, (r) => (r as any)?.blockingChecks ?? null),
            [lambda],
          ),
        },
      },

      ProcessMergeQueuePayload: {
        plans: {
          success: EXPORTABLE(
            (lambda) => ($payload: any) =>
              lambda($payload, (p) => (p as any)?.success ?? false),
            [lambda],
          ),
          results: EXPORTABLE(
            (lambda) => ($payload: any) =>
              lambda($payload, (p) => (p as any)?.results ?? null),
            [lambda],
          ),
          error: EXPORTABLE(
            (lambda) => ($payload: any) =>
              lambda($payload, (p) => (p as any)?.error ?? null),
            [lambda],
          ),
        },
      },

      Mutation: {
        plans: {
          enqueueStack: EXPORTABLE(
            (lambda, object, context, mergeQueueService, enqueueErrorMessage) =>
              (_$root: any, fieldArgs: FieldArgs) => {
                const $input = fieldArgs.getRaw("input");
                const $db = context().get("db");
                const $observer = context().get("observer");

                return lambda(
                  object({ input: $input, db: $db, observer: $observer }),
                  async (args: any) => {
                    const { input, db, observer } = args;

                    if (!observer) {
                      return { success: false, error: "Unauthorized" };
                    }

                    const { stackId } = input;

                    // Load the stack's repository with the observer's
                    // collaborator row to gate on write access, matching the
                    // gating used by mergeChange
                    const stack = await db.query.stackTable.findFirst({
                      where: (table: any, { eq }: any) => eq(table.id, stackId),
                      with: {
                        repository: {
                          with: {
                            collaborators: {
                              where: (table: any, { eq }: any) =>
                                eq(table.userId, observer.id),
                            },
                          },
                        },
                      },
                    });

                    if (!stack?.repository) {
                      return { success: false, error: "Stack not found" };
                    }

                    const repository = stack.repository;
                    const isOwner = repository.ownerId === observer.id;
                    const hasWriteAccess = repository.collaborators?.some(
                      (c: any) =>
                        c.permission === "admin" || c.permission === "write",
                    );

                    if (!isOwner && !hasWriteAccess) {
                      return {
                        success: false,
                        error: "Unauthorized - requires write access",
                      };
                    }

                    const outcome = await mergeQueueService.enqueueStack(
                      stackId,
                      observer.id,
                    );

                    if (!outcome.ok) {
                      return {
                        success: false,
                        error: enqueueErrorMessage(outcome.reason),
                      };
                    }

                    return {
                      success: true,
                      entryId: outcome.entryId,
                      alreadyQueued: outcome.alreadyQueued,
                      error: null,
                    };
                  },
                );
              },
            [lambda, object, context, mergeQueueService, enqueueErrorMessage],
          ),

          processMergeQueue: EXPORTABLE(
            (lambda, object, context, mergeQueueService) =>
              (_$root: any, fieldArgs: FieldArgs) => {
                const $input = fieldArgs.getRaw("input");
                const $db = context().get("db");
                const $observer = context().get("observer");

                return lambda(
                  object({ input: $input, db: $db, observer: $observer }),
                  async (args: any) => {
                    const { input, db, observer } = args;

                    if (!observer) {
                      return { success: false, error: "Unauthorized" };
                    }

                    const { repositoryId } = input;

                    // Gate on write access to the repository being processed
                    const repository = await db.query.repositoryTable.findFirst(
                      {
                        where: (table: any, { eq }: any) =>
                          eq(table.id, repositoryId),
                        with: {
                          collaborators: {
                            where: (table: any, { eq }: any) =>
                              eq(table.userId, observer.id),
                          },
                        },
                      },
                    );

                    if (!repository) {
                      return { success: false, error: "Repository not found" };
                    }

                    const isOwner = repository.ownerId === observer.id;
                    const hasWriteAccess = repository.collaborators?.some(
                      (c: any) =>
                        c.permission === "admin" || c.permission === "write",
                    );

                    if (!isOwner && !hasWriteAccess) {
                      return {
                        success: false,
                        error: "Unauthorized - requires write access",
                      };
                    }

                    const outcome = await mergeQueueService.processQueue(
                      repositoryId,
                      observer.id,
                    );

                    return {
                      success: true,
                      results: outcome.results,
                      error: null,
                    };
                  },
                );
              },
            [lambda, object, context, mergeQueueService],
          ),
        },
      },
    },
  };
});

export default MergeQueueMutationsPlugin;
