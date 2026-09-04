import { sql } from "drizzle-orm";
import {
  bigserial,
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
export const storePlatform = pgEnum("store_platform", ["shopify", "etsy", "csv"]);
export const batchStatus = pgEnum("batch_status", ["rating", "ready", "buying", "done", "partial"]);
export const deliveryStatus = pgEnum("delivery_status", ["pending", "delivered", "failed"]);

export type CustomerEmailPrefs = { shipped: boolean; outForDelivery: boolean; delivered: boolean; exception: boolean };

/** An organisation / store. Users belong to exactly one account. */
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  pricingTier: text("pricing_tier").notNull().default("standard"),
  stripeCustomerId: text("stripe_customer_id"),
  billingLockedReason: billingLockedReason("billing_locked_reason"),
  labelFormat: labelFormat("label_format").notNull().default("pdf_4x6"),
  /** What the app does right after a buy: open the print dialog, download, or nothing. */
  afterBuy: text("after_buy").notNull().default("print"),
  packingSlip: boolean("packing_slip").notNull().default(false),
  customerEmails: jsonb("customer_emails")
    .$type<CustomerEmailPrefs>()
    .notNull()
    .default({ shipped: true, outForDelivery: true, delivered: true, exception: false }),
  replyTo: text("reply_to"),
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

export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: userRole("role").notNull().default("shipper"),
  token: text("token").notNull().unique(),
  invitedBy: uuid("invited_by").references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
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

export const stores = pgTable("stores", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  platform: storePlatform("platform").notNull(),
  name: text("name").notNull(),
  externalId: text("external_id"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type OrderItem = { title: string; quantity: number; sku?: string };
export type OrderShipTo = {
  name: string;
  email?: string | null;
  phone?: string | null;
  street1: string;
  street2?: string | null;
  city: string;
  state: string;
  zip: string;
  country?: string;
};

/** An order pulled from a store or a CSV, waiting for a label. */
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    number: text("number").notNull(),
    shipTo: jsonb("ship_to").$type<OrderShipTo>().notNull(),
    items: jsonb("items").$type<OrderItem[]>().notNull().default([]),
    parcel: jsonb("parcel").$type<Parcel | null>(),
    shipmentId: uuid("shipment_id"),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
    trackingWrittenBackAt: timestamp("tracking_written_back_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("orders_store_external").on(t.storeId, t.externalId)],
);

export const batches = pgTable("batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  status: batchStatus("status").notNull().default("rating"),
  counts: jsonb("counts").$type<{ ok: number; failed: number }>().notNull().default({ ok: 0, failed: 0 }),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

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
    orderId: uuid("order_id").references(() => orders.id),
    batchId: uuid("batch_id").references(() => batches.id),
    parcel: jsonb("parcel").$type<Parcel>().notNull(),
    extras: jsonb("extras").$type<ShipmentExtras>().notNull().default({}),
    providerShipmentId: text("provider_shipment_id"),
    status: shipmentStatus("status").notNull().default("draft"),
    /** Per-row outcome inside a batch buy. */
    batchError: text("batch_error"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("shipments_account_status_created").on(t.accountId, t.status, t.createdAt),
    index("shipments_provider_id").on(t.providerShipmentId),
    index("shipments_batch").on(t.batchId),
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
    /** Unguessable handle for the public tracking page: /t/{token}. */
    trackingToken: text("tracking_token").notNull().default(sql`encode(gen_random_bytes(12), 'hex')`),
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
    estDeliveryDate: text("est_delivery_date"),
    lastTrackedAt: timestamp("last_tracked_at", { withTimezone: true }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("labels_idempotency_key").on(t.idempotencyKey),
    uniqueIndex("labels_tracking_token").on(t.trackingToken),
    index("labels_tracking_number").on(t.trackingNumber),
    index("labels_provider_tracker").on(t.providerTrackerId),
    // At most one un-voided label per shipment.
    uniqueIndex("labels_one_active_per_shipment")
      .on(t.shipmentId)
      .where(sql`${t.voidedAt} is null`),
  ],
);

export const trackingEvents = pgTable(
  "tracking_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    labelId: uuid("label_id")
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
    dedupeKey: text("dedupe_key").notNull(),
    status: text("status").notNull(),
    rawStatus: text("raw_status").notNull(),
    description: text("description").notNull(),
    city: text("city"),
    state: text("state"),
    zip: text("zip"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    source: text("source").notNull(),
  },
  (t) => [uniqueIndex("tracking_events_label_dedupe").on(t.labelId, t.dedupeKey), index("tracking_events_label_time").on(t.labelId, t.occurredAt)],
);

/** Idempotency for inbound provider/Stripe webhooks: one row per event id. */
export const inboundEvents = pgTable("inbound_events", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  /** First characters, shown in the UI after creation. */
  prefix: text("prefix").notNull(),
  mode: text("mode").notNull().default("live"),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const webhookEndpoints = pgTable("webhook_endpoints", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  secret: text("secret").notNull(),
  events: text("events").array().notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    endpointId: uuid("endpoint_id")
      .notNull()
      .references(() => webhookEndpoints.id, { onDelete: "cascade" }),
    event: text("event").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    attempts: integer("attempts").notNull().default(0),
    status: deliveryStatus("status").notNull().default("pending"),
    lastError: text("last_error"),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("webhook_deliveries_retry").on(t.status, t.nextRetryAt)],
);

export type Account = typeof accounts.$inferSelect;
export type User = typeof users.$inferSelect;
export type Address = typeof addresses.$inferSelect;
export type Shipment = typeof shipments.$inferSelect;
export type RateQuote = typeof rateQuotes.$inferSelect;
export type Label = typeof labels.$inferSelect;
export type TrackingEvent = typeof trackingEvents.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Store = typeof stores.$inferSelect;
export type Batch = typeof batches.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type WebhookEndpoint = typeof webhookEndpoints.$inferSelect;
