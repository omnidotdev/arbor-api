CREATE TYPE "public"."detection_source" AS ENUM('manual', 'package-json', 'go-mod', 'cargo-toml', 'arbor-manifest', 'openapi', 'graphql-schema');--> statement-breakpoint
CREATE TABLE "external_dependency" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid NOT NULL,
	"package_manager" text NOT NULL,
	"package_name" text NOT NULL,
	"version_constraint" text,
	"detection_source" "detection_source" DEFAULT 'manual' NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repository_relationship_metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"relationship_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repository_relationship" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_repository_id" uuid NOT NULL,
	"target_repository_id" uuid NOT NULL,
	"relationship_type_id" uuid NOT NULL,
	"detection_source" "detection_source" DEFAULT 'manual' NOT NULL,
	"confidence" real DEFAULT 1 NOT NULL,
	"version_constraint" text,
	"branch" text,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repository_relationship_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_directed" boolean DEFAULT true NOT NULL,
	"organization_id" uuid,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "external_dependency" ADD CONSTRAINT "external_dependency_repository_id_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository_relationship_metadata" ADD CONSTRAINT "repository_relationship_metadata_relationship_id_repository_relationship_id_fk" FOREIGN KEY ("relationship_id") REFERENCES "public"."repository_relationship"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository_relationship" ADD CONSTRAINT "repository_relationship_source_repository_id_repository_id_fk" FOREIGN KEY ("source_repository_id") REFERENCES "public"."repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository_relationship" ADD CONSTRAINT "repository_relationship_target_repository_id_repository_id_fk" FOREIGN KEY ("target_repository_id") REFERENCES "public"."repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository_relationship" ADD CONSTRAINT "repository_relationship_relationship_type_id_repository_relationship_type_id_fk" FOREIGN KEY ("relationship_type_id") REFERENCES "public"."repository_relationship_type"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository_relationship_type" ADD CONSTRAINT "repository_relationship_type_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "external_dependency_id_index" ON "external_dependency" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "external_dependency_repository_id_package_manager_package_name_index" ON "external_dependency" USING btree ("repository_id","package_manager","package_name");--> statement-breakpoint
CREATE INDEX "external_dependency_repository_id_index" ON "external_dependency" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "external_dependency_package_manager_index" ON "external_dependency" USING btree ("package_manager");--> statement-breakpoint
CREATE UNIQUE INDEX "repository_relationship_metadata_id_index" ON "repository_relationship_metadata" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "repository_relationship_metadata_relationship_id_key_index" ON "repository_relationship_metadata" USING btree ("relationship_id","key");--> statement-breakpoint
CREATE INDEX "repository_relationship_metadata_relationship_id_index" ON "repository_relationship_metadata" USING btree ("relationship_id");--> statement-breakpoint
CREATE UNIQUE INDEX "repository_relationship_id_index" ON "repository_relationship" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "repository_relationship_source_repository_id_target_repository_id_relationship_type_id_branch_index" ON "repository_relationship" USING btree ("source_repository_id","target_repository_id","relationship_type_id","branch");--> statement-breakpoint
CREATE INDEX "repository_relationship_source_repository_id_index" ON "repository_relationship" USING btree ("source_repository_id");--> statement-breakpoint
CREATE INDEX "repository_relationship_target_repository_id_index" ON "repository_relationship" USING btree ("target_repository_id");--> statement-breakpoint
CREATE INDEX "repository_relationship_relationship_type_id_index" ON "repository_relationship" USING btree ("relationship_type_id");--> statement-breakpoint
CREATE UNIQUE INDEX "repository_relationship_type_id_index" ON "repository_relationship_type" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "repository_relationship_type_name_organization_id_index" ON "repository_relationship_type" USING btree ("name","organization_id");--> statement-breakpoint
CREATE INDEX "repository_relationship_type_organization_id_index" ON "repository_relationship_type" USING btree ("organization_id");