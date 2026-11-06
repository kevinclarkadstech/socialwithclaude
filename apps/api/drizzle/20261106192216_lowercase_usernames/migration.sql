DROP INDEX "user_profiles_username_lower_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "user_profiles_username_idx" ON "user_profiles" ("username");--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_username_lowercase" CHECK ("username" = lower("username"));