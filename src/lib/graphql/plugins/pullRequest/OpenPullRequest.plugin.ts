import { EXPORTABLE } from "graphile-export";
import { context, lambda, object } from "postgraphile/grafast";
import { extendSchema } from "postgraphile/utils";

import { gitService } from "lib/git";
import events from "lib/providers";
import { pullRequestService } from "lib/pullRequest";

import type { FieldArgs } from "postgraphile/grafast";

/**
 * Custom openPullRequest mutation plugin.
 *
 * The auto-generated createPullRequest CRUD requires the client to supply the
 * per-repo `number` and `authorId`, which is racy and untrustworthy. This
 * mutation takes only the safe inputs (repository, branches, title), assigns
 * the number server-side, records the authenticated user as author, validates
 * both branches exist, and emits an arbor.pull_request.created event.
 *
 * We use extendSchema with lambda() because a wrapPlans sideEffect on $result
 * is not guaranteed to run (Grafast may tree-shake it); lambda() executes all
 * logic in one step, guaranteeing order. Mirrors RepositoryCreate.plugin.ts.
 */
const OpenPullRequestPlugin = extendSchema(() => {
  return {
    typeDefs: /* GraphQL */ `
      """
      Input for opening a pull request.
      """
      input OpenPullRequestInput {
        """
        The repository the pull request belongs to.
        """
        repositoryId: UUID!

        """
        Pull request title.
        """
        title: String!

        """
        Optional description (Markdown).
        """
        description: String

        """
        Branch the changes come from.
        """
        sourceBranch: String!

        """
        Branch the changes merge into.
        """
        targetBranch: String!
      }

      """
      Payload for the openPullRequest mutation.
      """
      type OpenPullRequestPayload {
        """
        The created pull request row ID.
        """
        rowId: UUID

        """
        The per-repository pull request number.
        """
        number: Int

        """
        Error message if opening failed.
        """
        error: String
      }

      extend type Mutation {
        """
        Open a pull request from a source branch into a target branch. Assigns
        the next per-repository number and records the authenticated user as
        author. Requires write access; both branches must already exist.
        """
        openPullRequest(input: OpenPullRequestInput!): OpenPullRequestPayload
      }
    `,

    objects: {
      OpenPullRequestPayload: {
        plans: {
          rowId: EXPORTABLE(
            (lambda) => ($payload: any) =>
              lambda($payload, (p) => (p as any)?.rowId ?? null),
            [lambda],
          ),
          number: EXPORTABLE(
            (lambda) => ($payload: any) =>
              lambda($payload, (p) => (p as any)?.number ?? null),
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
          openPullRequest: EXPORTABLE(
            (lambda, object, context, gitService, pullRequestService, events) =>
              (_$root: any, fieldArgs: FieldArgs) => {
                const $input = fieldArgs.getRaw("input");
                const $db = context().get("db");
                const $observer = context().get("observer");

                return lambda(
                  object({ input: $input, db: $db, observer: $observer }),
                  async (args: any) => {
                    const { input, db, observer } = args;

                    // Must be authenticated
                    if (!observer) {
                      return {
                        rowId: null,
                        number: null,
                        error: "Unauthorized",
                      };
                    }

                    const {
                      repositoryId,
                      title,
                      description,
                      sourceBranch,
                      targetBranch,
                    } = input;

                    if (sourceBranch === targetBranch) {
                      return {
                        rowId: null,
                        number: null,
                        error: "Source and target branches must differ",
                      };
                    }

                    // Resolve the repository + owner and gate on write access
                    // (owner or a write/admin collaborator), mirroring
                    // PullRequest.plugin.ts hasWriteAccess
                    const repository = await db.query.repositoryTable.findFirst(
                      {
                        where: (table: any, { eq }: any) =>
                          eq(table.id, repositoryId),
                        with: {
                          owner: true,
                          collaborators: {
                            where: (table: any, { eq }: any) =>
                              eq(table.userId, observer.id),
                          },
                        },
                      },
                    );

                    if (!repository) {
                      return {
                        rowId: null,
                        number: null,
                        error: "Repository not found",
                      };
                    }

                    const isOwner = repository.ownerId === observer.id;
                    const collaborator = repository.collaborators?.[0];
                    const canWrite =
                      isOwner ||
                      collaborator?.permission === "write" ||
                      collaborator?.permission === "admin";

                    if (!canWrite) {
                      return {
                        rowId: null,
                        number: null,
                        error: "Unauthorized",
                      };
                    }

                    // Bare repositories are stored under the owning user's
                    // username, for personal and organization repos alike
                    const ownerSlug = repository.owner?.username;
                    if (!ownerSlug) {
                      return {
                        rowId: null,
                        number: null,
                        error: "Repository unavailable",
                      };
                    }

                    // Both branches must exist, so a pull request never
                    // references a branch that is not there
                    const branches = await gitService.listBranches(
                      ownerSlug,
                      repository.slug,
                    );
                    const branchNames = new Set(
                      branches.map((branch) => branch.name),
                    );
                    if (!branchNames.has(sourceBranch)) {
                      return {
                        rowId: null,
                        number: null,
                        error: "Source branch not found",
                      };
                    }
                    if (!branchNames.has(targetBranch)) {
                      return {
                        rowId: null,
                        number: null,
                        error: "Target branch not found",
                      };
                    }

                    const created = await pullRequestService.createPullRequest(
                      {
                        repositoryId,
                        authorId: observer.id,
                        authoredByAgentId: null,
                        title,
                        description: description ?? null,
                        sourceBranch,
                        targetBranch,
                      },
                      db,
                    );

                    if (!created) {
                      return {
                        rowId: null,
                        number: null,
                        error: "Failed to open pull request",
                      };
                    }

                    events
                      .emit({
                        type: "arbor.pull_request.created",
                        data: {
                          pullRequestId: created.id,
                          number: created.number,
                          repositoryId,
                          sourceBranch,
                          targetBranch,
                          authorId: observer.id,
                        },
                        organizationId:
                          repository.organizationId || repository.ownerId,
                        subject: created.id,
                      })
                      .catch((err) =>
                        console.warn("[arbor] Event emit failed", err),
                      );

                    return {
                      rowId: created.id,
                      number: created.number,
                      error: null,
                    };
                  },
                );
              },
            [lambda, object, context, gitService, pullRequestService, events],
          ),
        },
      },
    },
  };
});

export default OpenPullRequestPlugin;
