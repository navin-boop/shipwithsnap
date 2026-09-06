CREATE TYPE "public"."pickup_status" AS ENUM('quoted', 'scheduled', 'canceled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."scan_form_status" AS ENUM('creating', 'created', 'failed');--> statement-breakpoint
CREATE TABLE "carrier_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"carrier" text NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"provider_carrier_account_id" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "carrier_accounts_provider_carrier_account_id_unique" UNIQUE("provider_carrier_account_id")
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"label_id" uuid,
	"provider_claim_id" text,
	"tracking_number" text NOT NULL,
	"type" text NOT NULL,
	"requested_cents" integer NOT NULL,
	"approved_cents" integer,
	"status" text DEFAULT 'submitted' NOT NULL,
	"status_detail" text,
	"description" text NOT NULL,
	"contact_email" text NOT NULL,
	"history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parcel_presets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"name" text NOT NULL,
	"parcel" jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pickups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"address_id" uuid NOT NULL,
	"label_id" uuid,
	"batch_id" uuid,
	"provider_pickup_id" text,
	"carrier" text,
	"service_code" text,
	"price_cents" integer,
	"rates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"min_datetime" timestamp with time zone NOT NULL,
	"max_datetime" timestamp with time zone NOT NULL,
	"instructions" text,
	"status" "pickup_status" DEFAULT 'quoted' NOT NULL,
	"confirmation" text,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"provider_scan_form_id" text,
	"carrier" text NOT NULL,
	"status" "scan_form_status" DEFAULT 'creating' NOT NULL,
	"form_url" text,
	"tracking_numbers" text[] DEFAULT '{}'::text[] NOT NULL,
	"label_count" integer DEFAULT 0 NOT NULL,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trackers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"tracking_number" text NOT NULL,
	"carrier" text NOT NULL,
	"provider_tracker_id" text,
	"status" text DEFAULT 'label_created' NOT NULL,
	"status_detail" text,
	"est_delivery_date" text,
	"signed_by" text,
	"nickname" text,
	"last_tracked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "tracking_events_label_dedupe";--> statement-breakpoint
ALTER TABLE "labels" ALTER COLUMN "rate_quote_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tracking_events" ALTER COLUMN "label_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "rate_rules" jsonb DEFAULT '{"mode":"cheapest"}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "customs_defaults" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "provider_end_shipper_id" text;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "latitude" real;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "longitude" real;--> statement-breakpoint
ALTER TABLE "inbound_events" ADD COLUMN "type" text;--> statement-breakpoint
ALTER TABLE "labels" ADD COLUMN "insured_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "labels" ADD COLUMN "fees_cents" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "labels" ADD COLUMN "forms" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "labels" ADD COLUMN "status_detail" text;--> statement-breakpoint
ALTER TABLE "labels" ADD COLUMN "signed_by" text;--> statement-breakpoint
ALTER TABLE "labels" ADD COLUMN "carrier_weight_oz" real;--> statement-breakpoint
ALTER TABLE "labels" ADD COLUMN "scan_form_id" uuid;--> statement-breakpoint
ALTER TABLE "rate_quotes" ADD COLUMN "delivery_date_guaranteed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "parcel_index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "options" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "customs" jsonb;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "is_return" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "return_of_label_id" uuid;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "provider_order_id" text;--> statement-breakpoint
ALTER TABLE "tracking_events" ADD COLUMN "tracker_id" uuid;--> statement-breakpoint
ALTER TABLE "tracking_events" ADD COLUMN "status_detail" text;--> statement-breakpoint
ALTER TABLE "carrier_accounts" ADD CONSTRAINT "carrier_accounts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_label_id_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."labels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcel_presets" ADD CONSTRAINT "parcel_presets_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickups" ADD CONSTRAINT "pickups_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickups" ADD CONSTRAINT "pickups_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickups" ADD CONSTRAINT "pickups_label_id_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."labels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickups" ADD CONSTRAINT "pickups_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_forms" ADD CONSTRAINT "scan_forms_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trackers" ADD CONSTRAINT "trackers_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "trackers_account_number" ON "trackers" USING btree ("account_id","tracking_number");--> statement-breakpoint
CREATE INDEX "trackers_provider" ON "trackers" USING btree ("provider_tracker_id");--> statement-breakpoint
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_tracker_id_trackers_id_fk" FOREIGN KEY ("tracker_id") REFERENCES "public"."trackers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shipments_group" ON "shipments" USING btree ("group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tracking_events_tracker_dedupe" ON "tracking_events" USING btree ("tracker_id","dedupe_key") WHERE "tracking_events"."tracker_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "tracking_events_label_dedupe" ON "tracking_events" USING btree ("label_id","dedupe_key") WHERE "tracking_events"."label_id" is not null;