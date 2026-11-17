CREATE TABLE "post_comment_photos" (
	"id" text PRIMARY KEY,
	"post_comment_id" text NOT NULL UNIQUE,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"placeholder" text,
	"created_by" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_comment_photos_dimensions_positive" CHECK ("width" > 0 and "height" > 0)
);
--> statement-breakpoint
ALTER TABLE "post_comment_photos" ADD CONSTRAINT "post_comment_photos_post_comment_id_post_comments_id_fkey" FOREIGN KEY ("post_comment_id") REFERENCES "post_comments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_comment_photos" ADD CONSTRAINT "post_comment_photos_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_comment_photos" ADD CONSTRAINT "post_comment_photos_updated_by_users_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;