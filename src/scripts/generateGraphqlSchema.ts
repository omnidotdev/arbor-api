import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import { eq } from "drizzle-orm";
import { EXPORTABLE, exportSchema } from "graphile-export";
import { printSchema } from "graphql";
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
import events from "lib/providers";
import {
  deletePullRequestFromIndex,
  deleteRepositoryFromIndex,
  indexPullRequest,
  indexRepository,
  isSearchEnabled,
} from "lib/search";

const CACHE_DIR = `${__dirname}/../../.cache`;
const HASH_FILE = `${CACHE_DIR}/schema-hash`;
const SCHEMA_DIR = `${__dirname}/../lib/db/schema`;

/**
 * Compute hash of all schema files.
 */
const computeSchemaHash = (): string => {
  const hash = createHash("sha256");

  const files = readdirSync(SCHEMA_DIR, { recursive: true })
    .filter((f): f is string => typeof f === "string" && f.endsWith(".ts"))
    .sort();

  for (const file of files) {
    const content = readFileSync(join(SCHEMA_DIR, file));
    hash.update(file);
    hash.update(content);
  }

  return hash.digest("hex");
};

/**
 * Check if schema has changed since last generation.
 */
const hasSchemaChanged = (): boolean => {
  if (!existsSync(HASH_FILE)) return true;

  const currentHash = computeSchemaHash();
  const storedHash = readFileSync(HASH_FILE, "utf-8").trim();

  return currentHash !== storedHash;
};

/**
 * Generate a GraphQL schema from a Postgres database.
 * @see https://postgraphile.org/postgraphile/next/exporting-schema
 */
const generateGraphqlSchema = async () => {
  // skip if schema unchanged
  if (!hasSchemaChanged()) {
    console.info("[graphql:generate] Schema unchanged, skipping generation");
    return;
  }

  const { schema } = await makeSchema(graphilePreset);

  const generatedDirectory = `${__dirname}/../generated/graphql`;
  const schemaFilePath = `${generatedDirectory}/schema.executable.ts`;

  // create artifacts directory if it doesn't exist
  if (!existsSync(generatedDirectory))
    mkdirSync(generatedDirectory, { recursive: true });

  await exportSchema(schema, schemaFilePath, {
    mode: "typeDefs",
    modules: {
      "graphile-export": { EXPORTABLE },
      "postgraphile/grafast": { context, lambda, object, sideEffect },
      "drizzle-orm": { eq },
      "lib/git": { gitService, repositoryService },
      "lib/db/db": { dbPool },
      "lib/providers": { default: events },
      "lib/db/schema": {
        organizationTable,
        pullRequestTable,
        repositoryTable,
        userTable,
      },
      "lib/entitlements": { isWithinLimit },
      "lib/search": {
        deletePullRequestFromIndex,
        deleteRepositoryFromIndex,
        indexPullRequest,
        indexRepository,
        isSearchEnabled,
      },
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

  // emit SDL
  writeFileSync(`${generatedDirectory}/schema.graphql`, printSchema(schema));

  // save hash
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(HASH_FILE, computeSchemaHash());

  console.info("[graphql:generate] Schema generated successfully");
};

await generateGraphqlSchema()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
