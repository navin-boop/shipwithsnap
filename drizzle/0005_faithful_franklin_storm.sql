CREATE TYPE "public"."charge_kind" AS ENUM('label', 'batch', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."charge_status" AS ENUM('authorized', 'captured', 'canceled', 'failed', 'refunded', 'partially_refunded');--> statement-breakpoint
CREATE TYPE "public"."stripe_refund_status" AS ENUM('requested', 'refunded', 'failed');--> statement-breakpoint
CREATE TABLE "charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"kind" charge_kind DEFAULT 'label' NOT NULL,
	"status" charge_status DEFAULT 'authorized' NOT NULL,
	"stripe_payment_intent_id" text,
	"payment_method_id" uuid,
	"card_label" text,
	"amount_authorized_cents" integer NOT NULL,
	"amount_captured_cents" integer DEFAULT 0 NOT NULL,
	"amount_refunded_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"description" text NOT NULL,
	"receipt_url" text,
	"failure_code" text,
	"failure_message" text,
	"batch_id" uuid,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"stripe_payment_method_id" text NOT NULL,
	"brand" text NOT NULL,
	"last4" text NOT NULL,
	"exp_month" integer NOT NULL,
	"exp_year" integer NOT NULL,
	"name_on_card" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"charge_id" uuid NOT NULL,
	"label_id" uuid,
	"stripe_refund_id" text,
	"amount_cents" integer NOT NULL,
	"status" "stripe_refund_status" DEFAULT 'requested' NOT NULL,
	"reason" text,
	"failure_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "receipt_emails" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "receipt_email" text;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_payment_method_id_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_charge_id_charges_id_fk" FOREIGN KEY ("charge_id") REFERENCES "public"."charges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_label_id_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."labels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "charges_idempotency_key" ON "charges" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "charges_account_created" ON "charges" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "charges_payment_intent" ON "charges" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_methods_provider_id" ON "payment_methods" USING btree ("stripe_payment_method_id");--> statement-breakpoint
CREATE INDEX "payment_methods_account" ON "payment_methods" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "refunds_account_created" ON "refunds" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "refunds_charge" ON "refunds" USING btree ("charge_id");