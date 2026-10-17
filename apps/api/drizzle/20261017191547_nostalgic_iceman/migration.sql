ALTER TABLE "user_settings" ADD COLUMN "dark_mode_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "followers_can_tag" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "non_followers_can_tag" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "profile_visibility" text DEFAULT 'public' NOT NULL;--> statement-breakpoint
-- private_profile is replaced by profile_visibility: carry existing choices over.
UPDATE "user_settings" SET "profile_visibility" = 'followers' WHERE "private_profile";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "email_notifications";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "private_profile";--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_profile_visibility_valid" CHECK ("profile_visibility" in ('public', 'followers'));