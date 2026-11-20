import { EXPORTABLE } from "graphile-export";
import { context, lambda, object } from "postgraphile/grafast";
import { extendSchema } from "postgraphile/utils";

import { transferRepository } from "lib/repository";

import type { FieldArgs } from "postgraphile/grafast";

/**
 * `transferRepository`: a member moves a repository to another of their
 * workspaces. See `transferRepository` for the authorization rules
 */
const RepositoryTransferPlugin = extendSchema(() => ({
  typeDefs: /* GraphQL */ `
    """
    Input for moving a repository to another workspace.
    """
    input TransferRepositoryInput {
      """
      The repository row ID.
      """
      rowId: UUID!

      """
      The workspace to move it to, as its identity-provider organization id.
      """
      toIdpOrganizationId: String!

      """
      Run every check and change nothing.
      """
      dryRun: Boolean
    }

    extend type Mutation {
      """
      Move a repository to another workspace. Takes an owner or admin of the
      workspace it is in (or the owner of a personal repository) who is also
      an owner or admin of the target. History and collaborators stay, the
      caller becomes its owner, and its old clone path and links keep working.
      """
      transferRepository(
        input: TransferRepositoryInput!
      ): TransferWorkspaceRepositoryPayload
    }
  `,
  objects: {
    Mutation: {
      plans: {
        transferRepository: EXPORTABLE(
          (lambda, object, context, transferRepository) =>
            (_$root: any, fieldArgs: FieldArgs) =>
              lambda(
                object({
                  input: fieldArgs.getRaw("input"),
                  db: context().get("db"),
                  observer: context().get("observer"),
                  organizations: context().get("organizations"),
                }),
                async (args: any) =>
                  await transferRepository({
                    observer: args.observer ?? null,
                    organizations: args.organizations ?? [],
                    input: args.input,
                    db: args.db,
                  }),
              ),
          [lambda, object, context, transferRepository],
        ),
      },
    },
  },
}));

export default RepositoryTransferPlugin;
