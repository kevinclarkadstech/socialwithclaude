CREATE TABLE "media" (
	"id" text PRIMARY KEY,
	"path" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"placeholder" text,
	"created_by" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_dimensions_positive" CHECK ("width" > 0 and "height" > 0)
);
--> statement-breakpoint
CREATE TABLE "post_media" (
	"post_id" text,
	"media_id" text,
	"position" integer NOT NULL,
	"caption" text,
	CONSTRAINT "post_media_pkey" PRIMARY KEY("post_id","media_id"),
	CONSTRAINT "post_media_position_non_negative" CHECK ("position" >= 0)
);
--> statement-breakpoint
CREATE INDEX "media_created_at_idx" ON "media" ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "post_media_media_id_idx" ON "post_media" ("media_id");--> statement-breakpoint
CREATE INDEX "post_media_post_id_position_idx" ON "post_media" ("post_id","position");--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_updated_by_users_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_post_id_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_media_id_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE;