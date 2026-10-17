CREATE TABLE "user_feedback" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"category" text NOT NULL,
	"message" text NOT NULL,
	"page_url" text,
	"user_agent" text,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_feedback_category_valid" CHECK ("category" in ('bug', 'idea', 'other')),
	CONSTRAINT "user_feedback_status_valid" CHECK ("status" in ('new', 'read', 'done'))
);
--> statement-breakpoint
CREATE INDEX "user_feedback_status_id_idx" ON "user_feedback" ("status","id");--> statement-breakpoint
CREATE INDEX "user_feedback_user_id_idx" ON "user_feedback" ("user_id");--> statement-breakpoint
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;