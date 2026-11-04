CREATE TABLE "accounts" (
	"id" text PRIMARY KEY,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text
);
--> statement-breakpoint
CREATE TABLE "chat_members" (
	"chat_id" text,
	"user_id" text,
	"last_read_at" timestamp with time zone,
	"cleared_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_members_pkey" PRIMARY KEY("chat_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" text PRIMARY KEY,
	"chat_id" text NOT NULL,
	"content" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "chats" (
	"id" text PRIMARY KEY,
	"receiver_id" text,
	"last_message_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chats_direct_not_self" CHECK ("created_by" <> "receiver_id")
);
--> statement-breakpoint
CREATE TABLE "post_comment_reports" (
	"id" text PRIMARY KEY,
	"post_comment_id" text NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"status" text DEFAULT 'open' NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_comment_reports_reason_valid" CHECK ("reason" in ('spam', 'harassment', 'hate', 'violence', 'sexual_content', 'scam', 'prohibited_item', 'other')),
	CONSTRAINT "post_comment_reports_status_valid" CHECK ("status" in ('open', 'reviewed', 'dismissed'))
);
--> statement-breakpoint
CREATE TABLE "post_comment_votes" (
	"user_id" text,
	"post_comment_id" text,
	"value" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_comment_votes_pkey" PRIMARY KEY("user_id","post_comment_id"),
	CONSTRAINT "post_comment_votes_value_valid" CHECK ("value" in (-1, 1))
);
--> statement-breakpoint
CREATE TABLE "post_comments" (
	"id" text PRIMARY KEY,
	"post_id" text NOT NULL,
	"content" text NOT NULL,
	"num_up_votes" integer DEFAULT 0 NOT NULL,
	"num_down_votes" integer DEFAULT 0 NOT NULL,
	"score" integer GENERATED ALWAYS AS ("num_up_votes" - "num_down_votes") STORED NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "post_comments_num_up_votes_non_negative" CHECK ("num_up_votes" >= 0),
	CONSTRAINT "post_comments_num_down_votes_non_negative" CHECK ("num_down_votes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "post_listings" (
	"post_id" text PRIMARY KEY,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"price_type" text NOT NULL,
	"price_cents" integer,
	"is_negotiable" boolean DEFAULT false NOT NULL,
	"condition" text NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_listings_price_type_valid" CHECK ("price_type" in ('fixed', 'free', 'multiple')),
	CONSTRAINT "post_listings_condition_valid" CHECK ("condition" in ('new', 'used')),
	CONSTRAINT "post_listings_status_valid" CHECK ("status" in ('available', 'pending', 'sold')),
	CONSTRAINT "post_listings_price_positive" CHECK ("price_cents" > 0),
	CONSTRAINT "post_listings_price_matches_type" CHECK (("price_type" = 'fixed') = ("price_cents" is not null))
);
--> statement-breakpoint
CREATE TABLE "post_reports" (
	"id" text PRIMARY KEY,
	"post_id" text NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"status" text DEFAULT 'open' NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_reports_reason_valid" CHECK ("reason" in ('spam', 'harassment', 'hate', 'violence', 'sexual_content', 'scam', 'prohibited_item', 'other')),
	CONSTRAINT "post_reports_status_valid" CHECK ("status" in ('open', 'reviewed', 'dismissed'))
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" text PRIMARY KEY,
	"content" text NOT NULL,
	"num_saves" integer DEFAULT 0 NOT NULL,
	"num_comments" integer DEFAULT 0 NOT NULL,
	"num_shares" integer DEFAULT 0 NOT NULL,
	"num_reactions" integer DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "posts_num_saves_non_negative" CHECK ("num_saves" >= 0),
	CONSTRAINT "posts_num_comments_non_negative" CHECK ("num_comments" >= 0),
	CONSTRAINT "posts_num_shares_non_negative" CHECK ("num_shares" >= 0),
	CONSTRAINT "posts_num_reactions_non_negative" CHECK ("num_reactions" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL UNIQUE,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_blocks" (
	"user_id" text,
	"blocked_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_blocks_pkey" PRIMARY KEY("user_id","blocked_user_id"),
	CONSTRAINT "user_blocks_no_self_block" CHECK ("user_id" <> "blocked_user_id")
);
--> statement-breakpoint
CREATE TABLE "user_feedback" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"category" text NOT NULL,
	"message" text NOT NULL,
	"page_url" text,
	"user_agent" text,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_feedback_category_valid" CHECK ("category" in ('bug', 'idea', 'other')),
	CONSTRAINT "user_feedback_status_valid" CHECK ("status" in ('new', 'read', 'done'))
);
--> statement-breakpoint
CREATE TABLE "user_follows" (
	"follower_id" text,
	"following_id" text,
	"status" text DEFAULT 'accepted' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_follows_pkey" PRIMARY KEY("follower_id","following_id"),
	CONSTRAINT "user_follows_no_self_follow" CHECK ("follower_id" <> "following_id"),
	CONSTRAINT "user_follows_status_valid" CHECK ("status" in ('pending', 'accepted', 'denied'))
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" text PRIMARY KEY,
	"username" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"about" text,
	"num_followers" integer DEFAULT 0 NOT NULL,
	"num_following" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_num_followers_non_negative" CHECK ("num_followers" >= 0),
	CONSTRAINT "user_profiles_num_following_non_negative" CHECK ("num_following" >= 0)
);
--> statement-breakpoint
CREATE TABLE "user_saves" (
	"user_id" text NOT NULL,
	"post_id" text,
	"post_comment_id" text,
	"chat_message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_saves_one_target" CHECK (num_nonnulls("post_id", "post_comment_id", "chat_message_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY,
	"dark_mode_enabled" boolean DEFAULT false NOT NULL,
	"followers_can_tag" boolean DEFAULT true NOT NULL,
	"non_followers_can_tag" boolean DEFAULT false NOT NULL,
	"profile_visibility" text DEFAULT 'public' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_profile_visibility_valid" CHECK ("profile_visibility" in ('public', 'followers'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_account_idx" ON "accounts" ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" ("user_id");--> statement-breakpoint
CREATE INDEX "chat_members_user_id_created_at_idx" ON "chat_members" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "chat_messages_chat_id_created_at_id_idx" ON "chat_messages" ("chat_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "chats_direct_pair_idx" ON "chats" (least("created_by", "receiver_id"),greatest("created_by", "receiver_id")) WHERE "receiver_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "post_comment_reports_created_by_post_comment_id_idx" ON "post_comment_reports" ("created_by","post_comment_id");--> statement-breakpoint
CREATE INDEX "post_comment_reports_post_comment_id_idx" ON "post_comment_reports" ("post_comment_id");--> statement-breakpoint
CREATE INDEX "post_comment_reports_status_created_at_id_idx" ON "post_comment_reports" ("status","created_at","id");--> statement-breakpoint
CREATE INDEX "post_comment_votes_post_comment_id_idx" ON "post_comment_votes" ("post_comment_id");--> statement-breakpoint
CREATE INDEX "post_comments_post_id_created_at_id_idx" ON "post_comments" ("post_id","created_at","id");--> statement-breakpoint
CREATE INDEX "post_listings_status_created_at_post_id_idx" ON "post_listings" ("status","created_at","post_id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_reports_created_by_post_id_idx" ON "post_reports" ("created_by","post_id");--> statement-breakpoint
CREATE INDEX "post_reports_post_id_idx" ON "post_reports" ("post_id");--> statement-breakpoint
CREATE INDEX "post_reports_status_created_at_id_idx" ON "post_reports" ("status","created_at","id");--> statement-breakpoint
CREATE INDEX "posts_created_at_id_idx" ON "posts" ("created_at","id");--> statement-breakpoint
CREATE INDEX "posts_created_by_created_at_id_idx" ON "posts" ("created_by","created_at","id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" ("user_id");--> statement-breakpoint
CREATE INDEX "user_blocks_user_id_created_at_idx" ON "user_blocks" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "user_blocks_blocked_user_id_idx" ON "user_blocks" ("blocked_user_id");--> statement-breakpoint
CREATE INDEX "user_feedback_status_created_at_id_idx" ON "user_feedback" ("status","created_at","id");--> statement-breakpoint
CREATE INDEX "user_feedback_user_id_idx" ON "user_feedback" ("user_id");--> statement-breakpoint
CREATE INDEX "user_follows_following_id_status_created_at_idx" ON "user_follows" ("following_id","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_profiles_username_lower_idx" ON "user_profiles" (lower("username"));--> statement-breakpoint
CREATE UNIQUE INDEX "user_saves_user_id_post_id_idx" ON "user_saves" ("user_id","post_id") WHERE "post_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "user_saves_user_id_post_comment_id_idx" ON "user_saves" ("user_id","post_comment_id") WHERE "post_comment_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "user_saves_user_id_chat_message_id_idx" ON "user_saves" ("user_id","chat_message_id") WHERE "chat_message_id" is not null;--> statement-breakpoint
CREATE INDEX "user_saves_user_id_created_at_idx" ON "user_saves" ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_idx" ON "users" (lower("email"));--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" ("identifier");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_chat_id_chats_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chat_id_chats_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_updated_by_users_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_receiver_id_users_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_updated_by_users_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "post_comment_reports" ADD CONSTRAINT "post_comment_reports_post_comment_id_post_comments_id_fkey" FOREIGN KEY ("post_comment_id") REFERENCES "post_comments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_comment_reports" ADD CONSTRAINT "post_comment_reports_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_comment_reports" ADD CONSTRAINT "post_comment_reports_updated_by_users_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "post_comment_votes" ADD CONSTRAINT "post_comment_votes_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_comment_votes" ADD CONSTRAINT "post_comment_votes_post_comment_id_post_comments_id_fkey" FOREIGN KEY ("post_comment_id") REFERENCES "post_comments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_post_id_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_updated_by_users_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "post_listings" ADD CONSTRAINT "post_listings_post_id_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_post_id_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_updated_by_users_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_updated_by_users_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_user_id_users_id_fkey" FOREIGN KEY ("blocked_user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_users_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_following_id_users_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_saves" ADD CONSTRAINT "user_saves_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_saves" ADD CONSTRAINT "user_saves_post_id_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_saves" ADD CONSTRAINT "user_saves_post_comment_id_post_comments_id_fkey" FOREIGN KEY ("post_comment_id") REFERENCES "post_comments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_saves" ADD CONSTRAINT "user_saves_chat_message_id_chat_messages_id_fkey" FOREIGN KEY ("chat_message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;