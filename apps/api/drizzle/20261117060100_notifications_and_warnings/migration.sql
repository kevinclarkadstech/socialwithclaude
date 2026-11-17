CREATE TABLE "notifications" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"data" jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_type_valid" CHECK ("type" in ('warning', 'report_resolved'))
);
--> statement-breakpoint
CREATE INDEX "notifications_user_id_created_at_id_idx" ON "notifications" ("user_id","created_at","id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_unread_idx" ON "notifications" ("user_id") WHERE "read_at" is null;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "moderation_actions" DROP CONSTRAINT "moderation_actions_action_valid", ADD CONSTRAINT "moderation_actions_action_valid" CHECK ("action" in ('dismiss_reports', 'remove_content', 'mark_reviewed', 'ban_user', 'unban_user', 'warn_user'));