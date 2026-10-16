CREATE TABLE "media" (
	"id" text PRIMARY KEY,
	"post_id" text NOT NULL,
	"position" integer NOT NULL,
	"storage_key" text NOT NULL UNIQUE,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"alt_text" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "media_position_range" CHECK ("position" between 0 and 9),
	CONSTRAINT "media_mime_type_valid" CHECK ("mime_type" in ('image/jpeg', 'image/png', 'image/webp')),
	CONSTRAINT "media_size_valid" CHECK ("size_bytes" > 0 and "size_bytes" <= 1048576),
	CONSTRAINT "media_dimensions_positive" CHECK ("width" > 0 and "height" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "media_post_id_position_idx" ON "media" ("post_id","position");--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_post_id_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE;