import { relations } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { generateDefaultDate, generateDefaultId } from "lib/db/util";
import { userTable } from "./user.table";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

/**
 * Personal access token table.
 *
 * Backs GitHub-style HTTPS git credentials: a user authenticates git over
 * Smart-HTTP with their username and a token as the Basic-auth password.
 *
 * Only the SHA-256 hash of each token is stored; the plaintext is returned
 * exactly once at creation and is never persisted or retrievable again.
 */
export const personalAccessTokenTable = pgTable(
  "personal_access_token",
  {
    id: generateDefaultId(),
    userId: uuid()
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    // User-facing label for the token
    name: text().notNull(),
    // SHA-256 hex digest of the plaintext token (never the plaintext itself)
    tokenHash: text().notNull().unique(),
    // Short non-secret prefix for display in the UI (e.g. arbor_pat_ab12)
    tokenPrefix: text().notNull(),
    lastUsedAt: timestamp({
      precision: 6,
      mode: "string",
      withTimezone: true,
    }),
    expiresAt: timestamp({
      precision: 6,
      mode: "string",
      withTimezone: true,
    }),
    createdAt: generateDefaultDate(),
  },
  (table) => [uniqueIndex().on(table.tokenHash), index().on(table.userId)],
);

export const personalAccessTokenRelations = relations(
  personalAccessTokenTable,
  ({ one }) => ({
    user: one(userTable, {
      fields: [personalAccessTokenTable.userId],
      references: [userTable.id],
    }),
  }),
);

export type InsertPersonalAccessToken = InferInsertModel<
  typeof personalAccessTokenTable
>;
export type SelectPersonalAccessToken = InferSelectModel<
  typeof personalAccessTokenTable
>;
