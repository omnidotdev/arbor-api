import { PgAggregatesPreset } from "@graphile/pg-aggregates";
import { PgSimplifyInflectionPreset } from "@graphile/simplify-inflection";
import { makePgService } from "postgraphile/adaptors/pg";
import { PostGraphileAmberPreset } from "postgraphile/presets/amber";
import { PostGraphileConnectionFilterPreset } from "postgraphile-plugin-connection-filter";

import {
  OrganizationPlugin,
  PrimaryKeyMutationsOnlyPlugin,
  PullRequestPlugin,
  RepositoryCollaboratorPlugin,
  RepositoryPlugin,
  SmartTagPlugin,
  UserPlugin,
} from "lib/graphql/plugins/authorization";
import {
  GitMutationsPlugin,
  GitTypesPlugin,
  RepositoryCreatePlugin,
} from "lib/graphql/plugins/git";
import ObserverPlugin from "lib/graphql/plugins/observer.plugin";
import { DATABASE_URL, isDevEnv, isProdEnv } from "./env.config";

/**
 * Graphile preset.
 */
const graphilePreset: GraphileConfig.Preset = {
  extends: [
    PostGraphileAmberPreset,
    PgSimplifyInflectionPreset,
    PostGraphileConnectionFilterPreset,
    PgAggregatesPreset,
  ],
  plugins: [
    // Observer plugin (exposes current authenticated user)
    ObserverPlugin,
    // Authorization plugins (pre-mutation validation)
    OrganizationPlugin,
    PrimaryKeyMutationsOnlyPlugin,
    PullRequestPlugin,
    RepositoryPlugin,
    RepositoryCollaboratorPlugin,
    SmartTagPlugin,
    UserPlugin,
    // Git GraphQL types and mutations
    GitTypesPlugin,
    GitMutationsPlugin,
    RepositoryCreatePlugin,
  ],
  disablePlugins: ["PgIndexBehaviorsPlugin"],
  schema: {
    retryOnInitFail: isProdEnv,
    sortExport: true,
    pgForbidSetofFunctionsToReturnNull: true,
    jsonScalarAsString: false,
    // See https://github.com/graphile-contrib/postgraphile-plugin-connection-filter?tab=readme-ov-file#handling-null-and-empty-objects
    connectionFilterAllowNullInput: true,
    connectionFilterAllowEmptyObjectInput: true,
  },
  pgServices: [makePgService({ connectionString: DATABASE_URL })],
  grafast: { explain: isDevEnv },
};

export default graphilePreset;
