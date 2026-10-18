ALTER TABLE "chat_messages" RENAME COLUMN "sender_id" TO "created_by";--> statement-breakpoint
ALTER TABLE "chats" RENAME COLUMN "initiator_id" TO "created_by";--> statement-breakpoint
ALTER TABLE "chats" DROP CONSTRAINT "chats_direct_pair_complete";--> statement-breakpoint
ALTER TABLE "chat_members" ADD COLUMN "cleared_at" timestamp;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "chats" ALTER COLUMN "created_by" SET NOT NULL;--> statement-breakpoint
-- Existing rows: last updated by their creator, when they were created.
UPDATE "chats" SET "updated_by" = "created_by", "updated_at" = "created_at";--> statement-breakpoint
UPDATE "chat_messages" SET "updated_by" = "created_by", "updated_at" = "created_at";--> statement-breakpoint
DROP INDEX "chats_direct_pair_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "chats_direct_pair_idx" ON "chats" (least("created_by", "receiver_id"),greatest("created_by", "receiver_id")) WHERE "receiver_id" is not null;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_updated_by_users_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_updated_by_users_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "chats" DROP CONSTRAINT "chats_direct_not_self", ADD CONSTRAINT "chats_direct_not_self" CHECK ("created_by" <> "receiver_id");