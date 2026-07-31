import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { generateDefaultDate, generateDefaultId } from "lib/db/util";
import { derivedFrom, readPolicies } from "./rowLevelSecurity";
import { changeTable } from "./stack.table";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

/**
 * Verification check table.
 *
 * A machine-readable, objective verification signal for a change (tests, lint,
 * build, security scan, custom). Unlike a review comment, a required check is a
 * blocking merge gate: a change is mergeable only when every required check has
 * passed. This lets automated and agentic verification scale to high change
 * volume where line-by-line human review cannot, replacing subjective sign-off
 * with objective proof.
 */
export const verificationCheckTable = pgTable(
  "verification_check",
  {
    id: generateDefaultId(),
    changeId: uuid()
      .notNull()
      .references(() => changeTable.id, { onDelete: "cascade" }),
    // check name, e.g. "unit-tests", "lint", "security-scan"
    name: text().notNull(),
    // test, lint, build, security, other
    category: text().notNull().default("other"),
    // pending, running, passed, failed, errored, skipped
    status: text().notNull().default("pending"),
    // a required check must pass before the change can merge (the blocking gate)
    required: boolean().notNull().default(true),
    // machine-readable result summary
    summary: text(),
    detailsUrl: text(),
    createdAt: generateDefaultDate(),
    updatedAt: generateDefaultDate(),
  },
  (table) => [
    uniqueIndex().on(table.id),
    uniqueIndex().on(table.changeId, table.name),
    index().on(table.changeId),
    index().on(table.status),
    ...readPolicies("verification_check", derivedFrom("change_id", "change")),
  ],
);

export const verificationCheckRelations = relations(
  verificationCheckTable,
  ({ one }) => ({
    change: one(changeTable, {
      fields: [verificationCheckTable.changeId],
      references: [changeTable.id],
    }),
  }),
);

export type InsertVerificationCheck = InferInsertModel<
  typeof verificationCheckTable
>;
export type SelectVerificationCheck = InferSelectModel<
  typeof verificationCheckTable
>;
