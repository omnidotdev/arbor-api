import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import { printSchema } from "graphql";
import { makeSchema } from "postgraphile";

import graphilePreset from "lib/config/graphile.config";

const CACHE_DIR = `${__dirname}/../../.cache`;
const HASH_FILE = `${CACHE_DIR}/schema-hash`;

/**
 * Directories whose contents determine the emitted SDL.
 *
 * The Drizzle tables are the obvious input, but they are not the only one: the
 * Graphile plugins decide what is emitted from those tables, so a smart tag that
 * removes an accessor changes the SDL without touching a table. Hashing only the
 * tables left those changes unable to invalidate the cache, so `schema.graphql`
 * silently kept the removed fields, and client codegen kept generating them.
 */
const SOURCE_DIRS = [
  `${__dirname}/../lib/db/schema`,
  `${__dirname}/../lib/graphql`,
  `${__dirname}/../lib/config`,
];

/**
 * Compute hash of every source file the emitted schema depends on.
 */
const computeSchemaHash = (): string => {
  const hash = createHash("sha256");

  for (const directory of SOURCE_DIRS) {
    const files = readdirSync(directory, { recursive: true })
      .filter((f): f is string => typeof f === "string" && f.endsWith(".ts"))
      .sort();

    for (const file of files) {
      const content = readFileSync(join(directory, file));
      hash.update(directory);
      hash.update(file);
      hash.update(content);
    }
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
 *
 * Builds the schema in-process via `makeSchema(graphilePreset)`, then writes the
 * introspected SDL to `schema.graphql` (consumed by client codegen). The server builds
 * the schema the same way at boot, so no serialized executable artifact is required.
 * @see https://postgraphile.org/postgraphile/next/schema-export
 */
const generateGraphqlSchema = async () => {
  // skip if schema unchanged
  if (!hasSchemaChanged()) {
    console.info("[graphql:generate] Schema unchanged, skipping generation");
    return;
  }

  const { schema } = await makeSchema(graphilePreset);

  const generatedDirectory = `${__dirname}/../generated/graphql`;

  // create artifacts directory if it doesn't exist
  if (!existsSync(generatedDirectory))
    mkdirSync(generatedDirectory, { recursive: true });

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
