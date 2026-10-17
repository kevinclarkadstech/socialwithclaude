CREATE TABLE "user_blocks" (
	"user_id" text,
	"blocked_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_blocks_pkey" PRIMARY KEY("user_id","blocked_user_id"),
	CONSTRAINT "user_blocks_no_self_block" CHECK ("user_id" <> "blocked_user_id")
);
--> statement-breakpoint
ALTER TABLE "follows" RENAME TO "user_follows";--> statement-breakpoint
ALTER TABLE "user_follows" RENAME CONSTRAINT "follows_no_self_follow" TO "user_follows_no_self_follow";--> statement-breakpoint
ALTER INDEX "follows_following_id_idx" RENAME TO "user_follows_following_id_idx";--> statement-breakpoint
CREATE INDEX "user_blocks_blocked_user_id_idx" ON "user_blocks" ("blocked_user_id");--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_user_id_users_id_fkey" FOREIGN KEY ("blocked_user_id") REFERENCES "users"("id") ON DELETE CASCADE;