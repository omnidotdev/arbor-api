import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  real,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { generateDefaultDate, generateDefaultId } from "lib/db/util";
import { organizationTable } from "./organization.table";
import { repositoryTable } from "./repository.table";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

/**
 * Repository relationship type table.
 * Defines the types of relationships that can exist between repositories.
 */
export const repositoryRelationshipTypeTable = pgTable(
  "repository_relationship_type",
  {
    id: generateDefaultId(),
    name: text().notNull(),
    description: text(),
    isDirected: boolean().notNull().default(true),
    // null = system-wide type, set = organization-specific custom type
    organizationId: uuid().references(() => organizationTable.id, {
      onDelete: "cascade",
    }),
    createdAt: generateDefaultDate(),
  },
  (table) => [
    uniqueIndex().on(table.id),
    uniqueIndex().on(table.name, table.organizationId),
    index().on(table.organizationId),
  ],
);

export const repositoryRelationshipTypeRelations = relations(
  repositoryRelationshipTypeTable,
  ({ one, many }) => ({
    organization: one(organizationTable, {
      fields: [repositoryRelationshipTypeTable.organizationId],
      references: [organizationTable.id],
    }),
    relationships: many(repositoryRelationshipTable),
  }),
);

export type InsertRepositoryRelationshipType = InferInsertModel<
  typeof repositoryRelationshipTypeTable
>;
export type SelectRepositoryRelationshipType = InferSelectModel<
  typeof repositoryRelationshipTypeTable
>;

/**
 * Repository relationship table.
 * Links repositories together with typed relationships.
 */
export const repositoryRelationshipTable = pgTable(
  "repository_relationship",
  {
    id: generateDefaultId(),
    sourceRepositoryId: uuid()
      .notNull()
      .references(() => repositoryTable.id, { onDelete: "cascade" }),
    targetRepositoryId: uuid()
      .notNull()
      .references(() => repositoryTable.id, { onDelete: "cascade" }),
    relationshipTypeId: uuid()
      .notNull()
      .references(() => repositoryRelationshipTypeTable.id, {
        onDelete: "cascade",
      }),
    detectionSource: text().notNull().default("manual"),
    // confidence score for auto-detected relationships (0.0 - 1.0)
    confidence: real().notNull().default(1.0),
    // optional version constraint (e.g., "^1.0.0", ">=2.0.0")
    versionConstraint: text(),
    // optional branch-specific relationship
    branch: text(),
    createdAt: generateDefaultDate(),
    updatedAt: generateDefaultDate(),
  },
  (table) => [
    uniqueIndex().on(table.id),
    // unique constraint on source + target + type + branch
    uniqueIndex().on(
      table.sourceRepositoryId,
      table.targetRepositoryId,
      table.relationshipTypeId,
      table.branch,
    ),
    index().on(table.sourceRepositoryId),
    index().on(table.targetRepositoryId),
    index().on(table.relationshipTypeId),
  ],
);

export const repositoryRelationshipRelations = relations(
  repositoryRelationshipTable,
  ({ one, many }) => ({
    sourceRepository: one(repositoryTable, {
      fields: [repositoryRelationshipTable.sourceRepositoryId],
      references: [repositoryTable.id],
      relationName: "outgoingRelationships",
    }),
    targetRepository: one(repositoryTable, {
      fields: [repositoryRelationshipTable.targetRepositoryId],
      references: [repositoryTable.id],
      relationName: "incomingRelationships",
    }),
    relationshipType: one(repositoryRelationshipTypeTable, {
      fields: [repositoryRelationshipTable.relationshipTypeId],
      references: [repositoryRelationshipTypeTable.id],
    }),
    metadata: many(repositoryRelationshipMetadataTable),
  }),
);

export type InsertRepositoryRelationship = InferInsertModel<
  typeof repositoryRelationshipTable
>;
export type SelectRepositoryRelationship = InferSelectModel<
  typeof repositoryRelationshipTable
>;

/**
 * Repository relationship metadata table.
 * Flexible key-value storage for relationship-specific data.
 */
export const repositoryRelationshipMetadataTable = pgTable(
  "repository_relationship_metadata",
  {
    id: generateDefaultId(),
    relationshipId: uuid()
      .notNull()
      .references(() => repositoryRelationshipTable.id, {
        onDelete: "cascade",
      }),
    key: text().notNull(),
    value: text().notNull(),
    createdAt: generateDefaultDate(),
  },
  (table) => [
    uniqueIndex().on(table.id),
    uniqueIndex().on(table.relationshipId, table.key),
    index().on(table.relationshipId),
  ],
);

export const repositoryRelationshipMetadataRelations = relations(
  repositoryRelationshipMetadataTable,
  ({ one }) => ({
    relationship: one(repositoryRelationshipTable, {
      fields: [repositoryRelationshipMetadataTable.relationshipId],
      references: [repositoryRelationshipTable.id],
    }),
  }),
);

export type InsertRepositoryRelationshipMetadata = InferInsertModel<
  typeof repositoryRelationshipMetadataTable
>;
export type SelectRepositoryRelationshipMetadata = InferSelectModel<
  typeof repositoryRelationshipMetadataTable
>;

/**
 * External dependency table.
 * Tracks dependencies on packages outside the Arbor ecosystem.
 */
export const externalDependencyTable = pgTable(
  "external_dependency",
  {
    id: generateDefaultId(),
    repositoryId: uuid()
      .notNull()
      .references(() => repositoryTable.id, { onDelete: "cascade" }),
    packageManager: text().notNull(), // "npm", "cargo", "go", "pip", etc.
    packageName: text().notNull(),
    versionConstraint: text(),
    detectionSource: text().notNull().default("manual"),
    createdAt: generateDefaultDate(),
  },
  (table) => [
    uniqueIndex().on(table.id),
    uniqueIndex().on(
      table.repositoryId,
      table.packageManager,
      table.packageName,
    ),
    index().on(table.repositoryId),
    index().on(table.packageManager),
  ],
);

export const externalDependencyRelations = relations(
  externalDependencyTable,
  ({ one }) => ({
    repository: one(repositoryTable, {
      fields: [externalDependencyTable.repositoryId],
      references: [repositoryTable.id],
    }),
  }),
);

export type InsertExternalDependency = InferInsertModel<
  typeof externalDependencyTable
>;
export type SelectExternalDependency = InferSelectModel<
  typeof externalDependencyTable
>;
