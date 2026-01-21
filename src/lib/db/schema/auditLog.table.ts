import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";

import { generateDefaultDate, generateDefaultId } from "lib/db/util";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

/**
 * Audit event types for authorization decisions.
 */
export const auditEventTypeEnum = pgEnum("audit_event_type", [
  "permission_check",
  "permission_denied",
  "resource_create",
  "resource_update",
  "resource_delete",
  "authentication",
  "circuit_breaker",
]);

/**
 * Audit log table for tracking authorization decisions and security events.
 *
 * Designed for compliance, forensics, and security monitoring.
 * Uses append-only pattern - records should never be updated or deleted.
 */
export const auditLogTable = pgTable(
  "audit_log",
  {
    id: generateDefaultId(),
    /** Event type */
    eventType: auditEventTypeEnum().notNull(),
    /** User ID (null for system events) */
    userId: uuid(),
    /** User's IDP ID for cross-system correlation */
    idpUserId: uuid(),
    /** Resource type (e.g., "repository", "organization") */
    resourceType: text(),
    /** Resource ID */
    resourceId: uuid(),
    /** Permission/action being checked or performed */
    action: text(),
    /** Whether the action was allowed */
    allowed: boolean(),
    /** Request duration in milliseconds */
    durationMs: integer(),
    /** IP address of the request */
    ipAddress: text(),
    /** User agent string */
    userAgent: text(),
    /** Additional context (e.g., error messages, request details) */
    metadata: jsonb().$type<Record<string, unknown>>(),
    /** Timestamp of the event */
    createdAt: generateDefaultDate(),
  },
  (table) => [
    index("audit_log_user_id_idx").on(table.userId),
    index("audit_log_resource_idx").on(table.resourceType, table.resourceId),
    index("audit_log_event_type_idx").on(table.eventType),
    index("audit_log_created_at_idx").on(table.createdAt),
  ],
);

export type InsertAuditLog = InferInsertModel<typeof auditLogTable>;
export type SelectAuditLog = InferSelectModel<typeof auditLogTable>;
