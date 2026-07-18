import { PgSubscriber } from "postgraphile/adaptors/pg";

import { pgPool } from "lib/db/db";

/**
 * Postgres LISTEN/NOTIFY subscriber backing GraphQL subscriptions. Holds one
 * pooled connection open for LISTEN and fans Postgres notifications out to the
 * grafast `listen` step by channel. This app supplies its own GraphQL context
 * function, so the subscriber is injected onto the context as `pgSubscriber`
 * (that is what the `listen` step reads) and is also handed to the Postgraphile
 * preset's pgService. Publish with `pg_notify(<topic>, <json>)`
 */
export const pgSubscriber = new PgSubscriber(pgPool);
