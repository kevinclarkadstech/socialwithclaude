CREATE TABLE "post_comment_reports" (
	"id" text PRIMARY KEY,
	"comment_id" text NOT NULL,
	"reporter_id" text NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "post_comment_reports_reason_valid" CHECK ("reason" in ('spam', 'harassment', 'hate', 'violence', 'sexual_content', 'scam', 'prohibited_item', 'other')),
	CONSTRAINT "post_comment_reports_status_valid" CHECK ("status" in ('open', 'reviewed', 'dismissed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "post_comment_reports_reporter_id_comment_id_idx" ON "post_comment_reports" ("reporter_id","comment_id");--> statement-breakpoint
CREATE INDEX "post_comment_reports_comment_id_idx" ON "post_comment_reports" ("comment_id");--> statement-breakpoint
CREATE INDEX "post_comment_reports_status_id_idx" ON "post_comment_reports" ("status","id");--> statement-breakpoint
ALTER TABLE "post_comment_reports" ADD CONSTRAINT "post_comment_reports_comment_id_post_comments_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "post_comments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_comment_reports" ADD CONSTRAINT "post_comment_reports_reporter_id_users_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE;