ALTER TABLE "user_profiles" ADD COLUMN "num_posts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "num_listings" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Count what's already there: every non-deleted post, and among them the listings.
UPDATE "user_profiles" AS p SET
	"num_posts" = (SELECT count(*) FROM "posts" WHERE "posts"."created_by" = p."user_id" AND "posts"."deleted_at" IS NULL),
	"num_listings" = (
		SELECT count(*) FROM "posts"
		JOIN "post_listings" ON "post_listings"."post_id" = "posts"."id"
		WHERE "posts"."created_by" = p."user_id" AND "posts"."deleted_at" IS NULL
	);
