/**
 * Audit logging service for authorization decisions and security events.
 *
 * Provides persistent audit trail for compliance, forensics, and security monitoring.
 * Uses async batched inserts to minimize performance impact on hot paths.
 */

import { dbPool } from "lib/db/db";
import { auditLogTable } from "lib/db/schema";

import type { InsertAuditLog } from "lib/db/schema";

interface AuditEventBase {
  userId?: string;
  idpUserId?: string;
  resourceType?: string;
  resourceId?: string;
  action?: string;
  allowed?: boolean;
  durationMs?: number;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

interface PermissionCheckEvent extends AuditEventBase {
  eventType: "permission_check" | "permission_denied";
  userId: string;
  resourceType: string;
  resourceId: string;
  action: string;
  allowed: boolean;
}

interface ResourceEvent extends AuditEventBase {
  eventType: "resource_create" | "resource_update" | "resource_delete";
  userId: string;
  resourceType: string;
  resourceId: string;
}

interface AuthenticationEvent extends AuditEventBase {
  eventType: "authentication";
  idpUserId: string;
  allowed: boolean;
}

interface CircuitBreakerEvent extends AuditEventBase {
  eventType: "circuit_breaker";
  metadata: {
    state: "open" | "half_open" | "closed";
    failures?: number;
    error?: string;
  };
}

type AuditEvent =
  | PermissionCheckEvent
  | ResourceEvent
  | AuthenticationEvent
  | CircuitBreakerEvent;

/** Batch queue for audit events */
const eventQueue: InsertAuditLog[] = [];

/** Batch flush interval in milliseconds */
const FLUSH_INTERVAL_MS = 1000;

/** Maximum batch size before forced flush */
const MAX_BATCH_SIZE = 100;

/** Whether the flush interval is active */
let flushIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Flush queued audit events to the database.
 */
async function flushEvents(): Promise<void> {
  if (eventQueue.length === 0) return;

  const events = eventQueue.splice(0, eventQueue.length);

  try {
    await dbPool.insert(auditLogTable).values(events);
  } catch (error) {
    // Log to console as fallback - don't lose audit data silently
    console.error("[audit] Failed to persist audit events:", error);
    console.log(
      "[audit] Lost events:",
      JSON.stringify(events.map((e) => ({ ...e, createdAt: undefined }))),
    );
  }
}

/**
 * Start the audit flush interval.
 * Called automatically on first event, but can be called explicitly during startup.
 */
export function startAuditFlush(): void {
  if (flushIntervalId) return;
  flushIntervalId = setInterval(flushEvents, FLUSH_INTERVAL_MS);
}

/**
 * Stop the audit flush interval and flush remaining events.
 * Call during graceful shutdown.
 */
export async function stopAuditFlush(): Promise<void> {
  if (flushIntervalId) {
    clearInterval(flushIntervalId);
    flushIntervalId = null;
  }
  await flushEvents();
}

/**
 * Log an audit event.
 *
 * Events are batched and flushed periodically for performance.
 * For critical events, use `logAuditEventSync` instead.
 * @public
 */
export function logAuditEvent(event: AuditEvent): void {
  const record: InsertAuditLog = {
    eventType: event.eventType,
    userId: event.userId,
    idpUserId: event.idpUserId,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    action: event.action,
    allowed: event.allowed,
    durationMs: event.durationMs,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    metadata: event.metadata,
  };

  eventQueue.push(record);

  // Start flush interval on first event
  if (!flushIntervalId) {
    startAuditFlush();
  }

  // Force flush if batch is full
  if (eventQueue.length >= MAX_BATCH_SIZE) {
    flushEvents();
  }
}

/**
 * Log an audit event synchronously (immediate database write).
 *
 * Use for critical security events that must be persisted immediately.
 * Prefer `logAuditEvent` for normal operations.
 * @public
 */
export async function logAuditEventSync(event: AuditEvent): Promise<void> {
  const record: InsertAuditLog = {
    eventType: event.eventType,
    userId: event.userId,
    idpUserId: event.idpUserId,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    action: event.action,
    allowed: event.allowed,
    durationMs: event.durationMs,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    metadata: event.metadata,
  };

  try {
    await dbPool.insert(auditLogTable).values(record);
  } catch (error) {
    console.error("[audit] Failed to persist audit event:", error);
    console.log("[audit] Event:", JSON.stringify(record));
  }
}

/**
 * Helper to log a permission check result.
 */
export function logPermissionCheck(params: {
  userId: string;
  idpUserId?: string;
  resourceType: string;
  resourceId: string;
  permission: string;
  allowed: boolean;
  durationMs?: number;
  ipAddress?: string;
  userAgent?: string;
}): void {
  logAuditEvent({
    eventType: params.allowed ? "permission_check" : "permission_denied",
    userId: params.userId,
    idpUserId: params.idpUserId,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    action: params.permission,
    allowed: params.allowed,
    durationMs: params.durationMs,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });
}

/**
 * Helper to log a circuit breaker state change.
 */
export function logCircuitBreakerEvent(
  state: "open" | "half_open" | "closed",
  failures?: number,
  error?: string,
): void {
  logAuditEvent({
    eventType: "circuit_breaker",
    metadata: { state, failures, error },
  });
}
