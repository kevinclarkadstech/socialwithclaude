DROP INDEX "post_comments_post_id_idx";--> statement-breakpoint
DROP INDEX "post_listing_details_status_post_id_idx";--> statement-breakpoint
DROP INDEX "posts_kind_id_idx";--> statement-breakpoint
-- Copy of posts.created_at: add, backfill existing listings, then require it.
ALTER TABLE "post_listing_details" ADD COLUMN "created_at" timestamp;--> statement-breakpoint
UPDATE "post_listing_details" SET "created_at" = "posts"."created_at" FROM "posts" WHERE "posts"."id" = "post_listing_details"."post_id";--> statement-breakpoint
ALTER TABLE "post_listing_details" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "post_comments_post_id_created_at_id_idx" ON "post_comments" ("post_id","created_at","id");--> statement-breakpoint
CREATE INDEX "post_listing_details_status_created_at_post_id_idx" ON "post_listing_details" ("status","created_at","post_id");--> statement-breakpoint
CREATE INDEX "posts_kind_created_at_id_idx" ON "posts" ("kind","created_at","id");