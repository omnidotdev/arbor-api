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
ALTER TABLE "topic_pull_request" ADD CONSTRAINT "topic_pull_request_topic_id_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topic"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_pull_request" ADD CONSTRAINT "topic_pull_request_pull_request_id_pull_request_id_fk" FOREIGN KEY ("pull_request_id") REFERENCES "public"."pull_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic" ADD CONSTRAINT "topic_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic" ADD CONSTRAINT "topic_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "topic_pull_request_id_index" ON "topic_pull_request" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "topic_pull_request_topic_id_pull_request_id_index" ON "topic_pull_request" USING btree ("topic_id","pull_request_id");--> statement-breakpoint
CREATE INDEX "topic_pull_request_topic_id_index" ON "topic_pull_request" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "topic_pull_request_pull_request_id_index" ON "topic_pull_request" USING btree ("pull_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "topic_id_index" ON "topic" USING btree ("id");--> statement-breakpoint
CREATE INDEX "topic_owner_id_index" ON "topic" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "topic_organization_id_index" ON "topic" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "topic_status_index" ON "topic" USING btree ("status");