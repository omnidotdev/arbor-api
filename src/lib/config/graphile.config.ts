import { PgAggregatesPreset } from "@graphile/pg-aggregates";
import { PgSimplifyInflectionPreset } from "@graphile/simplify-inflection";
import { makePgService } from "postgraphile/adaptors/pg";
import { PostGraphileAmberPreset } from "postgraphile/presets/amber";
import { PostGraphileConnectionFilterPreset } from "postgraphile-plugin-connection-filter";

import { pgSubscriber } from "lib/db/pubsub";
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
  RepositoryDefaultBranchPlugin,
  RepositoryDeletePlugin,
  RepositoryRenamePlugin,
} from "lib/graphql/plugins/git";
import ObserverPlugin from "lib/graphql/plugins/observer.plugin";
import {
  PersonalAccessTokenCreatePlugin,
  PersonalAccessTokenPlugin,
} from "lib/graphql/plugins/personalAccessToken";
import {
  PullRequestSearchPlugin,
  RepositorySearchPlugin,
} from "lib/graphql/plugins/search";
import { PullRequestCommentSubscriptionPlugin } from "lib/graphql/plugins/subscriptions";
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
    // Personal access tokens (git HTTPS credentials)
    PersonalAccessTokenPlugin,
    PersonalAccessTokenCreatePlugin,
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
    // Sync the on-disk HEAD when a repository's default branch changes
    RepositoryDefaultBranchPlugin,
    // Search indexing plugins
    RepositorySearchPlugin,
    PullRequestSearchPlugin,
    // Realtime: push pull request comment changes via Postgres LISTEN/NOTIFY
    PullRequestCommentSubscriptionPlugin,
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
  pgServices: [
    makePgService({
      connectionString: DATABASE_URL,
      // LISTEN/NOTIFY subscriber for GraphQL subscriptions. This app supplies
      // its own context function, so the subscriber is also injected onto the
      // context in createGraphqlContext (that is what the `listen` step reads)
      pgSubscriber,
    }),
  ],
  grafast: { explain: isDevEnv },
};

export default graphilePreset;
