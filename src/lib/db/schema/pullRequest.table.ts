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
import { agentTable } from "./agent.table";
import { repositoryTable } from "./repository.table";
import { derivedFrom, readPolicies } from "./rowLevelSecurity";
import { userTable } from "./user.table";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

/**
 * Pull request table.
 */
export const pullRequestTable = pgTable(
  "pull_request",
  {
    id: generateDefaultId(),
    number: integer().notNull(), // PR #1, #2, etc. per repo
    repositoryId: uuid()
      .notNull()
      .references(() => repositoryTable.id, { onDelete: "cascade" }),
    authorId: uuid()
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    // Set when the pull request was authored by an agent (attribution). The
    // human authorId remains the authority; this records the acting agent
    authoredByAgentId: uuid().references(() => agentTable.id, {
      onDelete: "set null",
    }),
    title: text().notNull(),
    description: text(),
    state: text().notNull().default("open"),
    sourceBranch: text().notNull(),
    targetBranch: text().notNull(),
    mergeCommitSha: text(), // Set when merged
    mergedAt: timestamp(),
    mergedById: uuid().references(() => userTable.id),
    closedAt: timestamp(),
    createdAt: generateDefaultDate(),
    updatedAt: generateDefaultDate(),
  },
  (table) => [
    uniqueIndex().on(table.id),
    // unique constraint on repository + number
    uniqueIndex().on(table.repositoryId, table.number),
    index().on(table.repositoryId),
    index().on(table.authorId),
    index().on(table.authoredByAgentId),
    index().on(table.state),
    ...readPolicies("pull_request", derivedFrom("repository_id", "repository")),
  ],
);

/**
 * Pull request review table.
 */
export const pullRequestReviewTable = pgTable(
  "pull_request_review",
  {
    id: generateDefaultId(),
    pullRequestId: uuid()
      .notNull()
      .references(() => pullRequestTable.id, { onDelete: "cascade" }),
    reviewerId: uuid()
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    state: text().notNull().default("pending"),
    body: text(),
    submittedAt: timestamp(),
    createdAt: generateDefaultDate(),
    updatedAt: generateDefaultDate(),
  },
  (table) => [
    uniqueIndex().on(table.id),
    index().on(table.pullRequestId),
    index().on(table.reviewerId),
    ...readPolicies(
      "pull_request_review",
      derivedFrom("pull_request_id", "pull_request"),
    ),
  ],
);

/**
 * Pull request comment table.
 */
export const pullRequestCommentTable = pgTable(
  "pull_request_comment",
  {
    id: generateDefaultId(),
    pullRequestId: uuid()
      .notNull()
      .references(() => pullRequestTable.id, { onDelete: "cascade" }),
    authorId: uuid()
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    body: text().notNull(),
    // For inline comments on diffs
    path: text(), // File path
    line: integer(), // Line number
    side: text(), // "left" or "right" for diff
    commitSha: text(), // Commit the comment refers to
    replyToId: uuid(), // For threaded comments (self-referential)
    createdAt: generateDefaultDate(),
    updatedAt: generateDefaultDate(),
  },
  (table) => [
    uniqueIndex().on(table.id),
    index().on(table.pullRequestId),
    index().on(table.authorId),
    index().on(table.replyToId),
    ...readPolicies(
      "pull_request_comment",
      derivedFrom("pull_request_id", "pull_request"),
    ),
  ],
);

// Relations
export const pullRequestRelations = relations(
  pullRequestTable,
  ({ one, many }) => ({
    repository: one(repositoryTable, {
      fields: [pullRequestTable.repositoryId],
      references: [repositoryTable.id],
    }),
    author: one(userTable, {
      fields: [pullRequestTable.authorId],
      references: [userTable.id],
      relationName: "pullRequestAuthor",
    }),
    authoredByAgent: one(agentTable, {
      fields: [pullRequestTable.authoredByAgentId],
      references: [agentTable.id],
    }),
    mergedBy: one(userTable, {
      fields: [pullRequestTable.mergedById],
      references: [userTable.id],
      relationName: "pullRequestMerger",
    }),
    reviews: many(pullRequestReviewTable),
    comments: many(pullRequestCommentTable),
  }),
);

export const pullRequestReviewRelations = relations(
  pullRequestReviewTable,
  ({ one }) => ({
    pullRequest: one(pullRequestTable, {
      fields: [pullRequestReviewTable.pullRequestId],
      references: [pullRequestTable.id],
    }),
    reviewer: one(userTable, {
      fields: [pullRequestReviewTable.reviewerId],
      references: [userTable.id],
    }),
  }),
);

export const pullRequestCommentRelations = relations(
  pullRequestCommentTable,
  ({ one, many }) => ({
    pullRequest: one(pullRequestTable, {
      fields: [pullRequestCommentTable.pullRequestId],
      references: [pullRequestTable.id],
    }),
    author: one(userTable, {
      fields: [pullRequestCommentTable.authorId],
      references: [userTable.id],
    }),
    replyTo: one(pullRequestCommentTable, {
      fields: [pullRequestCommentTable.replyToId],
      references: [pullRequestCommentTable.id],
      relationName: "commentReplies",
    }),
    replies: many(pullRequestCommentTable, {
      relationName: "commentReplies",
    }),
  }),
);

// Types
export type InsertPullRequest = InferInsertModel<typeof pullRequestTable>;
export type SelectPullRequest = InferSelectModel<typeof pullRequestTable>;
export type InsertPullRequestReview = InferInsertModel<
  typeof pullRequestReviewTable
>;
export type SelectPullRequestReview = InferSelectModel<
  typeof pullRequestReviewTable
>;
export type InsertPullRequestComment = InferInsertModel<
  typeof pullRequestCommentTable
>;
export type SelectPullRequestComment = InferSelectModel<
  typeof pullRequestCommentTable
>;
