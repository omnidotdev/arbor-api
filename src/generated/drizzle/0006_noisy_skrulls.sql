ALTER TABLE "organization_member" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "organization_member" CASCADE;--> statement-breakpoint
ALTER TABLE "organization" DROP CONSTRAINT "organization_slug_unique";--> statement-breakpoint
DROP INDEX "organization_slug_index";--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "idp_organization_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "subscription_id" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "billing_account_id" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "deletion_reason" text;--> statement-breakpoint
CREATE INDEX "organization_idp_organization_id_idx" ON "organization" USING btree ("idp_organization_id");--> statement-breakpoint
ALTER TABLE "organization" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "organization" DROP COLUMN "slug";--> statement-breakpoint
ALTER TABLE "organization" DROP COLUMN "tier";--> statement-breakpoint
ALTER TABLE "organization" DROP COLUMN "stripe_customer_id";--> statement-breakpoint
ALTER TABLE "organization" DROP COLUMN "stripe_subscription_id";--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_idp_organization_id_unique" UNIQUE("idp_organization_id");--> statement-breakpoint
DROP TYPE "public"."tier";--> statement-breakpoint
DROP TYPE "public"."role";