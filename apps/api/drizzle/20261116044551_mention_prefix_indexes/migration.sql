CREATE INDEX "user_profiles_username_prefix_idx" ON "user_profiles" ("username" text_pattern_ops);--> statement-breakpoint
CREATE INDEX "user_profiles_first_name_prefix_idx" ON "user_profiles" (lower("first_name") text_pattern_ops);--> statement-breakpoint
CREATE INDEX "user_profiles_last_name_prefix_idx" ON "user_profiles" (lower("last_name") text_pattern_ops);