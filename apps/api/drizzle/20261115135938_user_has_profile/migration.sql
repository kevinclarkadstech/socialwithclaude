ALTER TABLE "users" ADD COLUMN "has_profile" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Users who already finished sign-up.
UPDATE "users" SET "has_profile" = true WHERE "id" IN (SELECT "user_id" FROM "user_profiles");
