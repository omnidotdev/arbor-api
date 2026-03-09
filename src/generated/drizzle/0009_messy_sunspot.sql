ALTER TABLE "audit_log" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "audit_log" CASCADE;--> statement-breakpoint
ALTER TABLE "pull_request_review" ALTER COLUMN "state" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "pull_request_review" ALTER COLUMN "state" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "pull_request" ALTER COLUMN "state" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "pull_request" ALTER COLUMN "state" SET DEFAULT 'open';--> statement-breakpoint
ALTER TABLE "external_dependency" ALTER COLUMN "detection_source" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "external_dependency" ALTER COLUMN "detection_source" SET DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE "repository_relationship" ALTER COLUMN "detection_source" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "repository_relationship" ALTER COLUMN "detection_source" SET DEFAULT 'manual';--> statement-breakpoint
DROP TYPE "public"."audit_event_type";--> statement-breakpoint
DROP TYPE "public"."pull_request_state";--> statement-breakpoint
DROP TYPE "public"."review_state";--> statement-breakpoint
DROP TYPE "public"."detection_source";