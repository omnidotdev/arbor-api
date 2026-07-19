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
    },
  },
});

export default SmartTagPlugin;
