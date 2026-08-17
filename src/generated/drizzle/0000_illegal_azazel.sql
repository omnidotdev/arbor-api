CREATE TYPE "public"."visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TYPE "public"."permission" AS ENUM('read', 'write', 'admin');--> statement-breakpoint
CREATE TABLE "agent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"organization_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"model" text,
	"vendor" text,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "branch_protection_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid NOT NULL,
	"ref_pattern" text NOT NULL,
	"required_approvals" integer DEFAULT 0 NOT NULL,
	"require_passing_checks" boolean DEFAULT true NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "branch_protection_rule" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "merge_batch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid NOT NULL,
	"speculative_branch" text,
	"ci_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merge_queue_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid NOT NULL,
	"stack_id" uuid,
	"pull_request_id" uuid,
	"batch_id" uuid,
	"state" text DEFAULT 'queued' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"target_branch" text DEFAULT 'master' NOT NULL,
	"enqueued_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"roles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"synced_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idp_organization_id" text NOT NULL,
	"name" text,
	"slug" text,
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
ALTER TABLE "organization" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "personal_access_token_repository" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"personal_access_token_id" uuid NOT NULL,
	"repository_id" uuid NOT NULL,
	"ref_patterns" text[],
	"path_patterns" text[],
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal_access_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"agent_id" uuid,
	"name" text NOT NULL,
	"token_hash" text NOT NULL,
	"token_prefix" text NOT NULL,
	"permission" text DEFAULT 'write' NOT NULL,
	"last_used_at" timestamp(6) with time zone,
	"expires_at" timestamp(6) with time zone,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "personal_access_token_tokenHash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "project_repository" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"repository_id" uuid NOT NULL,
	"detection_source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"organization_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"visibility" "visibility" DEFAULT 'public' NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL
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
ALTER TABLE "pull_request_comment" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
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
ALTER TABLE "pull_request_review" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pull_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer NOT NULL,
	"repository_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"authored_by_agent_id" uuid,
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
ALTER TABLE "pull_request" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
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
ALTER TABLE "repository" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
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
CREATE TABLE "change" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stack_id" uuid NOT NULL,
	"repository_id" uuid NOT NULL,
	"parent_change_id" uuid,
	"commit_sha" text,
	"head_branch" text,
	"title" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"pull_request_id" uuid,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "change" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "stack" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"authored_by_agent_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"base_branch" text DEFAULT 'master' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stack" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "topic_pull_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"pull_request_id" uuid NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topic" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"organization_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL
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
CREATE TABLE "verification_check" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"change_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"summary" text,
	"details_url" text,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "verification_check" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "agent" ADD CONSTRAINT "agent_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent" ADD CONSTRAINT "agent_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_protection_rule" ADD CONSTRAINT "branch_protection_rule_repository_id_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merge_batch" ADD CONSTRAINT "merge_batch_repository_id_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merge_queue_entry" ADD CONSTRAINT "merge_queue_entry_repository_id_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merge_queue_entry" ADD CONSTRAINT "merge_queue_entry_stack_id_stack_id_fk" FOREIGN KEY ("stack_id") REFERENCES "public"."stack"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merge_queue_entry" ADD CONSTRAINT "merge_queue_entry_pull_request_id_pull_request_id_fk" FOREIGN KEY ("pull_request_id") REFERENCES "public"."pull_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merge_queue_entry" ADD CONSTRAINT "merge_queue_entry_batch_id_merge_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."merge_batch"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_access_token_repository" ADD CONSTRAINT "personal_access_token_repository_personal_access_token_id_personal_access_token_id_fk" FOREIGN KEY ("personal_access_token_id") REFERENCES "public"."personal_access_token"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_access_token_repository" ADD CONSTRAINT "personal_access_token_repository_repository_id_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_access_token" ADD CONSTRAINT "personal_access_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_access_token" ADD CONSTRAINT "personal_access_token_agent_id_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_repository" ADD CONSTRAINT "project_repository_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_repository" ADD CONSTRAINT "project_repository_repository_id_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_request_comment" ADD CONSTRAINT "pull_request_comment_pull_request_id_pull_request_id_fk" FOREIGN KEY ("pull_request_id") REFERENCES "public"."pull_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_request_comment" ADD CONSTRAINT "pull_request_comment_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_request_review" ADD CONSTRAINT "pull_request_review_pull_request_id_pull_request_id_fk" FOREIGN KEY ("pull_request_id") REFERENCES "public"."pull_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_request_review" ADD CONSTRAINT "pull_request_review_reviewer_id_user_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_request" ADD CONSTRAINT "pull_request_repository_id_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_request" ADD CONSTRAINT "pull_request_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_request" ADD CONSTRAINT "pull_request_authored_by_agent_id_agent_id_fk" FOREIGN KEY ("authored_by_agent_id") REFERENCES "public"."agent"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "change" ADD CONSTRAINT "change_stack_id_stack_id_fk" FOREIGN KEY ("stack_id") REFERENCES "public"."stack"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change" ADD CONSTRAINT "change_repository_id_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change" ADD CONSTRAINT "change_pull_request_id_pull_request_id_fk" FOREIGN KEY ("pull_request_id") REFERENCES "public"."pull_request"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stack" ADD CONSTRAINT "stack_repository_id_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stack" ADD CONSTRAINT "stack_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stack" ADD CONSTRAINT "stack_authored_by_agent_id_agent_id_fk" FOREIGN KEY ("authored_by_agent_id") REFERENCES "public"."agent"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_pull_request" ADD CONSTRAINT "topic_pull_request_topic_id_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topic"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_pull_request" ADD CONSTRAINT "topic_pull_request_pull_request_id_pull_request_id_fk" FOREIGN KEY ("pull_request_id") REFERENCES "public"."pull_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic" ADD CONSTRAINT "topic_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic" ADD CONSTRAINT "topic_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_check" ADD CONSTRAINT "verification_check_change_id_change_id_fk" FOREIGN KEY ("change_id") REFERENCES "public"."change"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_id_index" ON "agent" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_owner_id_slug_index" ON "agent" USING btree ("owner_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_organization_id_slug_index" ON "agent" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "agent_owner_id_index" ON "agent" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "agent_organization_id_index" ON "agent" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "branch_protection_rule_id_index" ON "branch_protection_rule" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "branch_protection_rule_repository_id_ref_pattern_index" ON "branch_protection_rule" USING btree ("repository_id","ref_pattern");--> statement-breakpoint
CREATE INDEX "branch_protection_rule_repository_id_index" ON "branch_protection_rule" USING btree ("repository_id");--> statement-breakpoint
CREATE UNIQUE INDEX "merge_batch_id_index" ON "merge_batch" USING btree ("id");--> statement-breakpoint
CREATE INDEX "merge_batch_repository_id_index" ON "merge_batch" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "merge_batch_ci_status_index" ON "merge_batch" USING btree ("ci_status");--> statement-breakpoint
CREATE UNIQUE INDEX "merge_queue_entry_id_index" ON "merge_queue_entry" USING btree ("id");--> statement-breakpoint
CREATE INDEX "merge_queue_entry_repository_id_index" ON "merge_queue_entry" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "merge_queue_entry_stack_id_index" ON "merge_queue_entry" USING btree ("stack_id");--> statement-breakpoint
CREATE INDEX "merge_queue_entry_pull_request_id_index" ON "merge_queue_entry" USING btree ("pull_request_id");--> statement-breakpoint
CREATE INDEX "merge_queue_entry_batch_id_index" ON "merge_queue_entry" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "merge_queue_entry_state_index" ON "merge_queue_entry" USING btree ("state");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_member_user_id_organization_id_index" ON "organization_member" USING btree ("user_id","organization_id");--> statement-breakpoint
CREATE INDEX "organization_member_user_id_index" ON "organization_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "organization_member_organization_id_index" ON "organization_member" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_id_index" ON "organization" USING btree ("id");--> statement-breakpoint
CREATE INDEX "organization_idp_organization_id_idx" ON "organization" USING btree ("idp_organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "personal_access_token_repository_personal_access_token_id_repository_id_index" ON "personal_access_token_repository" USING btree ("personal_access_token_id","repository_id");--> statement-breakpoint
CREATE INDEX "personal_access_token_repository_personal_access_token_id_index" ON "personal_access_token_repository" USING btree ("personal_access_token_id");--> statement-breakpoint
CREATE INDEX "personal_access_token_repository_repository_id_index" ON "personal_access_token_repository" USING btree ("repository_id");--> statement-breakpoint
CREATE UNIQUE INDEX "personal_access_token_token_hash_index" ON "personal_access_token" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "personal_access_token_user_id_index" ON "personal_access_token" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "personal_access_token_agent_id_index" ON "personal_access_token" USING btree ("agent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_repository_id_index" ON "project_repository" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_repository_project_id_repository_id_index" ON "project_repository" USING btree ("project_id","repository_id");--> statement-breakpoint
CREATE INDEX "project_repository_project_id_index" ON "project_repository" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_repository_repository_id_index" ON "project_repository" USING btree ("repository_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_id_index" ON "project" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_owner_id_slug_index" ON "project" USING btree ("owner_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "project_organization_id_slug_index" ON "project" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "project_owner_id_index" ON "project" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "project_organization_id_index" ON "project" USING btree ("organization_id");--> statement-breakpoint
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
CREATE INDEX "pull_request_authored_by_agent_id_index" ON "pull_request" USING btree ("authored_by_agent_id");--> statement-breakpoint
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
CREATE UNIQUE INDEX "change_id_index" ON "change" USING btree ("id");--> statement-breakpoint
CREATE INDEX "change_stack_id_index" ON "change" USING btree ("stack_id");--> statement-breakpoint
CREATE INDEX "change_repository_id_index" ON "change" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "change_parent_change_id_index" ON "change" USING btree ("parent_change_id");--> statement-breakpoint
CREATE INDEX "change_status_index" ON "change" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "stack_id_index" ON "stack" USING btree ("id");--> statement-breakpoint
CREATE INDEX "stack_repository_id_index" ON "stack" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "stack_author_id_index" ON "stack" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "stack_status_index" ON "stack" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "topic_pull_request_id_index" ON "topic_pull_request" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "topic_pull_request_topic_id_pull_request_id_index" ON "topic_pull_request" USING btree ("topic_id","pull_request_id");--> statement-breakpoint
CREATE INDEX "topic_pull_request_topic_id_index" ON "topic_pull_request" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "topic_pull_request_pull_request_id_index" ON "topic_pull_request" USING btree ("pull_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "topic_id_index" ON "topic" USING btree ("id");--> statement-breakpoint
CREATE INDEX "topic_owner_id_index" ON "topic" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "topic_organization_id_index" ON "topic" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "topic_status_index" ON "topic" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "user_id_index" ON "user" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_identity_provider_id_index" ON "user" USING btree ("identity_provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_username_index" ON "user" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_check_id_index" ON "verification_check" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_check_change_id_name_index" ON "verification_check" USING btree ("change_id","name");--> statement-breakpoint
CREATE INDEX "verification_check_change_id_index" ON "verification_check" USING btree ("change_id");--> statement-breakpoint
CREATE INDEX "verification_check_status_index" ON "verification_check" USING btree ("status");--> statement-breakpoint
CREATE POLICY "agent_select" ON "agent" AS PERMISSIVE FOR SELECT TO public USING (
  owner_id = nullif(current_setting('app.user_id', true), '')::uuid
  or exists (
    select 1 from organization_member om
    where om.organization_id = agent.organization_id
      and om.user_id = nullif(current_setting('app.user_id', true), '')::uuid
  ));--> statement-breakpoint
CREATE POLICY "agent_insert" ON "agent" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_update" ON "agent" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_delete" ON "agent" AS PERMISSIVE FOR DELETE TO public USING (true);--> statement-breakpoint
CREATE POLICY "branch_protection_rule_select" ON "branch_protection_rule" AS PERMISSIVE FOR SELECT TO public USING (repository_id in (select id from repository));--> statement-breakpoint
CREATE POLICY "branch_protection_rule_insert" ON "branch_protection_rule" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "branch_protection_rule_update" ON "branch_protection_rule" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "branch_protection_rule_delete" ON "branch_protection_rule" AS PERMISSIVE FOR DELETE TO public USING (true);--> statement-breakpoint
CREATE POLICY "organization_select" ON "organization" AS PERMISSIVE FOR SELECT TO public USING (
  exists (
    select 1 from organization_member om
    where om.organization_id = organization.id
      and om.user_id = nullif(current_setting('app.user_id', true), '')::uuid
  ));--> statement-breakpoint
CREATE POLICY "organization_insert" ON "organization" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "organization_update" ON "organization" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "organization_delete" ON "organization" AS PERMISSIVE FOR DELETE TO public USING (true);--> statement-breakpoint
CREATE POLICY "pull_request_comment_select" ON "pull_request_comment" AS PERMISSIVE FOR SELECT TO public USING (pull_request_id in (select id from pull_request));--> statement-breakpoint
CREATE POLICY "pull_request_comment_insert" ON "pull_request_comment" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "pull_request_comment_update" ON "pull_request_comment" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "pull_request_comment_delete" ON "pull_request_comment" AS PERMISSIVE FOR DELETE TO public USING (true);--> statement-breakpoint
CREATE POLICY "pull_request_review_select" ON "pull_request_review" AS PERMISSIVE FOR SELECT TO public USING (pull_request_id in (select id from pull_request));--> statement-breakpoint
CREATE POLICY "pull_request_review_insert" ON "pull_request_review" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "pull_request_review_update" ON "pull_request_review" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "pull_request_review_delete" ON "pull_request_review" AS PERMISSIVE FOR DELETE TO public USING (true);--> statement-breakpoint
CREATE POLICY "pull_request_select" ON "pull_request" AS PERMISSIVE FOR SELECT TO public USING (repository_id in (select id from repository));--> statement-breakpoint
CREATE POLICY "pull_request_insert" ON "pull_request" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "pull_request_update" ON "pull_request" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "pull_request_delete" ON "pull_request" AS PERMISSIVE FOR DELETE TO public USING (true);--> statement-breakpoint
CREATE POLICY "repository_select" ON "repository" AS PERMISSIVE FOR SELECT TO public USING (
  visibility = 'public'
  or owner_id = nullif(current_setting('app.user_id', true), '')::uuid
  or exists (
    select 1 from repository_collaborator rc
    where rc.repository_id = repository.id and rc.user_id = nullif(current_setting('app.user_id', true), '')::uuid
  )
  or exists (
    select 1 from organization_member om
    where om.organization_id = repository.organization_id
      and om.user_id = nullif(current_setting('app.user_id', true), '')::uuid
  ));--> statement-breakpoint
CREATE POLICY "repository_insert" ON "repository" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "repository_update" ON "repository" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "repository_delete" ON "repository" AS PERMISSIVE FOR DELETE TO public USING (true);--> statement-breakpoint
CREATE POLICY "change_select" ON "change" AS PERMISSIVE FOR SELECT TO public USING (repository_id in (select id from repository));--> statement-breakpoint
CREATE POLICY "change_insert" ON "change" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "change_update" ON "change" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "change_delete" ON "change" AS PERMISSIVE FOR DELETE TO public USING (true);--> statement-breakpoint
CREATE POLICY "stack_select" ON "stack" AS PERMISSIVE FOR SELECT TO public USING (repository_id in (select id from repository));--> statement-breakpoint
CREATE POLICY "stack_insert" ON "stack" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "stack_update" ON "stack" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "stack_delete" ON "stack" AS PERMISSIVE FOR DELETE TO public USING (true);--> statement-breakpoint
CREATE POLICY "verification_check_select" ON "verification_check" AS PERMISSIVE FOR SELECT TO public USING (change_id in (select id from change));--> statement-breakpoint
CREATE POLICY "verification_check_insert" ON "verification_check" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "verification_check_update" ON "verification_check" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "verification_check_delete" ON "verification_check" AS PERMISSIVE FOR DELETE TO public USING (true);