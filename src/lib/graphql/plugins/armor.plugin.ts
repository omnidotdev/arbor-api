import { EnvelopArmor } from "@escape.tech/graphql-armor";

import { GRAPHQL_MAX_COMPLEXITY_COST, isProdEnv } from "lib/config/env.config";
import { costLimitError } from "./costLimitError";

/**
 * Floor for the query-cost ceiling. The app's own list surfaces (stacks, pull
 * requests) run first:100 queries that cost ~5000, so the ceiling must never
 * drop below what those legitimate pages need, or Armor 500s the app against
 * itself. This guards against a stale or misconfigured per-deployment value
 * (production shipped 400, which rejected every list query); a higher env value
 * is still honored.
 */
const MIN_COMPLEXITY_COST = 8000;

const maxCost = Math.max(
  Number(GRAPHQL_MAX_COMPLEXITY_COST) || MIN_COMPLEXITY_COST,
  MIN_COMPLEXITY_COST,
);

/**
 * GraphQL Armor security plugin.
 * @see https://github.com/escape-technologies/graphql-armor
 */
const armor = new EnvelopArmor({
  // https://escape.tech/graphql-armor/docs/plugins/block-field-suggestions
  blockFieldSuggestion: {
    enabled: isProdEnv,
  },
  // https://escape.tech/graphql-armor/docs/plugins/max-depth
  maxDepth: {
    enabled: true,
    n: 10,
  },
  // https://escape.tech/graphql-armor/docs/plugins/cost-limit
  costLimit: {
    enabled: true,
    maxCost,
    objectCost: 2,
    scalarCost: 1,
    depthCostFactor: 1.5,
    ignoreIntrospection: true,
    // Armor otherwise throws a bare GraphQLError that yoga masks into a retried
    // HTTP 500. Re-throw a coded 400 so an over-cost query fails cleanly and
    // non-retryably (runs before Armor's own throw)
    onReject: [
      (_ctx, error) => {
        throw costLimitError(error.message);
      },
    ],
  },
});

const { plugins: armorPlugin } = armor.protect();

export default armorPlugin;
