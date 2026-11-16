import { EXPORTABLE } from "graphile-export";
import { context, lambda, object } from "postgraphile/grafast";
import { extendSchema } from "postgraphile/utils";

import { resolveUserFromToken } from "lib/auth/resolveUserFromToken";
import { createWorkspaceRepository } from "lib/repository";

import type { FieldArgs } from "postgraphile/grafast";

/**
 * Header carrying the member's own access token on a workspace repository
 * create. A header rather than an input field, so the token never sits in
 * GraphQL variables
 */
const MEMBER_TOKEN_HEADER = "x-arbor-member-token";

/**
 * `createWorkspaceRepository`: a first-party product (e.g. Keystone) creates a
 * repository the WORKSPACE owns, on a member's behalf, and receives write on
 * that one repository as a collaborator. See `createWorkspaceRepository` for
 * the authorization rules
 */
const WorkspaceRepositoryCreatePlugin = extendSchema(() => ({
  typeDefs: /* GraphQL */ `
    """
    Input for creating a workspace repository on a member's behalf.
    """
    input CreateWorkspaceRepositoryInput {
      """
      The workspace, as its identity-provider organization id.
      """
      idpOrganizationId: String!

      """
      The repository name.
      """
      name: String!

      """
      The repository slug (URL-friendly name).
      """
      slug: String!

      """
      Optional description.
      """
      description: String

      """
      Visibility (public or private). Defaults to public.
      """
      visibility: Visibility
    }

    extend type Mutation {
      """
      Create (or find) a repository owned by a workspace, for a first-party
      product acting with a member's token (sent in the X-Arbor-Member-Token
      header). The product is granted write on this repository only.
      """
      createWorkspaceRepository(
        input: CreateWorkspaceRepositoryInput!
      ): CreateRepositoryWithGitPayload
    }
  `,
  objects: {
    Mutation: {
      plans: {
        createWorkspaceRepository: EXPORTABLE(
          (
            lambda,
            object,
            context,
            createWorkspaceRepository,
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

                  return await createWorkspaceRepository({
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
            createWorkspaceRepository,
            resolveUserFromToken,
            MEMBER_TOKEN_HEADER,
          ],
        ),
      },
    },
  },
}));

export default WorkspaceRepositoryCreatePlugin;
