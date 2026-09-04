CREATE TYPE "public"."billing_locked_reason" AS ENUM('unpaid_adjustment', 'dispute', 'card_declined');--> statement-breakpoint
CREATE TYPE "public"."label_format" AS ENUM('pdf_4x6', 'pdf_letter', 'zpl');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('owner', 'shipper', 'viewer');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"pricing_tier" text DEFAULT 'standard' NOT NULL,
	"stripe_customer_id" text,
	"billing_locked_reason" "billing_locked_reason",
	"label_format" "label_format" DEFAULT 'pdf_4x6' NOT NULL,
	"ship_from_zip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"role" "user_role" DEFAULT 'owner' NOT NULL,
	"google_sub" text,
	"password_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_sub_unique" UNIQUE("google_sub")
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;