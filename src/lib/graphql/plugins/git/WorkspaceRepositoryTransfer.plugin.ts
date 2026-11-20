import { EXPORTABLE } from "graphile-export";
import { context, lambda, object } from "postgraphile/grafast";
import { extendSchema } from "postgraphile/utils";

import { resolveUserFromToken } from "lib/auth/resolveUserFromToken";
import { transferWorkspaceRepository } from "lib/repository";

import type { FieldArgs } from "postgraphile/grafast";

/**
 * Header carrying the member's own access token, as for
 * `createWorkspaceRepository`: a header rather than an input field, so the
 * token never sits in GraphQL variables
 */
const MEMBER_TOKEN_HEADER = "x-arbor-member-token";

/**
 * `transferWorkspaceRepository`: a first-party product (e.g. Keystone) moves a
 * repository it manages to another of the member's workspaces, history and
 * all. See `transferWorkspaceRepository` for the authorization rules
 */
const WorkspaceRepositoryTransferPlugin = extendSchema(() => ({
  typeDefs: /* GraphQL */ `
    """
    Input for moving a workspace repository to another workspace on a
    member's behalf.
    """
    input TransferWorkspaceRepositoryInput {
      """
      The workspace the repository is in, as its identity-provider organization id.
      """
      fromIdpOrganizationId: String!

      """
      The workspace to move it to, as its identity-provider organization id.
      """
      toIdpOrganizationId: String!

      """
      The repository slug.
      """
      slug: String!

      """
      Run every check and change nothing.
      """
      dryRun: Boolean
    }

    """
    Result of moving a workspace repository.
    """
    type TransferWorkspaceRepositoryPayload {
      """
      The repository row ID.
      """
      rowId: UUID

      """
      The repository slug.
      """
      slug: String

      """
      The clone path owner after the move.
      """
      ownerUsername: String

      """
      The target workspace's slug.
      """
      organizationSlug: String

      """
      The clone path owner before the move, still served as a redirect.
      """
      previousOwnerUsername: String

      """
      Error message, if the move failed.
      """
      error: String
    }

    extend type Mutation {
      """
      Move a repository a first-party product manages to another workspace,
      for a member (token in the X-Arbor-Member-Token header) who is an owner
      or admin of both. History, collaborators and the product's grant stay;
      the member becomes its owner, and its old clone path keeps working.
      """
      transferWorkspaceRepository(
        input: TransferWorkspaceRepositoryInput!
      ): TransferWorkspaceRepositoryPayload
    }
  `,
  objects: {
    Mutation: {
      plans: {
        transferWorkspaceRepository: EXPORTABLE(
          (
            lambda,
            object,
            context,
            transferWorkspaceRepository,
            resolveUserFromToken,
            MEMBER_TOKEN_HEADER,
          ) =>
            (_$root: any, fieldArgs: FieldArgs) => {
              const $input = fieldArgs.getRaw("input");
              const $db = context().get("db");
              const $observer = context().get("observer");
              const $request = context().get("request");

              return lambda(
                object({
                  input: $input,
                  db: $db,
                  observer: $observer,
                  request: $request,
                }),
                async (args: any) => {
                  const { input, db, observer, request } = args;

                  return await transferWorkspaceRepository({
                    observer,
                    memberToken:
                      (request as Request | undefined)?.headers
                        .get(MEMBER_TOKEN_HEADER)
                        ?.replace(/^Bearer\s+/i, "")
                        .trim() || null,
                    input,
                    db,
                    resolveMember: (token) => resolveUserFromToken(token),
                  });
                },
              );
            },
          [
            lambda,
            object,
            context,
            transferWorkspaceRepository,
            resolveUserFromToken,
            MEMBER_TOKEN_HEADER,
          ],
        ),
      },
    },
  },
}));

export default WorkspaceRepositoryTransferPlugin;
