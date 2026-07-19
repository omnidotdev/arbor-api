CREATE TABLE "project_repository" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"repository_id" uuid NOT NULL,
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
ALTER TABLE "project_repository" ADD CONSTRAINT "project_repository_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_repository" ADD CONSTRAINT "project_repository_repository_id_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_repository_id_index" ON "project_repository" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_repository_project_id_repository_id_index" ON "project_repository" USING btree ("project_id","repository_id");--> statement-breakpoint
CREATE INDEX "project_repository_project_id_index" ON "project_repository" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_repository_repository_id_index" ON "project_repository" USING btree ("repository_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_id_index" ON "project" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_owner_id_slug_index" ON "project" USING btree ("owner_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "project_organization_id_slug_index" ON "project" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "project_owner_id_index" ON "project" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "project_organization_id_index" ON "project" USING btree ("organization_id");