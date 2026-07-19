import { relations } from "drizzle-orm";
import { index, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { generateDefaultDate, generateDefaultId } from "lib/db/util";
import { organizationTable } from "./organization.table";
import { repositoryTable, visibility } from "./repository.table";
import { userTable } from "./user.table";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

/**
 * Project table.
 * A project aggregates a group of repositories (polyrepo) under one page. A
 * repository can belong to many projects, so shared libraries surface on every
 * consuming project. Ownership mirrors the repository table (a user, or an
 * organization when organizationId is set).
 */
export const projectTable = pgTable(
  "project",
  {
    id: generateDefaultId(),
    ownerId: uuid()
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    organizationId: uuid().references(() => organizationTable.id, {
      onDelete: "cascade",
    }),
    name: text().notNull(),
    slug: text().notNull(),
    description: text(),
    visibility: visibility().notNull().default("public"),
    createdAt: generateDefaultDate(),
    updatedAt: generateDefaultDate(),
  },
  (table) => [
    uniqueIndex().on(table.id),
    uniqueIndex().on(table.ownerId, table.slug),
    uniqueIndex().on(table.organizationId, table.slug),
    index().on(table.ownerId),
    index().on(table.organizationId),
  ],
);

export const projectRelations = relations(projectTable, ({ one, many }) => ({
  owner: one(userTable, {
    fields: [projectTable.ownerId],
    references: [userTable.id],
  }),
  organization: one(organizationTable, {
    fields: [projectTable.organizationId],
    references: [organizationTable.id],
  }),
  repositories: many(projectRepositoryTable),
}));

export type InsertProject = InferInsertModel<typeof projectTable>;
export type SelectProject = InferSelectModel<typeof projectTable>;

/**
 * Project membership table.
 * Many-to-many link between projects and repositories. A repository may belong
 * to multiple projects (the multi-usage / shared-library case).
 */
export const projectRepositoryTable = pgTable(
  "project_repository",
  {
    id: generateDefaultId(),
    projectId: uuid()
      .notNull()
      .references(() => projectTable.id, { onDelete: "cascade" }),
    repositoryId: uuid()
      .notNull()
      .references(() => repositoryTable.id, { onDelete: "cascade" }),
    createdAt: generateDefaultDate(),
  },
  (table) => [
    uniqueIndex().on(table.id),
    uniqueIndex().on(table.projectId, table.repositoryId),
    index().on(table.projectId),
    index().on(table.repositoryId),
  ],
);

export const projectRepositoryRelations = relations(
  projectRepositoryTable,
  ({ one }) => ({
    project: one(projectTable, {
      fields: [projectRepositoryTable.projectId],
      references: [projectTable.id],
    }),
    repository: one(repositoryTable, {
      fields: [projectRepositoryTable.repositoryId],
      references: [repositoryTable.id],
    }),
  }),
);

export type InsertProjectRepository = InferInsertModel<
  typeof projectRepositoryTable
>;
export type SelectProjectRepository = InferSelectModel<
  typeof projectRepositoryTable
>;
