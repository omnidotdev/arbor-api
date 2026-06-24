import { relations } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { generateDefaultDate, generateDefaultId } from "lib/db/util";
import { repositoryTable } from "./repository.table";

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
  ],
);

export const organizationRelations = relations(
  organizationTable,
  ({ many }) => ({
    repositories: many(repositoryTable),
  }),
);

export type InsertOrganization = InferInsertModel<typeof organizationTable>;
export type SelectOrganization = InferSelectModel<typeof organizationTable>;
