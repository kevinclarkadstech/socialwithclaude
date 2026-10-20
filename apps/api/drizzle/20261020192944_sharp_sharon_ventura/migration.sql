ALTER TABLE "user_follows" ADD COLUMN "status" text DEFAULT 'accepted' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_follows" ADD COLUMN "withdrawn" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_follows" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "user_follows_pending_requests_idx" ON "user_follows" ("following_id","created_at","follower_id") WHERE "status" = 'pending';--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_status_valid" CHECK ("status" in ('pending', 'accepted', 'denied'));--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_withdrawn_only_denied" CHECK (not "withdrawn" or "status" = 'denied');