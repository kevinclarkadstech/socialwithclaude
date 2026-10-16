CREATE TABLE "accounts" (
	"id" text PRIMARY KEY,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"follower_id" text,
	"following_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "follows_pkey" PRIMARY KEY("follower_id","following_id"),
	CONSTRAINT "follows_no_self_follow" CHECK ("follower_id" <> "following_id")
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"post_id" text PRIMARY KEY,
	"title" text NOT NULL,
	"price_type" text NOT NULL,
	"price_cents" integer,
	"condition" text,
	"status" text DEFAULT 'available' NOT NULL,
	"location" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "listings_price_type_valid" CHECK ("price_type" in ('fixed', 'negotiable', 'free', 'multiple')),
	CONSTRAINT "listings_condition_valid" CHECK ("condition" in ('new', 'used')),
	CONSTRAINT "listings_status_valid" CHECK ("status" in ('available', 'pending', 'sold')),
	CONSTRAINT "listings_price_non_negative" CHECK ("price_cents" >= 0),
	CONSTRAINT "listings_price_matches_type" CHECK (("price_type" in ('fixed', 'negotiable')) = ("price_cents" is not null))
);
--> statement-breakpoint
CREATE TABLE "post_comment_votes" (
	"user_id" text,
	"comment_id" text,
	"value" smallint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "post_comment_votes_pkey" PRIMARY KEY("user_id","comment_id"),
	CONSTRAINT "post_comment_votes_value_valid" CHECK ("value" in (-1, 1))
);
--> statement-breakpoint
CREATE TABLE "post_comments" (
	"id" text PRIMARY KEY,
	"post_id" text NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"num_upvotes" integer DEFAULT 0 NOT NULL,
	"num_downvotes" integer DEFAULT 0 NOT NULL,
	"score" integer GENERATED ALWAYS AS ("num_upvotes" - "num_downvotes") STORED NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "post_comments_num_upvotes_non_negative" CHECK ("num_upvotes" >= 0),
	CONSTRAINT "post_comments_num_downvotes_non_negative" CHECK ("num_downvotes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "post_media" (
	"id" text PRIMARY KEY,
	"post_id" text NOT NULL,
	"position" integer NOT NULL,
	"storage_key" text NOT NULL UNIQUE,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"alt_text" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "post_media_position_range" CHECK ("position" between 0 and 9),
	CONSTRAINT "post_media_mime_type_valid" CHECK ("mime_type" in ('image/jpeg', 'image/png', 'image/webp')),
	CONSTRAINT "post_media_size_valid" CHECK ("size_bytes" > 0 and "size_bytes" <= 1048576),
	CONSTRAINT "post_media_dimensions_positive" CHECK ("width" > 0 and "height" > 0)
);
--> statement-breakpoint
CREATE TABLE "post_saves" (
	"user_id" text,
	"post_id" text,
	"id" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "post_saves_pkey" PRIMARY KEY("user_id","post_id")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" text PRIMARY KEY,
	"author_id" text NOT NULL,
	"kind" text DEFAULT 'post' NOT NULL,
	"body" text NOT NULL,
	"num_comments" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "posts_num_comments_non_negative" CHECK ("num_comments" >= 0),
	CONSTRAINT "posts_kind_valid" CHECK ("kind" in ('post', 'listing'))
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY,
	"username" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"bio" text,
	"avatar_url" text,
	"num_followers" integer DEFAULT 0 NOT NULL,
	"num_following" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_num_followers_non_negative" CHECK ("num_followers" >= 0),
	CONSTRAINT "profiles_num_following_non_negative" CHECK ("num_following" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY,
	"email_notifications" boolean DEFAULT true NOT NULL,
	"private_profile" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX "follows_following_id_idx" ON "follows" ("following_id");--> statement-breakpoint
CREATE INDEX "listings_status_post_id_idx" ON "listings" ("status","post_id");--> statement-breakpoint
CREATE INDEX "post_comment_votes_comment_id_idx" ON "post_comment_votes" ("comment_id");--> statement-breakpoint
CREATE INDEX "post_comments_post_id_idx" ON "post_comments" ("post_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_media_post_id_position_idx" ON "post_media" ("post_id","position");--> statement-breakpoint
CREATE INDEX "post_saves_user_id_id_idx" ON "post_saves" ("user_id","id");--> statement-breakpoint
CREATE INDEX "post_saves_post_id_idx" ON "post_saves" ("post_id");--> statement-breakpoint
CREATE INDEX "posts_author_id_idx" ON "posts" ("author_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_username_lower_idx" ON "profiles" (lower("username"));--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_users_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_users_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_post_id_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_comment_votes" ADD CONSTRAINT "post_comment_votes_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_comment_votes" ADD CONSTRAINT "post_comment_votes_comment_id_post_comments_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "post_comments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_post_id_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_author_id_users_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_post_id_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_saves" ADD CONSTRAINT "post_saves_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_saves" ADD CONSTRAINT "post_saves_post_id_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;