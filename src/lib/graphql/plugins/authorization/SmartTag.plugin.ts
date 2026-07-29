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
