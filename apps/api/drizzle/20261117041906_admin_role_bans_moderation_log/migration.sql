CREATE TABLE "moderation_actions" (
	"id" text PRIMARY KEY,
	"action" text NOT NULL,
	"subject_user_id" text NOT NULL,
	"target_kind" text,
	"target_id" text,
	"note" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "moderation_actions_action_valid" CHECK ("action" in ('dismiss_reports', 'remove_content', 'mark_reviewed', 'ban_user', 'unban_user')),
	CONSTRAINT "moderation_actions_target_kind_valid" CHECK ("target_kind" is null or "target_kind" in ('post', 'postComment', 'profile', 'chatMessage'))
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "impersonated_by" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ban_expires" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "moderation_actions_subject_user_id_created_at_idx" ON "moderation_actions" ("subject_user_id","created_at");--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_subject_user_id_users_id_fkey" FOREIGN KEY ("subject_user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_valid" CHECK ("role" in ('user', 'admin'));