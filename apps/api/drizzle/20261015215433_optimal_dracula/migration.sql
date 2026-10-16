CREATE TABLE "saved_posts" (
	"user_id" text,
	"post_id" text,
	"id" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "saved_posts_pkey" PRIMARY KEY("user_id","post_id")
);
--> statement-breakpoint
CREATE INDEX "saved_posts_user_id_id_idx" ON "saved_posts" ("user_id","id");--> statement-breakpoint
CREATE INDEX "saved_posts_post_id_idx" ON "saved_posts" ("post_id");--> statement-breakpoint
ALTER TABLE "saved_posts" ADD CONSTRAINT "saved_posts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "saved_posts" ADD CONSTRAINT "saved_posts_post_id_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE;