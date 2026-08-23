import {
  boolean,
  jsonb,
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
 * A user's application to the arbor closed beta. arbor's own source of truth for
 * its testers: a row with status `approved` is what puts the user on the beta
 * whitelist (see lib/beta/whitelist). One active application per user; a declined
 * applicant may re-apply (the same row is reset to pending on resubmit).
 */
export const testerApplicationTable = pgTable(
  "tester_application",
  {
    id: generateDefaultId(),
    userId: uuid()
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    // free-form product form fields (use case, stack, team size, links, notes)
    answers: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    // pending | approved | declined  (validated in app code, not a pgEnum)
    status: text().notNull().default("pending"),
    reviewerNote: text(),
    ndaAccepted: boolean().notNull().default(false),
    ndaVersion: text(),
    ndaAcceptedAt: timestamp(),
    createdAt: generateDefaultDate(),
    updatedAt: generateDefaultDate(),
  },
  (table) => [uniqueIndex().on(table.id), uniqueIndex().on(table.userId)],
);

export type InsertTesterApplication = InferInsertModel<
  typeof testerApplicationTable
>;
export type SelectTesterApplication = InferSelectModel<
  typeof testerApplicationTable
>;
