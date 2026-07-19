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
ALTER TABLE "change" ADD CONSTRAINT "change_stack_id_stack_id_fk" FOREIGN KEY ("stack_id") REFERENCES "public"."stack"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change" ADD CONSTRAINT "change_repository_id_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change" ADD CONSTRAINT "change_pull_request_id_pull_request_id_fk" FOREIGN KEY ("pull_request_id") REFERENCES "public"."pull_request"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stack" ADD CONSTRAINT "stack_repository_id_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stack" ADD CONSTRAINT "stack_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stack" ADD CONSTRAINT "stack_authored_by_agent_id_agent_id_fk" FOREIGN KEY ("authored_by_agent_id") REFERENCES "public"."agent"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_check" ADD CONSTRAINT "verification_check_change_id_change_id_fk" FOREIGN KEY ("change_id") REFERENCES "public"."change"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "change_id_index" ON "change" USING btree ("id");--> statement-breakpoint
CREATE INDEX "change_stack_id_index" ON "change" USING btree ("stack_id");--> statement-breakpoint
CREATE INDEX "change_repository_id_index" ON "change" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "change_parent_change_id_index" ON "change" USING btree ("parent_change_id");--> statement-breakpoint
CREATE INDEX "change_status_index" ON "change" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "stack_id_index" ON "stack" USING btree ("id");--> statement-breakpoint
CREATE INDEX "stack_repository_id_index" ON "stack" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "stack_author_id_index" ON "stack" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "stack_status_index" ON "stack" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_check_id_index" ON "verification_check" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_check_change_id_name_index" ON "verification_check" USING btree ("change_id","name");--> statement-breakpoint
CREATE INDEX "verification_check_change_id_index" ON "verification_check" USING btree ("change_id");--> statement-breakpoint
CREATE INDEX "verification_check_status_index" ON "verification_check" USING btree ("status");