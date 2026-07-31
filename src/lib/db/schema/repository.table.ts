import { relations } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { generateDefaultDate, generateDefaultId } from "lib/db/util";
import { organizationTable } from "./organization.table";
import { repositoryCollaboratorTable } from "./repositoryCollaborator.table";
import {
  externalDependencyTable,
  repositoryRelationshipTable,
} from "./repositoryRelationship.table";
import { readPolicies, repositoryVisible } from "./rowLevelSecurity";
import { userTable } from "./user.table";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export const visibility = pgEnum("visibility", ["public", "private"]);

/**
 * Repository table.
 */
export const repositoryTable = pgTable(
  "repository",
  {
    id: generateDefaultId(),
    // owner can be either a user or an organization
    ownerId: uuid()
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    // if organizationId is set, the repository belongs to an organization
    organizationId: uuid().references(() => organizationTable.id, {
      onDelete: "cascade",
    }),
    name: text().notNull(),
    slug: text().notNull(),
    description: text(),
    visibility: visibility().notNull().default("public"),
    defaultBranch: text().notNull().default("master"),
    createdAt: generateDefaultDate(),
    updatedAt: generateDefaultDate(),
  },
  (table) => [
    uniqueIndex().on(table.id),
    // unique constraint on owner + slug (user repos)
    uniqueIndex().on(table.ownerId, table.slug),
    // unique constraint on organization + slug (org repos)
    uniqueIndex().on(table.organizationId, table.slug),
    index().on(table.ownerId),
    index().on(table.organizationId),
    ...readPolicies("repository", repositoryVisible),
  ],
);

export const repositoryRelations = relations(
  repositoryTable,
  ({ one, many }) => ({
    owner: one(userTable, {
      fields: [repositoryTable.ownerId],
      references: [userTable.id],
    }),
    organization: one(organizationTable, {
      fields: [repositoryTable.organizationId],
      references: [organizationTable.id],
    }),
    collaborators: many(repositoryCollaboratorTable),
    // polyrepo graph relationships
    outgoingRelationships: many(repositoryRelationshipTable, {
      relationName: "outgoingRelationships",
    }),
    incomingRelationships: many(repositoryRelationshipTable, {
      relationName: "incomingRelationships",
    }),
    externalDependencies: many(externalDependencyTable),
  }),
);

export type InsertRepository = InferInsertModel<typeof repositoryTable>;
export type SelectRepository = InferSelectModel<typeof repositoryTable>;
