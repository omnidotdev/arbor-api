import { jsonPgSmartTags } from "postgraphile/utils";

/**
 * Smart tag plugin, which controls Postgraphile API surface emission.
 * @see https://postgraphile.org/postgraphile/5/pg-smart-tags
 */
const SmartTagPlugin = jsonPgSmartTags({
  version: 1,
  config: {
    class: {
      repository: {
        tags: {
          // Hide the auto-generated createRepository. It inserts the row without
          // initializing git storage on disk, producing a repository that cannot
          // be cloned or pushed to. createRepositoryWithGit is the only correct
          // creation path (it also enforces the private-repo entitlement).
          // Update and delete stay: both are authorized and have side effects
          // wired up (rename moves storage, delete removes it).
          //
          // The two query behaviors remove Query.repository(rowId:) and
          // Query.repositoryById. Those return one row rather than a
          // connection, so RepositoryRead.plugin.ts cannot scope them, and they
          // were a complete bypass of it: a private repository was readable
          // directly by id, and GitTypes hangs ref/commit/tree access off
          // Repository. Removing the unprotected path is more reliable than
          // trying to filter a single-row plan. Every live consumer already
          // reads through the `repositories` connection, which IS scoped
          // (see repositoryBySlug / repositoryWithBranches in arbor-app).
          // `-query:resource:single` rather than a bare `-single`: the latter
          // also strips the singular RELATION fields (Stack.repository,
          // PullRequest.repository), which the app does use. `-node` removes
          // the by-node-id accessor, which is the same bypass reached through a
          // constructed Node ID
          behavior: "-insert -query:resource:single -node",
        },
        attribute: {
          visibility: {
            tags: {
              behavior: "+orderBy",
            },
          },
        },
      },
      repository_collaborator: {
        attribute: {
          permission: {
            tags: {
              behavior: "+orderBy",
            },
          },
        },
      },
      user: {
        tags: {
          // Remove every root accessor for users. `users` listed every account
          // to any caller, and the single-row accessors were worse than the
          // listing they bypassed: `userByEmail` remained a working oracle even
          // after the email attribute was hidden below, so an anonymous caller
          // could confirm an address belonged to an account and read that
          // account's username and activity graph back. Single-row plans cannot
          // be filtered (see RepositoryRead.plugin.ts), so removal is the fix.
          //
          // Nothing consumes these: arbor-app queries no root user field, and
          // authentication resolves users through Drizzle in
          // lib/auth/resolveUserFromToken.ts, never through GraphQL. The
          // authenticated user reads themselves via `observer`.
          //
          // `-query:resource:single` rather than a bare `-single`, which would
          // also strip the singular RELATION fields (PullRequest.author,
          // Repository.owner, PullRequestReview.reviewer) the attribution UI
          // renders. Those stay, and are already scoped by the repository
          // predicate that gates reaching the parent row at all
          //
          // `-insert` because users are created by the OAuth flow only, in the
          // Drizzle upsert in lib/auth/resolveUserFromToken.ts. The generated
          // createUser was dead surface that User.plugin.ts rejected on every
          // call; its wrapper stays as defence in depth if this tag is ever
          // dropped, the way createRepository does
          behavior:
            "-insert -query:resource:single -query:resource:connection -query:resource:list -node",
        },
        attribute: {
          // Exposing these leaked the email address and IDP subject of every
          // account to any caller. Neither is needed: the authenticated user's
          // own email comes from the `observer` query, and nothing reads the
          // IDP id through the API. Kept alongside the root-accessor removal
          // above as defence in depth, since User is still reachable through
          // relations
          email: {
            tags: {
              behavior: "-*",
            },
          },
          identity_provider_id: {
            tags: {
              behavior: "-*",
            },
          },
        },
      },
      personal_access_token: {
        tags: {
          // Tokens are minted only through the custom createPersonalAccessToken
          // mutation, and fetched only through the observer-scoped connection.
          // Hide the auto-generated insert/update mutations (which would accept
          // a raw tokenHash) and the single-row/node accessors (which would let
          // a caller read another user's token by id)
          behavior: "-insert -update -single -node",
        },
        attribute: {
          token_hash: {
            tags: {
              // Never expose the token hash anywhere in the API surface
              behavior: "-*",
            },
          },
        },
        constraint: {
          // Hide the User -> personalAccessTokens reverse relation. Users read
          // their own tokens only through the observer-scoped root connection;
          // without this a caller could read another user's token metadata via
          // the user/users queries
          personal_access_token_user_id_user_id_fk: {
            tags: {
              behavior: "-connection -list -single",
            },
          },
        },
      },
      personal_access_token_repository: {
        tags: {
          // A token's repository whitelist is what confines it, so it is set
          // once at mint time by createPersonalAccessToken and is immutable
          // afterwards. Without this, deletePersonalAccessTokenRepository would
          // let a caller widen a confined token back to full reach, which is
          // exactly the boundary the whitelist exists to enforce
          behavior: "-insert -update -delete -single -node",
        },
        constraint: {
          // Hide the Repository -> tokens reverse relation: which tokens are
          // scoped to a repository is not something a repository viewer should
          // be able to enumerate. `-single` is deliberately NOT set, so the
          // forward whitelistRow -> repository field stays readable and a token
          // owner can see what their own token is confined to
          personal_access_token_repository_repository_id_repository_id_fk: {
            tags: {
              behavior: "-connection -list",
            },
          },
        },
      },
    },
  },
});

export default SmartTagPlugin;
