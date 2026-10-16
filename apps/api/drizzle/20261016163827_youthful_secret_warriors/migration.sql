CREATE TABLE "listings" (
	"post_id" text PRIMARY KEY,
	"title" text NOT NULL,
	"price_type" text NOT NULL,
	"price_cents" integer,
	"condition" text,
	"status" text DEFAULT 'available' NOT NULL,
	"location" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "listings_price_type_valid" CHECK ("price_type" in ('fixed', 'negotiable', 'free', 'multiple')),
	CONSTRAINT "listings_condition_valid" CHECK ("condition" in ('new', 'used')),
	CONSTRAINT "listings_status_valid" CHECK ("status" in ('available', 'pending', 'sold')),
	CONSTRAINT "listings_price_non_negative" CHECK ("price_cents" >= 0),
	CONSTRAINT "listings_price_matches_type" CHECK (("price_type" in ('fixed', 'negotiable')) = ("price_cents" is not null))
);
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "kind" text DEFAULT 'post' NOT NULL;--> statement-breakpoint
CREATE INDEX "listings_status_post_id_idx" ON "listings" ("status","post_id");--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_post_id_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_kind_valid" CHECK ("kind" in ('post', 'listing'));