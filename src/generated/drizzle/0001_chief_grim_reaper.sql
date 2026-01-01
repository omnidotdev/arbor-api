CREATE TYPE "public"."tier" AS ENUM('free', 'basic', 'team');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TYPE "public"."permission" AS ENUM('read', 'write', 'admin');--> statement-breakpoint
CREATE TABLE "organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"avatar_url" text,
	"tier" "tier" DEFAULT 'free' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "organization_member" (
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_member_organization_id_user_id_pk" PRIMARY KEY("organization_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "repository" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"organization_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"visibility" "visibility" DEFAULT 'public' NOT NULL,
	"default_branch" text DEFAULT 'main' NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repository_collaborator" (
	"repository_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"permission" "permission" DEFAULT 'read' NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repository_collaborator_repository_id_user_id_pk" PRIMARY KEY("repository_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "username" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository" ADD CONSTRAINT "repository_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository" ADD CONSTRAINT "repository_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository_collaborator" ADD CONSTRAINT "repository_collaborator_repository_id_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository_collaborator" ADD CONSTRAINT "repository_collaborator_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_id_index" ON "organization" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_slug_index" ON "organization" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "organization_member_user_id_index" ON "organization_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "organization_member_organization_id_index" ON "organization_member" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "repository_id_index" ON "repository" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "repository_owner_id_slug_index" ON "repository" USING btree ("owner_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "repository_organization_id_slug_index" ON "repository" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "repository_owner_id_index" ON "repository" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "repository_organization_id_index" ON "repository" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "repository_collaborator_user_id_index" ON "repository_collaborator" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "repository_collaborator_repository_id_index" ON "repository_collaborator" USING btree ("repository_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_username_index" ON "user" USING btree ("username");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_username_unique" UNIQUE("username");