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
import { agentTable } from "./agent.table";
import { repositoryTable } from "./repository.table";
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
    // When set, this token belongs to an agent (an agent credential) rather than
    // a human. The token still authenticates as userId (the agent's authority),
    // but actions taken with it are attributable to the agent
    agentId: uuid().references(() => agentTable.id, { onDelete: "cascade" }),
    // User-facing label for the token
    name: text().notNull(),
    // SHA-256 hex digest of the plaintext token (never the plaintext itself)
    tokenHash: text().notNull().unique(),
    // Short non-secret prefix for display in the UI (e.g. arbor_pat_ab12)
    tokenPrefix: text().notNull(),
    // Furthest operation the token may perform: "read" or "write". Defaults to
    // "write" so tokens minted before scoping existed keep their full authority
    permission: text().notNull().default("write"),
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
  (table) => [
    uniqueIndex().on(table.tokenHash),
    index().on(table.userId),
    index().on(table.agentId),
  ],
);

/**
 * Repositories a token is confined to.
 *
 * A token with no rows here is not confined and reaches every repository its
 * owning user can reach (the pre-scoping behaviour). Naming repositories is
 * what confines it, which is how an agent credential is prevented from
 * touching anything outside the work it was issued for.
 */
export const personalAccessTokenRepositoryTable = pgTable(
  "personal_access_token_repository",
  {
    id: generateDefaultId(),
    personalAccessTokenId: uuid()
      .notNull()
      .references(() => personalAccessTokenTable.id, { onDelete: "cascade" }),
    repositoryId: uuid()
      .notNull()
      .references(() => repositoryTable.id, { onDelete: "cascade" }),
    createdAt: generateDefaultDate(),
  },
  (table) => [
    uniqueIndex().on(table.personalAccessTokenId, table.repositoryId),
    index().on(table.personalAccessTokenId),
    index().on(table.repositoryId),
  ],
);

export const personalAccessTokenRelations = relations(
  personalAccessTokenTable,
  ({ one, many }) => ({
    user: one(userTable, {
      fields: [personalAccessTokenTable.userId],
      references: [userTable.id],
    }),
    agent: one(agentTable, {
      fields: [personalAccessTokenTable.agentId],
      references: [agentTable.id],
    }),
    repositories: many(personalAccessTokenRepositoryTable),
  }),
);

export const personalAccessTokenRepositoryRelations = relations(
  personalAccessTokenRepositoryTable,
  ({ one }) => ({
    personalAccessToken: one(personalAccessTokenTable, {
      fields: [personalAccessTokenRepositoryTable.personalAccessTokenId],
      references: [personalAccessTokenTable.id],
    }),
    repository: one(repositoryTable, {
      fields: [personalAccessTokenRepositoryTable.repositoryId],
      references: [repositoryTable.id],
    }),
  }),
);

export type InsertPersonalAccessToken = InferInsertModel<
  typeof personalAccessTokenTable
>;
export type SelectPersonalAccessToken = InferSelectModel<
  typeof personalAccessTokenTable
>;
export type InsertPersonalAccessTokenRepository = InferInsertModel<
  typeof personalAccessTokenRepositoryTable
>;
export type SelectPersonalAccessTokenRepository = InferSelectModel<
  typeof personalAccessTokenRepositoryTable
>;
