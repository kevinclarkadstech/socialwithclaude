DROP INDEX "comments_post_id_score_idx";--> statement-breakpoint
CREATE INDEX "comments_post_id_score_idx" ON "comments" ("post_id","score" DESC,"id");