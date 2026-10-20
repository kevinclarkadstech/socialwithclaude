CREATE TABLE "chat_message_edits" (
	"id" text PRIMARY KEY,
	"message_id" text NOT NULL,
	"previous_body" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
CREATE INDEX "chat_message_edits_message_id_created_at_idx" ON "chat_message_edits" ("message_id","created_at");--> statement-breakpoint
ALTER TABLE "chat_message_edits" ADD CONSTRAINT "chat_message_edits_message_id_chat_messages_id_fkey" FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "chat_message_edits" ADD CONSTRAINT "chat_message_edits_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "chat_message_edits" ADD CONSTRAINT "chat_message_edits_updated_by_users_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;