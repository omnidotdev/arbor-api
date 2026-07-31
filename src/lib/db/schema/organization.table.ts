import { relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { generateDefaultDate, generateDefaultId } from "lib/db/util";
import { repositoryTable } from "./repository.table";
import { organizationVisible, readPolicies } from "./rowLevelSecurity";
import { userTable } from "./user.table";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

/**
 * Organization table.
 *
 * Organization identity (name, slug) is owned by Gatekeeper (IDP).
 * Apps resolve org name/slug from JWT claims, not DB.
 * This table stores only app-specific settings.
 *
 * Tier/entitlements are managed by Aether at the organization level.
 * Use getOrganizationTier() from lib/entitlements for tier checks.
 */
export const organizationTable = pgTable(
  "organization",
  {
    id: generateDefaultId(),
    // FK to IDP organization - this ID matches the IDP organization ID
    // Org name/slug resolved from JWT claims at runtime
    idpOrganizationId: text("idp_organization_id").notNull().unique(),
    // Name and slug are owned by the IDP and mirrored here on session login, so
    // an organization can be displayed and addressed without a live token. They
    // are a cache: absent until the first member signs in
    name: text(),
    slug: text(),
    description: text(),
    avatarUrl: text(),
    // Cached from Aether, synced via webhook
    subscriptionId: text(),
    billingAccountId: text(),
    createdAt: generateDefaultDate(),
    updatedAt: generateDefaultDate(),
    // Soft delete fields - set when IDP organization is deleted
    deletedAt: timestamp("deleted_at"),
    deletionReason: text("deletion_reason"),
  },
  (table) => [
    uniqueIndex().on(table.id),
    index("organization_idp_organization_id_idx").on(table.idpOrganizationId),
    ...readPolicies("organization", organizationVisible),
  ],
);

export const organizationRelations = relations(
  organizationTable,
  ({ many }) => ({
    repositories: many(repositoryTable),
    members: many(organizationMemberTable),
  }),
);

export type InsertOrganization = InferInsertModel<typeof organizationTable>;
export type SelectOrganization = InferSelectModel<typeof organizationTable>;

/**
 * Mirrored organization membership.
 *
 * Membership lives in the IDP and reaches Arbor only through session claims. It
 * is mirrored here on every session resolution so that a personal access token,
 * which carries no claims, can still act on organization repositories. Entries
 * are a cache with a freshness window (see `MEMBERSHIP_TTL_MS`), never a source
 * of truth.
 */
export const organizationMemberTable = pgTable(
  "organization_member",
  {
    id: generateDefaultId(),
    userId: uuid()
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    organizationId: uuid()
      .notNull()
      .references(() => organizationTable.id, { onDelete: "cascade" }),
    // Roles as claimed by the IDP, e.g. ["owner"], ["admin"], ["member"]
    roles: jsonb().$type<string[]>().notNull().default([]),
    // When this membership was last confirmed by a session token
    syncedAt: generateDefaultDate(),
  },
  (table) => [
    uniqueIndex().on(table.userId, table.organizationId),
    index().on(table.userId),
    index().on(table.organizationId),
  ],
);

export const organizationMemberRelations = relations(
  organizationMemberTable,
  ({ one }) => ({
    user: one(userTable, {
      fields: [organizationMemberTable.userId],
      references: [userTable.id],
    }),
    organization: one(organizationTable, {
      fields: [organizationMemberTable.organizationId],
      references: [organizationTable.id],
    }),
  }),
);

export type InsertOrganizationMember = InferInsertModel<
  typeof organizationMemberTable
>;
export type SelectOrganizationMember = InferSelectModel<
  typeof organizationMemberTable
>;
