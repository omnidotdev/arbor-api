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
ALTER TABLE "personal_access_token" ADD COLUMN "agent_id" uuid;--> statement-breakpoint
ALTER TABLE "pull_request" ADD COLUMN "authored_by_agent_id" uuid;--> statement-breakpoint
ALTER TABLE "agent" ADD CONSTRAINT "agent_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent" ADD CONSTRAINT "agent_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_id_index" ON "agent" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_owner_id_slug_index" ON "agent" USING btree ("owner_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_organization_id_slug_index" ON "agent" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "agent_owner_id_index" ON "agent" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "agent_organization_id_index" ON "agent" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "personal_access_token" ADD CONSTRAINT "personal_access_token_agent_id_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_request" ADD CONSTRAINT "pull_request_authored_by_agent_id_agent_id_fk" FOREIGN KEY ("authored_by_agent_id") REFERENCES "public"."agent"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "personal_access_token_agent_id_index" ON "personal_access_token" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "pull_request_authored_by_agent_id_index" ON "pull_request" USING btree ("authored_by_agent_id");