import { PgAggregatesPreset } from "@graphile/pg-aggregates";
import { PgSimplifyInflectionPreset } from "@graphile/simplify-inflection";
import { makePgService } from "postgraphile/adaptors/pg";
import { PostGraphileAmberPreset } from "postgraphile/presets/amber";
import { PostGraphileConnectionFilterPreset } from "postgraphile-plugin-connection-filter";

import {
  NoNodeIdMutationsPlugin,
  OrganizationPlugin,
  PrimaryKeyMutationsOnlyPlugin,
  PullRequestCommentPlugin,
  PullRequestPlugin,
  PullRequestReviewPlugin,
  RepositoryCollaboratorPlugin,
  RepositoryPlugin,
  RepositoryRelationshipPlugin,
  SmartTagPlugin,
  UserPlugin,
} from "lib/graphql/plugins/authorization";
import {
  GitDiffPlugin,
  GitMutationsPlugin,
  GitTypesPlugin,
  RepositoryCreatePlugin,
  RepositoryDeletePlugin,
  RepositoryRenamePlugin,
} from "lib/graphql/plugins/git";
import ObserverPlugin from "lib/graphql/plugins/observer.plugin";
import {
  PullRequestSearchPlugin,
  RepositorySearchPlugin,
} from "lib/graphql/plugins/search";
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
    NoNodeIdMutationsPlugin,
    OrganizationPlugin,
    PrimaryKeyMutationsOnlyPlugin,
    PullRequestPlugin,
    PullRequestCommentPlugin,
    PullRequestReviewPlugin,
    RepositoryPlugin,
    RepositoryCollaboratorPlugin,
    RepositoryRelationshipPlugin,
    SmartTagPlugin,
    UserPlugin,
    // Git GraphQL types and mutations
    GitTypesPlugin,
    GitMutationsPlugin,
    // Git diff exposure (PullRequest / Commit changedFiles + fileDiff)
    GitDiffPlugin,
    RepositoryCreatePlugin,
    // Git storage cleanup on delete (removes the on-disk bare repository)
    RepositoryDeletePlugin,
    // Repository rename (moves the on-disk bare repository with the slug)
    RepositoryRenamePlugin,
    // Search indexing plugins
    RepositorySearchPlugin,
    PullRequestSearchPlugin,
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
