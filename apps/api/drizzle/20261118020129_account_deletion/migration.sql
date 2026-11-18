CREATE TABLE "banned_emails" (
	"email_hash" text PRIMARY KEY,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_message_reports" DROP CONSTRAINT "chat_message_reports_chat_message_id_chat_messages_id_fkey";--> statement-breakpoint
ALTER TABLE "chat_message_reports" DROP CONSTRAINT "chat_message_reports_created_by_users_id_fkey";--> statement-breakpoint
ALTER TABLE "moderation_actions" DROP CONSTRAINT "moderation_actions_subject_user_id_users_id_fkey";--> statement-breakpoint
ALTER TABLE "moderation_actions" DROP CONSTRAINT "moderation_actions_created_by_users_id_fkey";--> statement-breakpoint
ALTER TABLE "post_comment_reports" DROP CONSTRAINT "post_comment_reports_post_comment_id_post_comments_id_fkey";--> statement-breakpoint
ALTER TABLE "post_comment_reports" DROP CONSTRAINT "post_comment_reports_created_by_users_id_fkey";--> statement-breakpoint
ALTER TABLE "post_reports" DROP CONSTRAINT "post_reports_post_id_posts_id_fkey";--> statement-breakpoint
ALTER TABLE "post_reports" DROP CONSTRAINT "post_reports_created_by_users_id_fkey";--> statement-breakpoint
ALTER TABLE "profile_reports" DROP CONSTRAINT "profile_reports_reported_user_id_users_id_fkey";--> statement-breakpoint
ALTER TABLE "profile_reports" DROP CONSTRAINT "profile_reports_created_by_users_id_fkey";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deletion_scheduled_at" timestamp with time zone;