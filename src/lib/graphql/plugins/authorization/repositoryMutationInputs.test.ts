import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { REPOSITORY_MUTATION_INPUTS } from "./Repository.plugin";

const schema = readFileSync(
  join(import.meta.dir, "../../../../generated/graphql/schema.graphql"),
  "utf8",
);

/** Field names of a GraphQL input type in the generated schema */
const inputFields = (typeName: string): string[] => {
  const match = schema.match(
    new RegExp(`\\ninput ${typeName} \\{([\\s\\S]*?)\\n\\}`),
  );
  if (!match?.[1]) throw new Error(`input ${typeName} not in schema.graphql`);
  return [...match[1].matchAll(/^ {2}(\w+):/gm)].map((m) => m[1] as string);
};

describe("repository mutation guards", () => {
  // A guard reading a field its input lacks fails every call of the mutation
  // (deleteRepository read `patch` and could never succeed)
  for (const [mutation, fields] of Object.entries(REPOSITORY_MUTATION_INPUTS)) {
    test(`${mutation} reads only fields its input has`, () => {
      const typeName = `${mutation[0]?.toUpperCase()}${mutation.slice(1)}Input`;
      const available = inputFields(typeName);
      expect(available).toContain(fields.rowId);
      if (fields.patch) expect(available).toContain(fields.patch);
    });
  }

  test("only update reads a patch", () => {
    expect(inputFields("DeleteRepositoryInput")).not.toContain("patch");
    expect(inputFields("RenameRepositoryInput")).not.toContain("patch");
    expect(REPOSITORY_MUTATION_INPUTS.deleteRepository.patch).toBeNull();
    expect(REPOSITORY_MUTATION_INPUTS.renameRepository.patch).toBeNull();
  });
});
