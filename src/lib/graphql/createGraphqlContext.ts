import { createWithPgClient } from "postgraphile/adaptors/pg";

import { dbPool, pgPool } from "lib/db/db";

import type { YogaInitialContext } from "graphql-yoga";
import type { SelectUser } from "lib/db/schema";
import type { WithPgClient } from "postgraphile/@dataplan/pg";
import type {
  NodePostgresPgClient,
  PgSubscriber,
} from "postgraphile/adaptors/pg";

const withPgClient = createWithPgClient({ pool: pgPool });

/** Organization claim structure from IDP JWT claims */
export interface OrganizationClaim {
  id: string;
  slug: string;
  type: "personal" | "team";
  roles: string[];
  teams: Array<{ id: string; name: string }>;
}

// Merge declarations for `observer` and `db` which are used within plan resolvers. See: https://grafast.org/grafast/step-library/standard-steps/context#typescript
declare global {
  namespace Grafast {
    interface Context {
      observer: SelectUser | null;
      db: typeof dbPool;
      /** Organization claims from IDP JWT, resolved by authentication plugin */
      organizations: OrganizationClaim[];
      /** Request-scoped authz permission cache to avoid duplicate PDP calls */
      authzCache: Map<string, boolean>;
    }
  }
}

export interface GraphQLContext {
  /** API observer, injected by the authentication plugin and controlled via `contextFieldName`. Related to the viewer pattern: https://wundergraph.com/blog/graphql_federation_viewer_pattern */
  observer: SelectUser | null;
  /** Network request. */
  request: Request;
  /** Database. */
  db: typeof dbPool;
  /** Postgres client, injected by Postgraphile. */
  withPgClient: WithPgClient<NodePostgresPgClient>;
  /** Postgres settings for the current request, injected by Postgraphile. */
  pgSettings: Record<string, string | undefined> | null;
  /** Postgres subscription client for the current request, injected by Postgraphile. */
  pgSubscriber: PgSubscriber | null;
  /** Organization claims from IDP JWT, resolved by authentication plugin */
  organizations: OrganizationClaim[];
  /** Request-scoped authz permission cache to avoid duplicate PDP calls */
  authzCache: Map<string, boolean>;
}

/**
 * Create a GraphQL context.
 * @see https://graphql.org/learn/execution/#root-fields-and-resolvers
 */
const createGraphqlContext = async ({
  request,
}: Omit<YogaInitialContext, "waitUntil">): Promise<
  Omit<
    GraphQLContext,
    "observer" | "organizations" | "pgSettings" | "pgSubscriber"
  >
> => ({
  request,
  db: dbPool,
  withPgClient,
  authzCache: new Map(),
});

export default createGraphqlContext;
