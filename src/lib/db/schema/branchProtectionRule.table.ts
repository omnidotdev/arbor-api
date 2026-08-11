import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { generateDefaultDate, generateDefaultId } from "lib/db/util";
import { repositoryTable } from "./repository.table";
import { derivedFrom, readPolicies } from "./rowLevelSecurity";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

/**
 * Branch protection rule table.
 *
 * A per-branch policy layer on top of the per-change merge gate. A rule names a
 * branch glob (same semantics as the push credential boundary) and the
 * conditions a change must meet before it may land on a matching branch:
 * required approving reviews and/or all required verification checks passing.
 * Enforced server-side at the merge queue (see lib/branchProtection); the rule
 * itself is pure policy, not a secret, but is scoped to repository visibility.
 */
export const branchProtectionRuleTable = pgTable(
  "branch_protection_rule",
  {
    id: generateDefaultId(),
    repositoryId: uuid()
      .notNull()
      .references(() => repositoryTable.id, { onDelete: "cascade" }),
    // branch-name glob, e.g. "main", "release/*", "**"
    refPattern: text().notNull(),
    // minimum approving reviews before a change may land
    requiredApprovals: integer().notNull().default(0),
    // require every required verification check to have passed
    requirePassingChecks: boolean().notNull().default(true),
    createdAt: generateDefaultDate(),
    updatedAt: generateDefaultDate(),
  },
  (table) => [
    uniqueIndex().on(table.id),
    // one rule per pattern per repository
    uniqueIndex().on(table.repositoryId, table.refPattern),
    index().on(table.repositoryId),
    ...readPolicies(
      "branch_protection_rule",
      derivedFrom("repository_id", "repository"),
    ),
  ],
);

export const branchProtectionRuleRelations = relations(
  branchProtectionRuleTable,
  ({ one }) => ({
    repository: one(repositoryTable, {
      fields: [branchProtectionRuleTable.repositoryId],
      references: [repositoryTable.id],
    }),
  }),
);

export type InsertBranchProtectionRule = InferInsertModel<
  typeof branchProtectionRuleTable
>;
export type SelectBranchProtectionRule = InferSelectModel<
  typeof branchProtectionRuleTable
>;
