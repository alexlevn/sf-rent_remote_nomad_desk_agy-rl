CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
CREATE TABLE "blocked_dates" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"reason" varchar(150),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(150) NOT NULL,
	"title" varchar(255) NOT NULL,
	"excerpt" text,
	"content" text,
	"cover_image" varchar(255),
	"author" varchar(100),
	"read_time" varchar(50),
	"category" varchar(100),
	"status" varchar(20) DEFAULT 'published' NOT NULL,
	"seo_title" varchar(255),
	"seo_description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100),
	"icon" varchar(100),
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "community_videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"author" varchar(100),
	"platform" varchar(50) DEFAULT 'instagram' NOT NULL,
	"video_url" varchar(255),
	"embed_url" varchar(255),
	"thumbnail_url" varchar(255),
	"aspect" varchar(20),
	"is_active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"property_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "host_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"display_name" varchar(150) NOT NULL,
	"slug" varchar(150),
	"phone" varchar(50) NOT NULL,
	"website" varchar(255),
	"cities" text,
	"portfolio_size" integer,
	"bio" text,
	"avatar" varchar(255),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "host_profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "host_profiles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" integer PRIMARY KEY NOT NULL,
	"city" varchar(100) NOT NULL,
	"name" varchar(150) NOT NULL,
	"slug" varchar(150),
	"country" varchar(100) NOT NULL,
	"country_code" varchar(10) NOT NULL,
	"continent" varchar(50),
	"properties_count" integer DEFAULT 0 NOT NULL,
	"description" text,
	"image" varchar(255),
	"center" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" integer PRIMARY KEY NOT NULL,
	"host_id" integer,
	"reference" varchar(50),
	"title" varchar(255) NOT NULL,
	"slug" varchar(255),
	"description" text,
	"price_per_month" integer NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"location_id" integer,
	"city" varchar(100) NOT NULL,
	"country" varchar(100),
	"neighborhood" varchar(150),
	"address" varchar(255),
	"bedrooms" integer DEFAULT 1 NOT NULL,
	"bathrooms" integer DEFAULT 1 NOT NULL,
	"beds_count" integer DEFAULT 1 NOT NULL,
	"total_surface" integer,
	"max_guests" integer DEFAULT 2 NOT NULL,
	"kitchen" boolean DEFAULT true NOT NULL,
	"laundry" boolean DEFAULT true NOT NULL,
	"balcony" boolean DEFAULT false NOT NULL,
	"pet_friendly" boolean DEFAULT false NOT NULL,
	"pool" boolean DEFAULT false NOT NULL,
	"gym" boolean DEFAULT false NOT NULL,
	"terrace" boolean DEFAULT false NOT NULL,
	"workstation" jsonb,
	"house_rules" text,
	"check_in_start" varchar(20) DEFAULT '15:00' NOT NULL,
	"check_out" varchar(20) DEFAULT '11:00' NOT NULL,
	"minimum_stay_nights" integer DEFAULT 30 NOT NULL,
	"is_direct_booking" boolean DEFAULT false NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"featured_position" integer,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "properties_reference_unique" UNIQUE("reference"),
	CONSTRAINT "properties_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(20) NOT NULL,
	"user_id" integer NOT NULL,
	"property_id" integer NOT NULL,
	"move_in_date" date NOT NULL,
	"move_out_date" date NOT NULL,
	"nights" integer NOT NULL,
	"monthly_rent" integer NOT NULL,
	"rent_amount" integer NOT NULL,
	"workstation_fee" integer DEFAULT 0 NOT NULL,
	"total_amount" integer NOT NULL,
	"commission_amount" integer NOT NULL,
	"host_payout" integer NOT NULL,
	"workstation_config" jsonb,
	"guest_name" varchar(150) NOT NULL,
	"guest_email" varchar(150) NOT NULL,
	"guest_phone" varchar(50),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"respond_by" timestamp with time zone,
	"rejection_reason" varchar(255),
	"cancelled_by" varchar(20),
	"payment_status" varchar(20) NOT NULL,
	"payment_ref" varchar(100),
	"commission_rate" integer,
	"respond_hours" integer,
	"free_cancel_days" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "travel_guides" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(150) NOT NULL,
	"title" varchar(255) NOT NULL,
	"city" varchar(100) NOT NULL,
	"category" varchar(100),
	"excerpt" text,
	"content" text,
	"cover_image" varchar(255),
	"is_featured" boolean DEFAULT false NOT NULL,
	"status" varchar(20) DEFAULT 'published' NOT NULL,
	"seo_title" varchar(255),
	"seo_description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "travel_guides_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"role" varchar(20) DEFAULT 'guest' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workstation_addons" (
	"id" serial PRIMARY KEY NOT NULL,
	"addon_id" varchar(50) NOT NULL,
	"name" varchar(150) NOT NULL,
	"category" varchar(50),
	"description" text,
	"monthly_price_eur" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "workstation_addons_addon_id_unique" UNIQUE("addon_id")
);
--> statement-breakpoint
CREATE TABLE "workstation_components" (
	"id" serial PRIMARY KEY NOT NULL,
	"component_id" varchar(50) NOT NULL,
	"name" varchar(150) NOT NULL,
	"category" varchar(50) NOT NULL,
	"monthly_price_eur" integer DEFAULT 0 NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "workstation_components_component_id_unique" UNIQUE("component_id")
);
--> statement-breakpoint
CREATE TABLE "workstation_packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"monthly_price_eur" integer DEFAULT 0 NOT NULL,
	"is_included" boolean DEFAULT false NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "workstation_packages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "blocked_dates" ADD CONSTRAINT "blocked_dates_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "host_profiles" ADD CONSTRAINT "host_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_host_id_host_profiles_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."host_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "favorites_user_property_idx" ON "favorites" USING btree ("user_id","property_id");--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "exclude_overlapping_reservations" EXCLUDE USING gist ("property_id" WITH =, daterange("move_in_date", "move_out_date") WITH &&) WHERE ("status" IN ('pending', 'confirmed'));
