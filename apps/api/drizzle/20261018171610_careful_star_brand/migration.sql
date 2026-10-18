ALTER TABLE "post_comment_reports" RENAME COLUMN "reporter_id" TO "created_by";--> statement-breakpoint
ALTER TABLE "post_comments" RENAME COLUMN "author_id" TO "created_by";--> statement-breakpoint
ALTER TABLE "post_reports" RENAME COLUMN "reporter_id" TO "created_by";--> statement-breakpoint
ALTER TABLE "posts" RENAME COLUMN "author_id" TO "created_by";--> statement-breakpoint
ALTER TABLE "user_feedback" RENAME COLUMN "user_id" TO "created_by";--> statement-breakpoint
ALTER INDEX "post_comment_reports_reporter_id_comment_id_idx" RENAME TO "post_comment_reports_created_by_comment_id_idx";--> statement-breakpoint
ALTER INDEX "post_reports_reporter_id_post_id_idx" RENAME TO "post_reports_created_by_post_id_idx";--> statement-breakpoint
ALTER INDEX "posts_author_id_idx" RENAME TO "posts_created_by_id_idx";--> statement-breakpoint
ALTER INDEX "user_feedback_user_id_idx" RENAME TO "user_feedback_created_by_idx";--> statement-breakpoint
ALTER TABLE "post_comment_reports" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "post_comments" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "post_reports" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "user_feedback" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "user_feedback" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
-- Existing rows: last updated by their creator. (Who deleted an already
-- deleted comment wasn't recorded, so it's the creator too.)
UPDATE "posts" SET "updated_by" = "created_by";--> statement-breakpoint
UPDATE "post_comments" SET "updated_by" = "created_by";--> statement-breakpoint
UPDATE "post_reports" SET "updated_by" = "created_by";--> statement-breakpoint
UPDATE "post_comment_reports" SET "updated_by" = "created_by";--> statement-breakpoint
UPDATE "user_feedback" SET "updated_by" = "created_by", "updated_at" = "created_at";--> statement-breakpoint
ALTER TABLE "post_comment_reports" ADD CONSTRAINT "post_comment_reports_updated_by_users_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_updated_by_users_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_updated_by_users_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_updated_by_users_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_updated_by_users_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;