import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Spec: design/DataModel.dc.html. Every table carries account_id; money is integer cents.

export const userRole = pgEnum("user_role", ["owner", "shipper", "viewer"]);
export const labelFormat = pgEnum("label_format", ["pdf_4x6", "pdf_letter", "zpl"]);
export const billingLockedReason = pgEnum("billing_locked_reason", [
  "unpaid_adjustment",
  "dispute",
  "card_declined",
]);
export const addressKind = pgEnum("address_kind", ["ship_to", "ship_from"]);
export const shipmentStatus = pgEnum("shipment_status", [
  "draft",
  "label_created",
  "accepted",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "exception",
  "returned",
  "voided",
]);
export const refundStatus = pgEnum("refund_status", ["submitted", "refunded", "rejected"]);

/** An organisation / store. Users belong to exactly one account. */
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  pricingTier: text("pricing_tier").notNull().default("standard"),
  stripeCustomerId: text("stripe_customer_id"),
  billingLockedReason: billingLockedReason("billing_locked_reason"),
  labelFormat: labelFormat("label_format").notNull().default("pdf_4x6"),
  /** Collected at sign-up so the first rate quote works before a full ship-from address exists. */
  shipFromZip: text("ship_from_zip"),
  defaultShipFromId: uuid("default_ship_from_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  name: text("name"),
  role: userRole("role").notNull().default("owner"),
  googleSub: text("google_sub").unique(),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Verified addresses, deduplicated per account by a hash of the normalised fields. */
export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    kind: addressKind("kind").notNull(),
    name: text("name"),
    company: text("company"),
    phone: text("phone"),
    email: text("email"),
    street1: text("street1").notNull(),
    street2: text("street2"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    zip: text("zip").notNull(),
    country: text("country").notNull().default("US"),
    residential: boolean("residential"),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    validationSource: text("validation_source"),
    hash: text("hash").notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("addresses_account_hash").on(t.accountId, t.hash)],
);

export type Parcel = {
  type: "box" | "mailer" | "flat_rate";
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  weightOz: number;
  /** Provider-specific predefined package code (e.g. USPS flat-rate boxes). */
  predefinedPackage?: string;
};

export type ShipmentExtras = {
  insuranceCents?: number;
  signature?: boolean;
};

export const shipments = pgTable(
  "shipments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    shipToId: uuid("ship_to_id")
      .notNull()
      .references(() => addresses.id),
    shipFromId: uuid("ship_from_id")
      .notNull()
      .references(() => addresses.id),
    parcel: jsonb("parcel").$type<Parcel>().notNull(),
    extras: jsonb("extras").$type<ShipmentExtras>().notNull().default({}),
    providerShipmentId: text("provider_shipment_id"),
    status: shipmentStatus("status").notNull().default("draft"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("shipments_account_status_created").on(t.accountId, t.status, t.createdAt),
    index("shipments_provider_id").on(t.providerShipmentId),
  ],
);

export const rateQuotes = pgTable("rate_quotes", {
  id: uuid("id").primaryKey().defaultRandom(),
  shipmentId: uuid("shipment_id")
    .notNull()
    .references(() => shipments.id, { onDelete: "cascade" }),
  providerRateId: text("provider_rate_id").notNull(),
  carrier: text("carrier").notNull(),
  serviceCode: text("service_code").notNull(),
  serviceName: text("service_name").notNull(),
  retailCents: integer("retail_cents"),
  priceCents: integer("price_cents").notNull(),
  estDays: integer("est_days"),
  estDeliveryDate: text("est_delivery_date"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const labels = pgTable(
  "labels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => shipments.id),
    rateQuoteId: uuid("rate_quote_id")
      .notNull()
      .references(() => rateQuotes.id),
    carrier: text("carrier").notNull(),
    serviceCode: text("service_code").notNull(),
    serviceName: text("service_name").notNull(),
    trackingNumber: text("tracking_number").notNull(),
    priceCents: integer("price_cents").notNull(),
    retailCents: integer("retail_cents"),
    providerLabelId: text("provider_label_id"),
    providerTrackerId: text("provider_tracker_id"),
    refundStatus: refundStatus("refund_status"),
    /** Where the label file lives: our bucket key once uploaded; the provider URL until then. */
    fileKey: text("file_key"),
    fileUrl: text("file_url"),
    format: labelFormat("format").notNull(),
    /** Set in phase 4 (Stripe). Nullable until then; every un-voided label must have one afterwards. */
    chargeId: uuid("charge_id"),
    idempotencyKey: text("idempotency_key").notNull(),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("labels_idempotency_key").on(t.idempotencyKey),
    index("labels_tracking_number").on(t.trackingNumber),
    // At most one un-voided label per shipment.
    uniqueIndex("labels_one_active_per_shipment")
      .on(t.shipmentId)
      .where(sql`${t.voidedAt} is null`),
  ],
);

export type Account = typeof accounts.$inferSelect;
export type User = typeof users.$inferSelect;
export type Address = typeof addresses.$inferSelect;
export type Shipment = typeof shipments.$inferSelect;
export type RateQuote = typeof rateQuotes.$inferSelect;
export type Label = typeof labels.$inferSelect;
