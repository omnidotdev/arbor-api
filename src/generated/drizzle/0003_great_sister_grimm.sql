CREATE TABLE "repository_redirect" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_username" text NOT NULL,
	"slug" text NOT NULL,
	"organization_id" uuid,
	"repository_id" uuid NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "repository_redirect" ADD CONSTRAINT "repository_redirect_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository_redirect" ADD CONSTRAINT "repository_redirect_repository_id_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "repository_redirect_id_index" ON "repository_redirect" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "repository_redirect_owner_username_slug_index" ON "repository_redirect" USING btree ("owner_username","slug");--> statement-breakpoint
CREATE INDEX "repository_redirect_repository_id_index" ON "repository_redirect" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "repository_redirect_organization_id_slug_index" ON "repository_redirect" USING btree ("organization_id","slug");