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
    },
  },
});

export default SmartTagPlugin;
