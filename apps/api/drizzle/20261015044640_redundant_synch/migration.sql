ALTER TABLE "posts" ADD COLUMN "num_comments" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_num_comments_non_negative" CHECK ("num_comments" >= 0);