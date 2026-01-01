import { relations } from "drizzle-orm";
import { index, pgEnum, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";

import { generateDefaultDate } from "lib/db/util";
import { repositoryTable } from "./repository.table";
import { userTable } from "./user.table";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export const permission = pgEnum("permission", ["read", "write", "admin"]);

/**
 * Repository collaborator junction table.
 */
export const repositoryCollaboratorTable = pgTable(
  "repository_collaborator",
  {
    repositoryId: uuid()
      .notNull()
      .references(() => repositoryTable.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    permission: permission().notNull().default("read"),
    createdAt: generateDefaultDate(),
    updatedAt: generateDefaultDate(),
  },
  (table) => [
    primaryKey({ columns: [table.repositoryId, table.userId] }),
    index().on(table.userId),
    index().on(table.repositoryId),
  ],
);

export const repositoryCollaboratorRelations = relations(
  repositoryCollaboratorTable,
  ({ one }) => ({
    repository: one(repositoryTable, {
      fields: [repositoryCollaboratorTable.repositoryId],
      references: [repositoryTable.id],
    }),
    user: one(userTable, {
      fields: [repositoryCollaboratorTable.userId],
      references: [userTable.id],
    }),
  }),
);

export type InsertRepositoryCollaborator = InferInsertModel<
  typeof repositoryCollaboratorTable
>;
export type SelectRepositoryCollaborator = InferSelectModel<
  typeof repositoryCollaboratorTable
>;
