import { relations } from "drizzle-orm";
import { index, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { generateDefaultDate, generateDefaultId } from "lib/db/util";
import { organizationTable } from "./organization.table";
import { repositoryTable } from "./repository.table";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

/**
 * Repository redirect: a path a repository used to live at.
 *
 * A repository is addressed (and stored) as `{ownerUsername}/{slug}`. Moving
 * it to another owner, as a transfer between organizations does, changes that
 * path, which would break every clone URL and remote pointing at the old one.
 * Each row keeps an old path serving the repository it moved to. A repository
 * that actually lives at a path always wins over a redirect for it, so a
 * redirect can never shadow a real repository. Written by the server only
 */
export const repositoryRedirectTable = pgTable(
  "repository_redirect",
  {
    id: generateDefaultId(),
    // The old path's owner username and slug
    ownerUsername: text().notNull(),
    slug: text().notNull(),
    // The organization the repository belonged to at the old path, so links
    // into that organization can be redirected too
    organizationId: uuid().references(() => organizationTable.id, {
      onDelete: "set null",
    }),
    repositoryId: uuid()
      .notNull()
      .references(() => repositoryTable.id, { onDelete: "cascade" }),
    createdAt: generateDefaultDate(),
  },
  (table) => [
    uniqueIndex().on(table.id),
    uniqueIndex().on(table.ownerUsername, table.slug),
    index().on(table.repositoryId),
    index().on(table.organizationId, table.slug),
  ],
);

export const repositoryRedirectRelations = relations(
  repositoryRedirectTable,
  ({ one }) => ({
    repository: one(repositoryTable, {
      fields: [repositoryRedirectTable.repositoryId],
      references: [repositoryTable.id],
    }),
  }),
);

export type InsertRepositoryRedirect = InferInsertModel<
  typeof repositoryRedirectTable
>;
export type SelectRepositoryRedirect = InferSelectModel<
  typeof repositoryRedirectTable
>;
