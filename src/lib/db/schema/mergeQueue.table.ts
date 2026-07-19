import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { generateDefaultDate, generateDefaultId } from "lib/db/util";
import { pullRequestTable } from "./pullRequest.table";
import { repositoryTable } from "./repository.table";
import { stackTable } from "./stack.table";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

/**
 * Merge batch table.
 *
 * A batch groups several queued entries into one speculative branch so their
 * combined result is validated by a single CI run instead of one run per entry.
 * On failure the batch is bisected to isolate the culprit, so a run of green
 * changes still lands cheaply. This is what keeps redundant CI from exploding as
 * many concurrent (often agent-authored) changes queue to merge.
 */
export const mergeBatchTable = pgTable(
  "merge_batch",
  {
    id: generateDefaultId(),
    repositoryId: uuid()
      .notNull()
      .references(() => repositoryTable.id, { onDelete: "cascade" }),
    // the temporary branch the batched entries are speculatively merged onto
    speculativeBranch: text(),
    // pending, running, passed, failed
    ciStatus: text().notNull().default("pending"),
    createdAt: generateDefaultDate(),
    updatedAt: generateDefaultDate(),
  },
  (table) => [
    uniqueIndex().on(table.id),
    index().on(table.repositoryId),
    index().on(table.ciStatus),
  ],
);

export const mergeBatchRelations = relations(
  mergeBatchTable,
  ({ one, many }) => ({
    repository: one(repositoryTable, {
      fields: [mergeBatchTable.repositoryId],
      references: [repositoryTable.id],
    }),
    entries: many(mergeQueueEntryTable),
  }),
);

export type InsertMergeBatch = InferInsertModel<typeof mergeBatchTable>;
export type SelectMergeBatch = InferSelectModel<typeof mergeBatchTable>;

/**
 * Merge queue entry table.
 *
 * The queue is the safe serialization point for merges: entries are validated in
 * order (optionally batched) so trunk stays green even when two independently
 * passing changes conflict once combined. An entry references a stack (the
 * stack-aware unit) or a pull request (the bridge to the existing review model).
 * The queue can be partitioned by the project dependency graph's blast radius so
 * changes that touch disjoint code merge in parallel.
 */
export const mergeQueueEntryTable = pgTable(
  "merge_queue_entry",
  {
    id: generateDefaultId(),
    repositoryId: uuid()
      .notNull()
      .references(() => repositoryTable.id, { onDelete: "cascade" }),
    // a queued stack (preferred) ...
    stackId: uuid().references(() => stackTable.id, { onDelete: "cascade" }),
    // ... or a queued pull request (bridge to the existing review model)
    pullRequestId: uuid().references(() => pullRequestTable.id, {
      onDelete: "cascade",
    }),
    batchId: uuid().references(() => mergeBatchTable.id, {
      onDelete: "set null",
    }),
    // queued, testing, optimistic, merged, evicted
    state: text().notNull().default("queued"),
    // order within the queue
    position: integer().notNull().default(0),
    targetBranch: text().notNull().default("master"),
    enqueuedAt: timestamp({
      precision: 6,
      mode: "string",
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    createdAt: generateDefaultDate(),
    updatedAt: generateDefaultDate(),
  },
  (table) => [
    uniqueIndex().on(table.id),
    index().on(table.repositoryId),
    index().on(table.stackId),
    index().on(table.pullRequestId),
    index().on(table.batchId),
    index().on(table.state),
  ],
);

export const mergeQueueEntryRelations = relations(
  mergeQueueEntryTable,
  ({ one }) => ({
    repository: one(repositoryTable, {
      fields: [mergeQueueEntryTable.repositoryId],
      references: [repositoryTable.id],
    }),
    stack: one(stackTable, {
      fields: [mergeQueueEntryTable.stackId],
      references: [stackTable.id],
    }),
    pullRequest: one(pullRequestTable, {
      fields: [mergeQueueEntryTable.pullRequestId],
      references: [pullRequestTable.id],
    }),
    batch: one(mergeBatchTable, {
      fields: [mergeQueueEntryTable.batchId],
      references: [mergeBatchTable.id],
    }),
  }),
);

export type InsertMergeQueueEntry = InferInsertModel<
  typeof mergeQueueEntryTable
>;
export type SelectMergeQueueEntry = InferSelectModel<
  typeof mergeQueueEntryTable
>;
