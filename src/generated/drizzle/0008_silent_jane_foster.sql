ALTER TABLE "agent" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "organization" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pull_request_comment" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pull_request_review" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pull_request" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "repository" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "change" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "stack" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "verification_check" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "agent_select" ON "agent" AS PERMISSIVE FOR SELECT TO public USING (
  owner_id = nullif(current_setting('app.user_id', true), '')::uuid
  or exists (
    select 1 from organization_member om
    where om.organization_id = agent.organization_id
      and om.user_id = nullif(current_setting('app.user_id', true), '')::uuid
  ));--> statement-breakpoint
CREATE POLICY "agent_insert" ON "agent" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_update" ON "agent" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_delete" ON "agent" AS PERMISSIVE FOR DELETE TO public USING (true);--> statement-breakpoint
CREATE POLICY "organization_select" ON "organization" AS PERMISSIVE FOR SELECT TO public USING (
  exists (
    select 1 from organization_member om
    where om.organization_id = organization.id
      and om.user_id = nullif(current_setting('app.user_id', true), '')::uuid
  ));--> statement-breakpoint
CREATE POLICY "organization_insert" ON "organization" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "organization_update" ON "organization" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "organization_delete" ON "organization" AS PERMISSIVE FOR DELETE TO public USING (true);--> statement-breakpoint
CREATE POLICY "pull_request_comment_select" ON "pull_request_comment" AS PERMISSIVE FOR SELECT TO public USING (pull_request_id in (select id from pull_request));--> statement-breakpoint
CREATE POLICY "pull_request_comment_insert" ON "pull_request_comment" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "pull_request_comment_update" ON "pull_request_comment" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "pull_request_comment_delete" ON "pull_request_comment" AS PERMISSIVE FOR DELETE TO public USING (true);--> statement-breakpoint
CREATE POLICY "pull_request_review_select" ON "pull_request_review" AS PERMISSIVE FOR SELECT TO public USING (pull_request_id in (select id from pull_request));--> statement-breakpoint
CREATE POLICY "pull_request_review_insert" ON "pull_request_review" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "pull_request_review_update" ON "pull_request_review" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "pull_request_review_delete" ON "pull_request_review" AS PERMISSIVE FOR DELETE TO public USING (true);--> statement-breakpoint
CREATE POLICY "pull_request_select" ON "pull_request" AS PERMISSIVE FOR SELECT TO public USING (repository_id in (select id from repository));--> statement-breakpoint
CREATE POLICY "pull_request_insert" ON "pull_request" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "pull_request_update" ON "pull_request" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "pull_request_delete" ON "pull_request" AS PERMISSIVE FOR DELETE TO public USING (true);--> statement-breakpoint
CREATE POLICY "repository_select" ON "repository" AS PERMISSIVE FOR SELECT TO public USING (
  visibility = 'public'
  or owner_id = nullif(current_setting('app.user_id', true), '')::uuid
  or exists (
    select 1 from repository_collaborator rc
    where rc.repository_id = repository.id and rc.user_id = nullif(current_setting('app.user_id', true), '')::uuid
  )
  or exists (
    select 1 from organization_member om
    where om.organization_id = repository.organization_id
      and om.user_id = nullif(current_setting('app.user_id', true), '')::uuid
  ));--> statement-breakpoint
CREATE POLICY "repository_insert" ON "repository" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "repository_update" ON "repository" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "repository_delete" ON "repository" AS PERMISSIVE FOR DELETE TO public USING (true);--> statement-breakpoint
CREATE POLICY "change_select" ON "change" AS PERMISSIVE FOR SELECT TO public USING (repository_id in (select id from repository));--> statement-breakpoint
CREATE POLICY "change_insert" ON "change" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "change_update" ON "change" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "change_delete" ON "change" AS PERMISSIVE FOR DELETE TO public USING (true);--> statement-breakpoint
CREATE POLICY "stack_select" ON "stack" AS PERMISSIVE FOR SELECT TO public USING (repository_id in (select id from repository));--> statement-breakpoint
CREATE POLICY "stack_insert" ON "stack" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "stack_update" ON "stack" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "stack_delete" ON "stack" AS PERMISSIVE FOR DELETE TO public USING (true);--> statement-breakpoint
CREATE POLICY "verification_check_select" ON "verification_check" AS PERMISSIVE FOR SELECT TO public USING (change_id in (select id from change));--> statement-breakpoint
CREATE POLICY "verification_check_insert" ON "verification_check" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "verification_check_update" ON "verification_check" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "verification_check_delete" ON "verification_check" AS PERMISSIVE FOR DELETE TO public USING (true);