import { existsSync, mkdirSync } from "node:fs";

import { EXPORTABLE, exportSchema } from "graphile-export";
import { makeSchema } from "postgraphile";
import { context, lambda, object, sideEffect } from "postgraphile/grafast";
import { replaceInFile } from "replace-in-file";

import graphilePreset from "lib/config/graphile.config";
import { organizationTable, repositoryTable, userTable } from "lib/db/schema";
import { gitService, repositoryService } from "lib/git";
import {
  BASIC_TIER_MAX_ADMINS,
  BASIC_TIER_MAX_COLLABORATORS,
  BASIC_TIER_MAX_MEMBERS,
  BASIC_TIER_MAX_REPOSITORIES,
  FREE_TIER_MAX_ADMINS,
  FREE_TIER_MAX_COLLABORATORS,
  FREE_TIER_MAX_MEMBERS,
  FREE_TIER_MAX_REPOSITORIES,
  billingBypassSlugs,
} from "lib/graphql/plugins/authorization/constants";
import { getOwnerSlug } from "lib/graphql/plugins/git/GitTypes.plugin";

/**
 * Generate a GraphQL schema from a Postgres database.
 * @see https://postgraphile.org/postgraphile/next/exporting-schema
 */
const generateGraphqlSchema = async () => {
  const { schema } = await makeSchema(graphilePreset);

  const generatedDirectory = `${__dirname}/../generated/graphql`;
  const schemaFilePath = `${generatedDirectory}/schema.executable.ts`;

  // create artifacts directory if it doesn't exist
  if (!existsSync(generatedDirectory))
    mkdirSync(generatedDirectory, {
      recursive: true,
    });

  await exportSchema(schema, schemaFilePath, {
    mode: "typeDefs",
    modules: {
      "graphile-export": { EXPORTABLE },
      "postgraphile/grafast": { context, lambda, object, sideEffect },
      "lib/git": { gitService, repositoryService },
      "lib/db/schema": { organizationTable, repositoryTable, userTable },
      "lib/graphql/plugins/git/GitTypes.plugin": { getOwnerSlug },
      "lib/graphql/plugins/authorization/constants": {
        FREE_TIER_MAX_REPOSITORIES,
        FREE_TIER_MAX_COLLABORATORS,
        FREE_TIER_MAX_MEMBERS,
        FREE_TIER_MAX_ADMINS,
        BASIC_TIER_MAX_REPOSITORIES,
        BASIC_TIER_MAX_COLLABORATORS,
        BASIC_TIER_MAX_MEMBERS,
        BASIC_TIER_MAX_ADMINS,
        billingBypassSlugs,
      },
    },
  });

  await replaceInFile({
    files: schemaFilePath,
    from: /\/\* eslint-disable graphile-export\/export-instances, graphile-export\/export-methods, graphile-export\/export-plans, graphile-export\/exhaustive-deps \*\//g,
    to: "// @ts-nocheck",
  });
};

await generateGraphqlSchema()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
