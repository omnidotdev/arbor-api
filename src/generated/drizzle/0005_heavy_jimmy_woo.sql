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
ALTER TABLE "merge_batch" ADD CONSTRAINT "merge_batch_repository_id_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merge_queue_entry" ADD CONSTRAINT "merge_queue_entry_repository_id_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merge_queue_entry" ADD CONSTRAINT "merge_queue_entry_stack_id_stack_id_fk" FOREIGN KEY ("stack_id") REFERENCES "public"."stack"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merge_queue_entry" ADD CONSTRAINT "merge_queue_entry_pull_request_id_pull_request_id_fk" FOREIGN KEY ("pull_request_id") REFERENCES "public"."pull_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merge_queue_entry" ADD CONSTRAINT "merge_queue_entry_batch_id_merge_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."merge_batch"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "merge_batch_id_index" ON "merge_batch" USING btree ("id");--> statement-breakpoint
CREATE INDEX "merge_batch_repository_id_index" ON "merge_batch" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "merge_batch_ci_status_index" ON "merge_batch" USING btree ("ci_status");--> statement-breakpoint
CREATE UNIQUE INDEX "merge_queue_entry_id_index" ON "merge_queue_entry" USING btree ("id");--> statement-breakpoint
CREATE INDEX "merge_queue_entry_repository_id_index" ON "merge_queue_entry" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "merge_queue_entry_stack_id_index" ON "merge_queue_entry" USING btree ("stack_id");--> statement-breakpoint
CREATE INDEX "merge_queue_entry_pull_request_id_index" ON "merge_queue_entry" USING btree ("pull_request_id");--> statement-breakpoint
CREATE INDEX "merge_queue_entry_batch_id_index" ON "merge_queue_entry" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "merge_queue_entry_state_index" ON "merge_queue_entry" USING btree ("state");