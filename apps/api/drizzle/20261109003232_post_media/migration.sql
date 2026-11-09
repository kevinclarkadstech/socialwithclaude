CREATE TABLE "post_media" (
	"id" text PRIMARY KEY,
	"post_id" text,
	"position" integer DEFAULT 0 NOT NULL,
	"path" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"placeholder" text,
	"caption" text,
	"created_by" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_media_dimensions_positive" CHECK ("width" > 0 and "height" > 0),
	CONSTRAINT "post_media_position_non_negative" CHECK ("position" >= 0)
);
--> statement-breakpoint
CREATE INDEX "post_media_post_id_position_idx" ON "post_media" ("post_id","position");--> statement-breakpoint
CREATE INDEX "post_media_unattached_created_at_idx" ON "post_media" ("created_at") WHERE "post_id" is null;--> statement-breakpoint
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_post_id_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_updated_by_users_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;