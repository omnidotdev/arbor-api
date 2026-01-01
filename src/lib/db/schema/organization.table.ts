import { relations } from "drizzle-orm";
import { pgEnum, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

import { generateDefaultDate, generateDefaultId } from "lib/db/util";
import { organizationMemberTable } from "./organizationMember.table";
import { repositoryTable } from "./repository.table";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export const tier = pgEnum("tier", ["free", "basic", "team"]);

/**
 * Organization table.
 */
export const organizationTable = pgTable(
  "organization",
  {
    id: generateDefaultId(),
    name: text().notNull(),
    slug: text().unique().notNull(),
    description: text(),
    avatarUrl: text(),
    tier: tier().notNull().default("free"),
    stripeCustomerId: text(),
    stripeSubscriptionId: text(),
    createdAt: generateDefaultDate(),
    updatedAt: generateDefaultDate(),
  },
  (table) => [uniqueIndex().on(table.id), uniqueIndex().on(table.slug)],
);

export const organizationRelations = relations(
  organizationTable,
  ({ many }) => ({
    organizationMembers: many(organizationMemberTable),
    repositories: many(repositoryTable),
  }),
);

export type InsertOrganization = InferInsertModel<typeof organizationTable>;
export type SelectOrganization = InferSelectModel<typeof organizationTable>;
