import { existsSync, mkdirSync } from "node:fs";

import { eq } from "drizzle-orm";
import { EXPORTABLE, exportSchema } from "graphile-export";
import { makeSchema } from "postgraphile";
import { context, lambda, object, sideEffect } from "postgraphile/grafast";
import { replaceInFile } from "replace-in-file";

import graphilePreset from "lib/config/graphile.config";
import { dbPool } from "lib/db/db";
import {
  organizationTable,
  pullRequestTable,
  repositoryTable,
  userTable,
} from "lib/db/schema";
import { isWithinLimit } from "lib/entitlements";
import { gitService, repositoryService } from "lib/git";
import {
  FEATURE_KEYS,
  billingBypassOrgIds,
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
      "drizzle-orm": { eq },
      "lib/git": { gitService, repositoryService },
      "lib/db/db": { dbPool },
      "lib/db/schema": {
        organizationTable,
        pullRequestTable,
        repositoryTable,
        userTable,
      },
      "lib/entitlements": { isWithinLimit },
      "lib/graphql/plugins/git/GitTypes.plugin": { getOwnerSlug },
      "lib/graphql/plugins/authorization/constants": {
        FEATURE_KEYS,
        billingBypassOrgIds,
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
