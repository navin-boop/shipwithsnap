CREATE TYPE "public"."address_kind" AS ENUM('ship_to', 'ship_from');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('submitted', 'refunded', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."shipment_status" AS ENUM('draft', 'label_created', 'accepted', 'in_transit', 'out_for_delivery', 'delivered', 'exception', 'returned', 'voided');--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"kind" "address_kind" NOT NULL,
	"name" text,
	"company" text,
	"phone" text,
	"email" text,
	"street1" text NOT NULL,
	"street2" text,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"zip" text NOT NULL,
	"country" text DEFAULT 'US' NOT NULL,
	"residential" boolean,
	"validated_at" timestamp with time zone,
	"validation_source" text,
	"hash" text NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "labels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"shipment_id" uuid NOT NULL,
	"rate_quote_id" uuid NOT NULL,
	"carrier" text NOT NULL,
	"service_code" text NOT NULL,
	"service_name" text NOT NULL,
	"tracking_number" text NOT NULL,
	"price_cents" integer NOT NULL,
	"retail_cents" integer,
	"provider_label_id" text,
	"provider_tracker_id" text,
	"refund_status" "refund_status",
	"file_key" text,
	"file_url" text,
	"format" "label_format" NOT NULL,
	"charge_id" uuid,
	"idempotency_key" text NOT NULL,
	"voided_at" timestamp with time zone,
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"provider_rate_id" text NOT NULL,
	"carrier" text NOT NULL,
	"service_code" text NOT NULL,
	"service_name" text NOT NULL,
	"retail_cents" integer,
	"price_cents" integer NOT NULL,
	"est_days" integer,
	"est_delivery_date" text,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"ship_to_id" uuid NOT NULL,
	"ship_from_id" uuid NOT NULL,
	"parcel" jsonb NOT NULL,
	"extras" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provider_shipment_id" text,
	"status" "shipment_status" DEFAULT 'draft' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "default_ship_from_id" uuid;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labels" ADD CONSTRAINT "labels_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labels" ADD CONSTRAINT "labels_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labels" ADD CONSTRAINT "labels_rate_quote_id_rate_quotes_id_fk" FOREIGN KEY ("rate_quote_id") REFERENCES "public"."rate_quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_quotes" ADD CONSTRAINT "rate_quotes_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_ship_to_id_addresses_id_fk" FOREIGN KEY ("ship_to_id") REFERENCES "public"."addresses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_ship_from_id_addresses_id_fk" FOREIGN KEY ("ship_from_id") REFERENCES "public"."addresses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "addresses_account_hash" ON "addresses" USING btree ("account_id","hash");--> statement-breakpoint
CREATE UNIQUE INDEX "labels_idempotency_key" ON "labels" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "labels_tracking_number" ON "labels" USING btree ("tracking_number");--> statement-breakpoint
CREATE UNIQUE INDEX "labels_one_active_per_shipment" ON "labels" USING btree ("shipment_id") WHERE "labels"."voided_at" is null;--> statement-breakpoint
CREATE INDEX "shipments_account_status_created" ON "shipments" USING btree ("account_id","status","created_at");--> statement-breakpoint
CREATE INDEX "shipments_provider_id" ON "shipments" USING btree ("provider_shipment_id");