ALTER TABLE "posts" ADD COLUMN "type" text DEFAULT 'post' NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_type_valid" CHECK ("type" in ('post', 'listing'));--> statement-breakpoint
-- Posts with listing details are listings.
UPDATE "posts" SET "type" = 'listing' WHERE "id" IN (SELECT "post_id" FROM "post_listings");
