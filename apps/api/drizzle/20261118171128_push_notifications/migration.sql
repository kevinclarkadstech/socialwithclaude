CREATE TABLE "push_tokens" (
	"token" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"session_id" text NOT NULL,
	"platform" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_tokens_platform_valid" CHECK ("platform" in ('ios', 'android'))
);
--> statement-breakpoint
ALTER TABLE "chat_members" ADD COLUMN "last_pushed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "pushed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "push_messages" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "push_comments" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "push_mentions" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "push_follows" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX "notifications_unpushed_idx" ON "notifications" ("deliver_at") WHERE "pushed_at" is null;--> statement-breakpoint
CREATE INDEX "push_tokens_user_id_idx" ON "push_tokens" ("user_id");--> statement-breakpoint
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_session_id_sessions_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE;--> statement-breakpoint
-- Notifications from before push existed are not pushed now.
UPDATE "notifications" SET "pushed_at" = now() WHERE "pushed_at" IS NULL;
