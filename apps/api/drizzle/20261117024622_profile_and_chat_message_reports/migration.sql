CREATE TABLE "chat_message_reports" (
	"id" text PRIMARY KEY,
	"chat_message_id" text NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"status" text DEFAULT 'open' NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_message_reports_reason_valid" CHECK ("reason" in ('spam', 'harassment', 'hate', 'violence', 'sexual_content', 'child_safety', 'impersonation', 'scam', 'prohibited_item', 'other')),
	CONSTRAINT "chat_message_reports_status_valid" CHECK ("status" in ('open', 'reviewed', 'dismissed'))
);
--> statement-breakpoint
CREATE TABLE "profile_reports" (
	"id" text PRIMARY KEY,
	"reported_user_id" text NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"status" text DEFAULT 'open' NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_reports_reason_valid" CHECK ("reason" in ('spam', 'harassment', 'hate', 'violence', 'sexual_content', 'child_safety', 'impersonation', 'scam', 'prohibited_item', 'other')),
	CONSTRAINT "profile_reports_status_valid" CHECK ("status" in ('open', 'reviewed', 'dismissed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "chat_message_reports_created_by_chat_message_id_idx" ON "chat_message_reports" ("created_by","chat_message_id");--> statement-breakpoint
CREATE INDEX "chat_message_reports_chat_message_id_idx" ON "chat_message_reports" ("chat_message_id");--> statement-breakpoint
CREATE INDEX "chat_message_reports_status_created_at_id_idx" ON "chat_message_reports" ("status","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_reports_created_by_reported_user_id_idx" ON "profile_reports" ("created_by","reported_user_id");--> statement-breakpoint
CREATE INDEX "profile_reports_reported_user_id_idx" ON "profile_reports" ("reported_user_id");--> statement-breakpoint
CREATE INDEX "profile_reports_status_created_at_id_idx" ON "profile_reports" ("status","created_at","id");--> statement-breakpoint
ALTER TABLE "chat_message_reports" ADD CONSTRAINT "chat_message_reports_chat_message_id_chat_messages_id_fkey" FOREIGN KEY ("chat_message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "chat_message_reports" ADD CONSTRAINT "chat_message_reports_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "chat_message_reports" ADD CONSTRAINT "chat_message_reports_updated_by_users_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "profile_reports" ADD CONSTRAINT "profile_reports_reported_user_id_users_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "profile_reports" ADD CONSTRAINT "profile_reports_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "profile_reports" ADD CONSTRAINT "profile_reports_updated_by_users_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "post_comment_reports" DROP CONSTRAINT "post_comment_reports_reason_valid", ADD CONSTRAINT "post_comment_reports_reason_valid" CHECK ("reason" in ('spam', 'harassment', 'hate', 'violence', 'sexual_content', 'child_safety', 'impersonation', 'scam', 'prohibited_item', 'other'));--> statement-breakpoint
ALTER TABLE "post_reports" DROP CONSTRAINT "post_reports_reason_valid", ADD CONSTRAINT "post_reports_reason_valid" CHECK ("reason" in ('spam', 'harassment', 'hate', 'violence', 'sexual_content', 'child_safety', 'impersonation', 'scam', 'prohibited_item', 'other'));