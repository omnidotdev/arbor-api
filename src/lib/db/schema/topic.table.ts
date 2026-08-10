import { relations } from "drizzle-orm";
import { index, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { generateDefaultDate, generateDefaultId } from "lib/db/util";
import { organizationTable } from "./organization.table";
import { pullRequestTable } from "./pullRequest.table";
import { userTable } from "./user.table";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

/**
 * Topic table.
 *
 * A topic is a cross-repository change set: it groups pull requests across
 * several repositories so they can be reasoned about, and eventually submitted,
 * as one all-or-nothing unit (the "Arbor topic", Gerrit-style). This is the
 * primitive an agent uses to land a library change and its consumer updates
 * together. Ownership mirrors repositories and projects (a user, or an
 * organization when organizationId is set).
 */
export const topicTable = pgTable(
  "topic",
  {
    id: generateDefaultId(),
    ownerId: uuid()
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    organizationId: uuid().references(() => organizationTable.id, {
      onDelete: "cascade",
    }),
    title: text().notNull(),
    description: text(),
    // open (assembling), submitted (landed all-or-nothing), abandoned
    status: text().notNull().default("open"),
    createdAt: generateDefaultDate(),
    updatedAt: generateDefaultDate(),
  },
  (table) => [
    uniqueIndex().on(table.id),
    index().on(table.ownerId),
    index().on(table.organizationId),
    index().on(table.status),
  ],
);

export const topicRelations = relations(topicTable, ({ one, many }) => ({
  owner: one(userTable, {
    fields: [topicTable.ownerId],
    references: [userTable.id],
  }),
  organization: one(organizationTable, {
    fields: [topicTable.organizationId],
    references: [organizationTable.id],
  }),
  pullRequests: many(topicPullRequestTable),
}));

export type InsertTopic = InferInsertModel<typeof topicTable>;
export type SelectTopic = InferSelectModel<typeof topicTable>;

/**
 * Topic membership table.
 *
 * Links a topic to the pull requests that make it up, across repositories. A
 * pull request can belong to at most one topic per (topic, pull request) pair.
 */
export const topicPullRequestTable = pgTable(
  "topic_pull_request",
  {
    id: generateDefaultId(),
    topicId: uuid()
      .notNull()
      .references(() => topicTable.id, { onDelete: "cascade" }),
    pullRequestId: uuid()
      .notNull()
      .references(() => pullRequestTable.id, { onDelete: "cascade" }),
    createdAt: generateDefaultDate(),
  },
  (table) => [
    uniqueIndex().on(table.id),
    uniqueIndex().on(table.topicId, table.pullRequestId),
    index().on(table.topicId),
    index().on(table.pullRequestId),
  ],
);

export const topicPullRequestRelations = relations(
  topicPullRequestTable,
  ({ one }) => ({
    topic: one(topicTable, {
      fields: [topicPullRequestTable.topicId],
      references: [topicTable.id],
    }),
    pullRequest: one(pullRequestTable, {
      fields: [topicPullRequestTable.pullRequestId],
      references: [pullRequestTable.id],
    }),
  }),
);

export type InsertTopicPullRequest = InferInsertModel<
  typeof topicPullRequestTable
>;
export type SelectTopicPullRequest = InferSelectModel<
  typeof topicPullRequestTable
>;
