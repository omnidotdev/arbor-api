import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { generateDefaultDate, generateDefaultId } from "lib/db/util";
import { agentTable } from "./agent.table";
import { pullRequestTable } from "./pullRequest.table";
import { repositoryTable } from "./repository.table";
import { userTable } from "./user.table";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

/**
 * Stack table.
 *
 * A stack is an ordered series of small, dependent changes on a base branch, the
 * agent-native unit of review and merge. Instead of one large branch-based pull
 * request, work is broken into changes that build on each other so review and
 * merge are incremental and parallelizable, which is what keeps high-volume
 * (often agent-authored) change landing without giant blocking pull requests.
 */
export const stackTable = pgTable(
  "stack",
  {
    id: generateDefaultId(),
    repositoryId: uuid()
      .notNull()
      .references(() => repositoryTable.id, { onDelete: "cascade" }),
    authorId: uuid()
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    // set when the stack was authored by an agent (attribution)
    authoredByAgentId: uuid().references(() => agentTable.id, {
      onDelete: "set null",
    }),
    title: text().notNull(),
    description: text(),
    baseBranch: text().notNull().default("master"),
    // open, merged, abandoned
    status: text().notNull().default("open"),
    createdAt: generateDefaultDate(),
    updatedAt: generateDefaultDate(),
  },
  (table) => [
    uniqueIndex().on(table.id),
    index().on(table.repositoryId),
    index().on(table.authorId),
    index().on(table.status),
  ],
);

export const stackRelations = relations(stackTable, ({ one, many }) => ({
  repository: one(repositoryTable, {
    fields: [stackTable.repositoryId],
    references: [repositoryTable.id],
  }),
  author: one(userTable, {
    fields: [stackTable.authorId],
    references: [userTable.id],
  }),
  authoredByAgent: one(agentTable, {
    fields: [stackTable.authoredByAgentId],
    references: [agentTable.id],
  }),
  changes: many(changeTable),
}));

export type InsertStack = InferInsertModel<typeof stackTable>;
export type SelectStack = InferSelectModel<typeof stackTable>;

/**
 * Change table.
 *
 * A single logical change (one commit, the unit of review), belonging to a
 * stack. `parentChangeId` links a change to the change it builds on, forming the
 * stack as a dependency graph rather than a flat list: a change cannot merge
 * until its parent lands, and amending an ancestor restacks its descendants.
 * `position` is the bottom-up order within the stack. A change may optionally map
 * to a pull request for review threads.
 */
export const changeTable = pgTable(
  "change",
  {
    id: generateDefaultId(),
    stackId: uuid()
      .notNull()
      .references(() => stackTable.id, { onDelete: "cascade" }),
    repositoryId: uuid()
      .notNull()
      .references(() => repositoryTable.id, { onDelete: "cascade" }),
    // the change this one builds on (self-referential, app-enforced); null for
    // the bottom change of a stack
    parentChangeId: uuid(),
    // the current commit for this change
    commitSha: text(),
    // the head ref that carries this change
    headBranch: text(),
    title: text().notNull(),
    description: text(),
    // bottom-up order within the stack
    position: integer().notNull().default(0),
    // open, merged, abandoned
    status: text().notNull().default("open"),
    // optional linkage to a pull request for review threads
    pullRequestId: uuid().references(() => pullRequestTable.id, {
      onDelete: "set null",
    }),
    createdAt: generateDefaultDate(),
    updatedAt: generateDefaultDate(),
  },
  (table) => [
    uniqueIndex().on(table.id),
    index().on(table.stackId),
    index().on(table.repositoryId),
    index().on(table.parentChangeId),
    index().on(table.status),
  ],
);

export const changeRelations = relations(changeTable, ({ one }) => ({
  stack: one(stackTable, {
    fields: [changeTable.stackId],
    references: [stackTable.id],
  }),
  repository: one(repositoryTable, {
    fields: [changeTable.repositoryId],
    references: [repositoryTable.id],
  }),
  pullRequest: one(pullRequestTable, {
    fields: [changeTable.pullRequestId],
    references: [pullRequestTable.id],
  }),
}));

export type InsertChange = InferInsertModel<typeof changeTable>;
export type SelectChange = InferSelectModel<typeof changeTable>;
