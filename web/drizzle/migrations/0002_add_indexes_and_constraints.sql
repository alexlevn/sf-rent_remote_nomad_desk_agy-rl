CREATE INDEX IF NOT EXISTS "host_profiles_status_idx" ON "host_profiles" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "locations_active_position_idx" ON "locations" USING btree ("is_active", "position");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "properties_host_id_idx" ON "properties" USING btree ("host_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "properties_location_id_idx" ON "properties" USING btree ("location_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "properties_status_featured_idx" ON "properties" USING btree ("status", "featured_position");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "properties_lower_city_idx" ON "properties" USING btree (lower("city"));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blocked_dates_property_dates_idx" ON "blocked_dates" USING btree ("property_id", "start_date", "end_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reservations_user_id_idx" ON "reservations" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reservations_property_status_idx" ON "reservations" USING btree ("property_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reservations_status_respond_by_idx" ON "reservations" USING btree ("status", "respond_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reservations_created_at_idx" ON "reservations" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "travel_guides_status_position_idx" ON "travel_guides" USING btree ("status", "position");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blog_posts_status_position_idx" ON "blog_posts" USING btree ("status", "position");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "community_videos_active_position_idx" ON "community_videos" USING btree ("is_active", "position");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_uploaded_by_created_at_idx" ON "media" USING btree ("uploaded_by", "created_at");
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blocked_dates_valid_range_chk') THEN
    ALTER TABLE "blocked_dates" ADD CONSTRAINT "blocked_dates_valid_range_chk" CHECK ("end_date" > "start_date");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservations_valid_dates_chk') THEN
    ALTER TABLE "reservations" ADD CONSTRAINT "reservations_valid_dates_chk" CHECK ("move_out_date" > "move_in_date");
  END IF;
END $$;
