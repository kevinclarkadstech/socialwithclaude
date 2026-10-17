CREATE TABLE "post_reports" (
	"id" text PRIMARY KEY,
	"post_id" text NOT NULL,
	"reporter_id" text NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "post_reports_reason_valid" CHECK ("reason" in ('spam', 'harassment', 'hate', 'violence', 'sexual_content', 'scam', 'prohibited_item', 'other')),
	CONSTRAINT "post_reports_status_valid" CHECK ("status" in ('open', 'reviewed', 'dismissed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "post_reports_reporter_id_post_id_idx" ON "post_reports" ("reporter_id","post_id");--> statement-breakpoint
CREATE INDEX "post_reports_post_id_idx" ON "post_reports" ("post_id");--> statement-breakpoint
CREATE INDEX "post_reports_status_id_idx" ON "post_reports" ("status","id");--> statement-breakpoint
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_post_id_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_reporter_id_users_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE;