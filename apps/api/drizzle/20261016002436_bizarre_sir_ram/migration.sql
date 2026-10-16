CREATE TABLE "comment_votes" (
	"user_id" text,
	"comment_id" text,
	"value" smallint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "comment_votes_pkey" PRIMARY KEY("user_id","comment_id"),
	CONSTRAINT "comment_votes_value_valid" CHECK ("value" in (-1, 1))
);
--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "num_upvotes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "num_downvotes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "score" integer GENERATED ALWAYS AS ("num_upvotes" - "num_downvotes") STORED;--> statement-breakpoint
CREATE INDEX "comment_votes_comment_id_idx" ON "comment_votes" ("comment_id");--> statement-breakpoint
CREATE INDEX "comments_post_id_score_idx" ON "comments" ("post_id","score" DESC NULLS LAST,"id");--> statement-breakpoint
ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_comment_id_comments_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_num_upvotes_non_negative" CHECK ("num_upvotes" >= 0);--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_num_downvotes_non_negative" CHECK ("num_downvotes" >= 0);