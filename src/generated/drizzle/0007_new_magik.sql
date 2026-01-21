CREATE TYPE "public"."audit_event_type" AS ENUM('permission_check', 'permission_denied', 'resource_create', 'resource_update', 'resource_delete', 'authentication', 'circuit_breaker');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" "audit_event_type" NOT NULL,
	"user_id" uuid,
	"idp_user_id" uuid,
	"resource_type" text,
	"resource_id" uuid,
	"action" text,
	"allowed" boolean,
	"duration_ms" integer,
	"ip_address" text,
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_log_user_id_idx" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_log_resource_idx" ON "audit_log" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "audit_log_event_type_idx" ON "audit_log" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");