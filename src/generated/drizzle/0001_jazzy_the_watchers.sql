CREATE TABLE "tester_application" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewer_note" text,
	"nda_accepted" boolean DEFAULT false NOT NULL,
	"nda_version" text,
	"nda_accepted_at" timestamp,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tester_application" ADD CONSTRAINT "tester_application_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tester_application_id_index" ON "tester_application" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "tester_application_user_id_index" ON "tester_application" USING btree ("user_id");