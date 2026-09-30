CREATE TABLE "follows" (
	"follower_id" text,
	"following_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "follows_pkey" PRIMARY KEY("follower_id","following_id"),
	CONSTRAINT "follows_no_self_follow" CHECK ("follower_id" <> "following_id")
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
CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY,
	"email_notifications" boolean DEFAULT true NOT NULL,
	"private_profile" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "verifications" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "verifications" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "follows_following_id_idx" ON "follows" ("following_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_username_lower_idx" ON "profiles" (lower("username"));--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_users_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_users_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;