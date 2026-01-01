import { jsonPgSmartTags } from "postgraphile/utils";

/**
 * Smart tag plugin, which controls Postgraphile API surface emission.
 * @see https://postgraphile.org/postgraphile/5/pg-smart-tags
 */
const SmartTagPlugin = jsonPgSmartTags({
  version: 1,
  config: {
    class: {
      organization: {
        attribute: {
          tier: {
            tags: {
              behavior: "-insert -update +orderBy",
            },
          },
          stripe_subscription_id: {
            tags: {
              behavior: "-insert -update",
            },
          },
        },
      },
      organization_member: {
        attribute: {
          role: {
            tags: {
              behavior: "+orderBy",
            },
          },
        },
      },
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
