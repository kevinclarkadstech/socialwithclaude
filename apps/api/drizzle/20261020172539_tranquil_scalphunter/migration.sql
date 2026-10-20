CREATE TABLE "post_comment_edits" (
	"id" text PRIMARY KEY,
	"comment_id" text NOT NULL,
	"previous_body" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "post_comment_edits_comment_id_created_at_idx" ON "post_comment_edits" ("comment_id","created_at");--> statement-breakpoint
ALTER TABLE "post_comment_edits" ADD CONSTRAINT "post_comment_edits_comment_id_post_comments_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "post_comments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_comment_edits" ADD CONSTRAINT "post_comment_edits_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_comment_edits" ADD CONSTRAINT "post_comment_edits_updated_by_users_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;