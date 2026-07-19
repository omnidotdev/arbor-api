import { relations } from "drizzle-orm";
import { index, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { generateDefaultDate, generateDefaultId } from "lib/db/util";
import { organizationTable } from "./organization.table";
import { userTable } from "./user.table";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

/**
 * Agent table.
 *
 * A first-class non-human actor that drives the forge (distinct from a user).
 * An agent is registered by a user or organization, carries provenance metadata
 * (model, vendor) so agent-authored change is attributable, and is the identity
 * that scoped access tokens and pull request attribution point at. Keeping the
 * agent separate from the user answers the two questions an agent forge must
 * answer: which actor produced a change, and under whose authority.
 */
export const agentTable = pgTable(
  "agent",
  {
    id: generateDefaultId(),
    // the user that registered/owns the agent
    ownerId: uuid()
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    // set when the agent belongs to an organization workspace
    organizationId: uuid().references(() => organizationTable.id, {
      onDelete: "cascade",
    }),
    name: text().notNull(),
    slug: text().notNull(),
    description: text(),
    // provenance metadata, e.g. "claude-opus-4-8"
    model: text(),
    // provenance metadata, e.g. "anthropic"
    vendor: text(),
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

export const agentRelations = relations(agentTable, ({ one }) => ({
  owner: one(userTable, {
    fields: [agentTable.ownerId],
    references: [userTable.id],
  }),
  organization: one(organizationTable, {
    fields: [agentTable.organizationId],
    references: [organizationTable.id],
  }),
}));

export type InsertAgent = InferInsertModel<typeof agentTable>;
export type SelectAgent = InferSelectModel<typeof agentTable>;
