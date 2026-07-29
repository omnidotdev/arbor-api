import { EXPORTABLE } from "graphile-export";
import { context, lambda, object } from "postgraphile/grafast";
import { extendSchema } from "postgraphile/utils";

import { createPersonalAccessTokenRecord } from "lib/auth/personalAccessToken";

import type { FieldArgs } from "postgraphile/grafast";

/**
 * Custom createPersonalAccessToken mutation plugin.
 *
 * Generates a high-entropy token, stores only its SHA-256 hash, and returns the
 * plaintext exactly once in the payload. The token can never be retrieved again.
 *
 * Ownership is pinned server-side: the row's userId is always the authenticated
 * observer, never a client-supplied value. Unauthenticated calls are rejected.
 *
 * The auto-generated create/update mutations for this table (which would accept
 * a raw tokenHash) are hidden via smart tags, so this is the only way to mint a
 * token.
 */
const PersonalAccessTokenCreatePlugin = extendSchema(() => {
  return {
    typeDefs: /* GraphQL */ `
      """
      Furthest operation an access token may perform.
      """
      enum PersonalAccessTokenPermission {
        READ
        WRITE
      }

      """
      Payload for the createPersonalAccessToken mutation.
      """
      type CreatePersonalAccessTokenPayload {
        """
        The created token row ID.
        """
        rowId: UUID!

        """
        The user-facing token label.
        """
        name: String!

        """
        Short non-secret prefix for display in the UI.
        """
        tokenPrefix: String!

        """
        When the token expires, or null if it never expires.
        """
        expiresAt: Datetime

        """
        When the token was created.
        """
        createdAt: Datetime!

        """
        Furthest operation the token may perform: "read" or "write".
        """
        permission: String!

        """
        The plaintext token. Returned exactly once, at creation, and never
        retrievable again. Store it securely.
        """
        token: String!
      }

      extend type Mutation {
        """
        Create a personal access token for the authenticated user.
        The plaintext token is returned once in the payload and never again.
        """
        createPersonalAccessToken(
          """
          A label to identify the token.
          """
          name: String!

          """
          Optional lifetime in days. Omit for a token that never expires.
          """
          expiresInDays: Int

          """
          Furthest operation the token may perform. Defaults to WRITE.
          """
          permission: PersonalAccessTokenPermission

          """
          Repositories to confine the token to. Omit to leave the token
          unconfined, so it reaches every repository its owner can reach.
          """
          repositoryIds: [UUID!]
        ): CreatePersonalAccessTokenPayload
      }
    `,

    objects: {
      Mutation: {
        plans: {
          createPersonalAccessToken: EXPORTABLE(
            (lambda, object, context, createPersonalAccessTokenRecord) =>
              (_$root: unknown, fieldArgs: FieldArgs) => {
                const $name = fieldArgs.getRaw("name");
                const $expiresInDays = fieldArgs.getRaw("expiresInDays");
                const $permission = fieldArgs.getRaw("permission");
                const $repositoryIds = fieldArgs.getRaw("repositoryIds");
                const $db = context().get("db");
                const $observer = context().get("observer");

                return lambda(
                  object({
                    name: $name,
                    expiresInDays: $expiresInDays,
                    permission: $permission,
                    repositoryIds: $repositoryIds,
                    db: $db,
                    observer: $observer,
                  }),
                  (args) =>
                    createPersonalAccessTokenRecord({
                      observer: args.observer,
                      name: args.name as string,
                      expiresInDays: args.expiresInDays as
                        | number
                        | null
                        | undefined,
                      // the enum arrives uppercase over the wire
                      permission:
                        (
                          args.permission as string | null | undefined
                        )?.toLowerCase() === "read"
                          ? "read"
                          : "write",
                      repositoryIds: args.repositoryIds as
                        | string[]
                        | null
                        | undefined,
                      db: args.db,
                    }),
                );
              },
            [lambda, object, context, createPersonalAccessTokenRecord],
          ),
        },
      },
    },
  };
});

export default PersonalAccessTokenCreatePlugin;
