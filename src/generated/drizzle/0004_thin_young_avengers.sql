CREATE TYPE "public"."pull_request_state" AS ENUM('open', 'closed', 'merged', 'draft');--> statement-breakpoint
CREATE TYPE "public"."review_state" AS ENUM('approved', 'changes_requested', 'commented', 'pending');--> statement-breakpoint
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
	"state" "review_state" DEFAULT 'pending' NOT NULL,
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
	"state" "pull_request_state" DEFAULT 'open' NOT NULL,
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
ALTER TABLE "pull_request_comment" ADD CONSTRAINT "pull_request_comment_pull_request_id_pull_request_id_fk" FOREIGN KEY ("pull_request_id") REFERENCES "public"."pull_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_request_comment" ADD CONSTRAINT "pull_request_comment_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_request_review" ADD CONSTRAINT "pull_request_review_pull_request_id_pull_request_id_fk" FOREIGN KEY ("pull_request_id") REFERENCES "public"."pull_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_request_review" ADD CONSTRAINT "pull_request_review_reviewer_id_user_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_request" ADD CONSTRAINT "pull_request_repository_id_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_request" ADD CONSTRAINT "pull_request_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_request" ADD CONSTRAINT "pull_request_merged_by_id_user_id_fk" FOREIGN KEY ("merged_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
CREATE INDEX "pull_request_state_index" ON "pull_request" USING btree ("state");