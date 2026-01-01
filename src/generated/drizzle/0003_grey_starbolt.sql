ALTER TABLE "external_dependency" ALTER COLUMN "detection_source" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "external_dependency" ALTER COLUMN "detection_source" SET DEFAULT 'manual'::text;--> statement-breakpoint
ALTER TABLE "repository_relationship" ALTER COLUMN "detection_source" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "repository_relationship" ALTER COLUMN "detection_source" SET DEFAULT 'manual'::text;--> statement-breakpoint
DROP TYPE "public"."detection_source";--> statement-breakpoint
CREATE TYPE "public"."detection_source" AS ENUM('manual', 'package_json', 'go_mod', 'cargo_toml', 'arbor_manifest', 'openapi', 'graphql_schema');--> statement-breakpoint
ALTER TABLE "external_dependency" ALTER COLUMN "detection_source" SET DEFAULT 'manual'::"public"."detection_source";--> statement-breakpoint
ALTER TABLE "external_dependency" ALTER COLUMN "detection_source" SET DATA TYPE "public"."detection_source" USING "detection_source"::"public"."detection_source";--> statement-breakpoint
ALTER TABLE "repository_relationship" ALTER COLUMN "detection_source" SET DEFAULT 'manual'::"public"."detection_source";--> statement-breakpoint
ALTER TABLE "repository_relationship" ALTER COLUMN "detection_source" SET DATA TYPE "public"."detection_source" USING "detection_source"::"public"."detection_source";