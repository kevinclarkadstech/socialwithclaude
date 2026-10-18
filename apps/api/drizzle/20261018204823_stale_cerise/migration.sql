ALTER TABLE "posts" ADD COLUMN "num_saves" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Existing saves.
UPDATE "posts" SET "num_saves" = s."count" FROM (SELECT "post_id", count(*) AS "count" FROM "post_saves" GROUP BY "post_id") s WHERE s."post_id" = "posts"."id";--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_num_saves_non_negative" CHECK ("num_saves" >= 0);