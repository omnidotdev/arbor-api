import { relations } from "drizzle-orm";
import { index, pgEnum, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";

import { generateDefaultDate } from "lib/db/util";
import { organizationTable } from "./organization.table";
import { userTable } from "./user.table";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export const role = pgEnum("role", ["owner", "admin", "member"]);

/**
 * Organization member junction table.
 */
export const organizationMemberTable = pgTable(
  "organization_member",
  {
    organizationId: uuid()
      .notNull()
      .references(() => organizationTable.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    role: role().notNull().default("member"),
    createdAt: generateDefaultDate(),
    updatedAt: generateDefaultDate(),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.userId] }),
    index().on(table.userId),
    index().on(table.organizationId),
  ],
);

export const organizationMemberRelations = relations(
  organizationMemberTable,
  ({ one }) => ({
    organization: one(organizationTable, {
      fields: [organizationMemberTable.organizationId],
      references: [organizationTable.id],
    }),
    user: one(userTable, {
      fields: [organizationMemberTable.userId],
      references: [userTable.id],
    }),
  }),
);

export type InsertOrganizationMember = InferInsertModel<
  typeof organizationMemberTable
>;
export type SelectOrganizationMember = InferSelectModel<
  typeof organizationMemberTable
>;
