CREATE TYPE "public"."visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TYPE "public"."permission" AS ENUM('read', 'write', 'admin');--> statement-breakpoint
CREATE TABLE "organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idp_organization_id" text NOT NULL,
	"description" text,
	"avatar_url" text,
	"subscription_id" text,
	"billing_account_id" text,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"deletion_reason" text,
	CONSTRAINT "organization_idp_organization_id_unique" UNIQUE("idp_organization_id")
);
--> statement-breakpoint
CREATE TABLE "pull_request_comment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pull_request_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"path" text,
	"line" integer,
	"side" text,
	"commit_sha" text,
	"reply_to_id" uuid,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pull_request_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pull_request_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"body" text,
	"submitted_at" timestamp,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pull_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer NOT NULL,
	"repository_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"state" text DEFAULT 'open' NOT NULL,
	"source_branch" text NOT NULL,
	"target_branch" text NOT NULL,
	"merge_commit_sha" text,
	"merged_at" timestamp,
	"merged_by_id" uuid,
	"closed_at" timestamp,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repository" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"organization_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"visibility" "visibility" DEFAULT 'public' NOT NULL,
	"default_branch" text DEFAULT 'master' NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repository_collaborator" (
	"repository_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"permission" "permission" DEFAULT 'read' NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repository_collaborator_repository_id_user_id_pk" PRIMARY KEY("repository_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "external_dependency" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid NOT NULL,
	"package_manager" text NOT NULL,
	"package_name" text NOT NULL,
	"version_constraint" text,
	"detection_source" text DEFAULT 'manual' NOT NULL,
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
	"detection_source" text DEFAULT 'manual' NOT NULL,
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
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identity_provider_id" uuid NOT NULL,
	"name" text NOT NULL,
	"username" text NOT NULL,
	"avatar_url" text,
	"email" text NOT NULL,
	"bio" text,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_identityProviderId_unique" UNIQUE("identity_provider_id"),
	CONSTRAINT "user_username_unique" UNIQUE("username"),
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "pull_request_comment" ADD CONSTRAINT "pull_request_comment_pull_request_id_pull_request_id_fk" FOREIGN KEY ("pull_request_id") REFERENCES "public"."pull_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_request_comment" ADD CONSTRAINT "pull_request_comment_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_request_review" ADD CONSTRAINT "pull_request_review_pull_request_id_pull_request_id_fk" FOREIGN KEY ("pull_request_id") REFERENCES "public"."pull_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_request_review" ADD CONSTRAINT "pull_request_review_reviewer_id_user_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_request" ADD CONSTRAINT "pull_request_repository_id_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_request" ADD CONSTRAINT "pull_request_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_request" ADD CONSTRAINT "pull_request_merged_by_id_user_id_fk" FOREIGN KEY ("merged_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository" ADD CONSTRAINT "repository_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository" ADD CONSTRAINT "repository_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository_collaborator" ADD CONSTRAINT "repository_collaborator_repository_id_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository_collaborator" ADD CONSTRAINT "repository_collaborator_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_dependency" ADD CONSTRAINT "external_dependency_repository_id_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository_relationship_metadata" ADD CONSTRAINT "repository_relationship_metadata_relationship_id_repository_relationship_id_fk" FOREIGN KEY ("relationship_id") REFERENCES "public"."repository_relationship"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository_relationship" ADD CONSTRAINT "repository_relationship_source_repository_id_repository_id_fk" FOREIGN KEY ("source_repository_id") REFERENCES "public"."repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository_relationship" ADD CONSTRAINT "repository_relationship_target_repository_id_repository_id_fk" FOREIGN KEY ("target_repository_id") REFERENCES "public"."repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository_relationship" ADD CONSTRAINT "repository_relationship_relationship_type_id_repository_relationship_type_id_fk" FOREIGN KEY ("relationship_type_id") REFERENCES "public"."repository_relationship_type"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository_relationship_type" ADD CONSTRAINT "repository_relationship_type_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_id_index" ON "organization" USING btree ("id");--> statement-breakpoint
CREATE INDEX "organization_idp_organization_id_idx" ON "organization" USING btree ("idp_organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pull_request_comment_id_index" ON "pull_request_comment" USING btree ("id");--> statement-breakpoint
CREATE INDEX "pull_request_comment_pull_request_id_index" ON "pull_request_comment" USING btree ("pull_request_id");--> statement-breakpoint
CREATE INDEX "pull_request_comment_author_id_index" ON "pull_request_comment" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "pull_request_comment_reply_to_id_index" ON "pull_request_comment" USING btree ("reply_to_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pull_request_review_id_index" ON "pull_request_review" USING btree ("id");--> statement-breakpoint
CREATE INDEX "pull_request_review_pull_request_id_index" ON "pull_request_review" USING btree ("pull_request_id");--> statement-breakpoint
CREATE INDEX "pull_request_review_reviewer_id_index" ON "pull_request_review" USING btree ("reviewer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pull_request_id_index" ON "pull_request" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "pull_request_repository_id_number_index" ON "pull_request" USING btree ("repository_id","number");--> statement-breakpoint
CREATE INDEX "pull_request_repository_id_index" ON "pull_request" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "pull_request_author_id_index" ON "pull_request" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "pull_request_state_index" ON "pull_request" USING btree ("state");--> statement-breakpoint
CREATE UNIQUE INDEX "repository_id_index" ON "repository" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "repository_owner_id_slug_index" ON "repository" USING btree ("owner_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "repository_organization_id_slug_index" ON "repository" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "repository_owner_id_index" ON "repository" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "repository_organization_id_index" ON "repository" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "repository_collaborator_user_id_index" ON "repository_collaborator" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "repository_collaborator_repository_id_index" ON "repository_collaborator" USING btree ("repository_id");--> statement-breakpoint
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
CREATE INDEX "repository_relationship_type_organization_id_index" ON "repository_relationship_type" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_id_index" ON "user" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_identity_provider_id_index" ON "user" USING btree ("identity_provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_username_index" ON "user" USING btree ("username");