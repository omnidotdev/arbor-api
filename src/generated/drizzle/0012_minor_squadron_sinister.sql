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
ALTER TABLE "branch_protection_rule" ADD CONSTRAINT "branch_protection_rule_repository_id_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "branch_protection_rule_id_index" ON "branch_protection_rule" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "branch_protection_rule_repository_id_ref_pattern_index" ON "branch_protection_rule" USING btree ("repository_id","ref_pattern");--> statement-breakpoint
CREATE INDEX "branch_protection_rule_repository_id_index" ON "branch_protection_rule" USING btree ("repository_id");--> statement-breakpoint
CREATE POLICY "branch_protection_rule_select" ON "branch_protection_rule" AS PERMISSIVE FOR SELECT TO public USING (repository_id in (select id from repository));--> statement-breakpoint
CREATE POLICY "branch_protection_rule_insert" ON "branch_protection_rule" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "branch_protection_rule_update" ON "branch_protection_rule" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "branch_protection_rule_delete" ON "branch_protection_rule" AS PERMISSIVE FOR DELETE TO public USING (true);