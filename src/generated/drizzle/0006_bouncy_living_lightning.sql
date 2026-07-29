CREATE TABLE "personal_access_token_repository" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"personal_access_token_id" uuid NOT NULL,
	"repository_id" uuid NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "personal_access_token" ADD COLUMN "permission" text DEFAULT 'write' NOT NULL;--> statement-breakpoint
ALTER TABLE "personal_access_token_repository" ADD CONSTRAINT "personal_access_token_repository_personal_access_token_id_personal_access_token_id_fk" FOREIGN KEY ("personal_access_token_id") REFERENCES "public"."personal_access_token"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_access_token_repository" ADD CONSTRAINT "personal_access_token_repository_repository_id_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "personal_access_token_repository_personal_access_token_id_repository_id_index" ON "personal_access_token_repository" USING btree ("personal_access_token_id","repository_id");--> statement-breakpoint
CREATE INDEX "personal_access_token_repository_personal_access_token_id_index" ON "personal_access_token_repository" USING btree ("personal_access_token_id");--> statement-breakpoint
CREATE INDEX "personal_access_token_repository_repository_id_index" ON "personal_access_token_repository" USING btree ("repository_id");