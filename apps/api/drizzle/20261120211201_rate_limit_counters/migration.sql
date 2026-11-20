CREATE TABLE "rate_limit_counters" (
	"rule" text,
	"key" text,
	"count" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "rate_limit_counters_pkey" PRIMARY KEY("rule","key")
);
--> statement-breakpoint
CREATE INDEX "rate_limit_counters_expires_at_idx" ON "rate_limit_counters" ("expires_at");