import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { CustomsInput, ShipmentOptions } from "@/lib/shipping/provider";

// Spec: design/DataModel.dc.html. Every table carries account_id; money is integer cents.

export const userRole = pgEnum("user_role", ["owner", "shipper", "viewer"]);
export const labelFormat = pgEnum("label_format", ["pdf_4x6", "pdf_letter", "zpl"]);
export const billingLockedReason = pgEnum("billing_locked_reason", ["unpaid_adjustment", "dispute", "card_declined"]);
export const addressKind = pgEnum("address_kind", ["ship_to", "ship_from"]);
export const shipmentStatus = pgEnum("shipment_status", ["draft", "label_created", "accepted", "in_transit", "out_for_delivery", "delivered", "exception", "returned", "voided"]);
export const refundStatus = pgEnum("refund_status", ["submitted", "refunded", "rejected"]);
export const storePlatform = pgEnum("store_platform", ["shopify", "etsy", "csv"]);
export const batchStatus = pgEnum("batch_status", ["rating", "ready", "buying", "done", "partial"]);
export const deliveryStatus = pgEnum("delivery_status", ["pending", "delivered", "failed"]);
export const pickupStatus = pgEnum("pickup_status", ["quoted", "scheduled", "canceled", "failed"]);
export const scanFormStatus = pgEnum("scan_form_status", ["creating", "created", "failed"]);

export type CustomerEmailPrefs = { shipped: boolean; outForDelivery: boolean; delivered: boolean; exception: boolean };

/** Auto-pick rule applied to every rate list (Ship default selection, Batch). */
export type RateRules = {
  /** "cheapest" | "fastest" | "cheapest_within_days" | "preferred_carrier" */
  mode: "cheapest" | "fastest" | "cheapest_within_days" | "preferred_carrier";
  maxDays?: number;
  preferredCarrier?: string;
  /** Service codes to hide from every rate list ("carrier:service"). */
  hiddenServices?: string[];
  /** Carriers to hide entirely. */
  hiddenCarriers?: string[];
};

export type CustomsDefaults = { signer?: string | null; eelPfc?: string | null; contentsType?: string | null; originCountry?: string | null };

/** An organisation / store. Users belong to exactly one account. */
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  pricingTier: text("pricing_tier").notNull().default("standard"),
  stripeCustomerId: text("stripe_customer_id"),
  billingLockedReason: billingLockedReason("billing_locked_reason"),
  labelFormat: labelFormat("label_format").notNull().default("pdf_4x6"),
  afterBuy: text("after_buy").notNull().default("print"),
  packingSlip: boolean("packing_slip").notNull().default(false),
  customerEmails: jsonb("customer_emails").$type<CustomerEmailPrefs>().notNull().default({ shipped: true, outForDelivery: true, delivered: true, exception: false }),
  replyTo: text("reply_to"),
  logoData: text("logo_data"),
  logoMime: text("logo_mime"),
  shipFromZip: text("ship_from_zip"),
  defaultShipFromId: uuid("default_ship_from_id"),
  rateRules: jsonb("rate_rules").$type<RateRules>().notNull().default({ mode: "cheapest" }),
  customsDefaults: jsonb("customs_defaults").$type<CustomsDefaults>().notNull().default({}),
  /** EasyPost EndShipper id, created from the default ship-from when the platform requires it. */
  providerEndShipperId: text("provider_end_shipper_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  name: text("name"),
  role: userRole("role").notNull().default("owner"),
  googleSub: text("google_sub").unique(),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
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
    accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
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
    latitude: real("latitude"),
    longitude: real("longitude"),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    validationSource: text("validation_source"),
    hash: text("hash").notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("addresses_account_hash").on(t.accountId, t.hash)],
);

export type Parcel = {
  type: "box" | "mailer" | "flat_rate" | "carrier_package";
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  weightOz: number;
  /** Provider-specific predefined package code (USPS flat-rate boxes, UPS/FedEx packaging). */
  predefinedPackage?: string;
};

export type ShipmentExtras = {
  /** Declared value insured, in cents. */
  insuranceCents?: number;
  /** @deprecated see options.signature */
  signature?: boolean;
};

/** Saved package sizes ("Small box · 8×6×3 · 12 oz"). */
export const parcelPresets = pgTable("parcel_presets", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  parcel: jsonb("parcel").$type<Parcel>().notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stores = pgTable("stores", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  platform: storePlatform("platform").notNull(),
  name: text("name").notNull(),
  externalId: text("external_id"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type OrderItem = { title: string; quantity: number; sku?: string };
export type OrderShipTo = { name: string; email?: string | null; phone?: string | null; street1: string; street2?: string | null; city: string; state: string; zip: string; country?: string };

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
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
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
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
    accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    shipToId: uuid("ship_to_id").notNull().references(() => addresses.id),
    shipFromId: uuid("ship_from_id").notNull().references(() => addresses.id),
    orderId: uuid("order_id").references(() => orders.id),
    batchId: uuid("batch_id").references(() => batches.id),
    /** Multi-parcel: every box of one order shares a group id. */
    groupId: uuid("group_id"),
    parcelIndex: integer("parcel_index").notNull().default(0),
    parcel: jsonb("parcel").$type<Parcel>().notNull(),
    extras: jsonb("extras").$type<ShipmentExtras>().notNull().default({}),
    options: jsonb("options").$type<ShipmentOptions>().notNull().default({}),
    customs: jsonb("customs").$type<CustomsInput | null>(),
    isReturn: boolean("is_return").notNull().default(false),
    /** For return labels: the outbound label this returns. */
    returnOfLabelId: uuid("return_of_label_id"),
    providerShipmentId: text("provider_shipment_id"),
    providerOrderId: text("provider_order_id"),
    status: shipmentStatus("status").notNull().default("draft"),
    batchError: text("batch_error"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("shipments_account_status_created").on(t.accountId, t.status, t.createdAt),
    index("shipments_provider_id").on(t.providerShipmentId),
    index("shipments_batch").on(t.batchId),
    index("shipments_group").on(t.groupId),
  ],
);

export const rateQuotes = pgTable("rate_quotes", {
  id: uuid("id").primaryKey().defaultRandom(),
  shipmentId: uuid("shipment_id").notNull().references(() => shipments.id, { onDelete: "cascade" }),
  providerRateId: text("provider_rate_id").notNull(),
  carrier: text("carrier").notNull(),
  serviceCode: text("service_code").notNull(),
  serviceName: text("service_name").notNull(),
  retailCents: integer("retail_cents"),
  priceCents: integer("price_cents").notNull(),
  estDays: integer("est_days"),
  estDeliveryDate: text("est_delivery_date"),
  deliveryDateGuaranteed: boolean("delivery_date_guaranteed").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const labels = pgTable(
  "labels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    shipmentId: uuid("shipment_id").notNull().references(() => shipments.id),
    rateQuoteId: uuid("rate_quote_id").references(() => rateQuotes.id),
    carrier: text("carrier").notNull(),
    serviceCode: text("service_code").notNull(),
    serviceName: text("service_name").notNull(),
    trackingNumber: text("tracking_number").notNull(),
    trackingToken: text("tracking_token").notNull().default(sql`encode(gen_random_bytes(12), 'hex')`),
    priceCents: integer("price_cents").notNull(),
    retailCents: integer("retail_cents"),
    insuredCents: integer("insured_cents").notNull().default(0),
    feesCents: jsonb("fees_cents").$type<Record<string, number>>().notNull().default({}),
    forms: jsonb("forms").$type<Array<{ type: string; url: string }>>().notNull().default([]),
    providerLabelId: text("provider_label_id"),
    providerTrackerId: text("provider_tracker_id"),
    refundStatus: refundStatus("refund_status"),
    fileKey: text("file_key"),
    fileUrl: text("file_url"),
    format: labelFormat("format").notNull(),
    chargeId: uuid("charge_id"),
    idempotencyKey: text("idempotency_key").notNull(),
    estDeliveryDate: text("est_delivery_date"),
    statusDetail: text("status_detail"),
    signedBy: text("signed_by"),
    carrierWeightOz: real("carrier_weight_oz"),
    scanFormId: uuid("scan_form_id"),
    lastTrackedAt: timestamp("last_tracked_at", { withTimezone: true }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("labels_idempotency_key").on(t.idempotencyKey),
    uniqueIndex("labels_tracking_token").on(t.trackingToken),
    index("labels_tracking_number").on(t.trackingNumber),
    index("labels_provider_tracker").on(t.providerTrackerId),
    uniqueIndex("labels_one_active_per_shipment").on(t.shipmentId).where(sql`${t.voidedAt} is null`),
  ],
);

/** Packages we track that we didn't label (Track a package). */
export const trackers = pgTable(
  "trackers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    trackingNumber: text("tracking_number").notNull(),
    carrier: text("carrier").notNull(),
    providerTrackerId: text("provider_tracker_id"),
    status: text("status").notNull().default("label_created"),
    statusDetail: text("status_detail"),
    estDeliveryDate: text("est_delivery_date"),
    signedBy: text("signed_by"),
    nickname: text("nickname"),
    lastTrackedAt: timestamp("last_tracked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("trackers_account_number").on(t.accountId, t.trackingNumber), index("trackers_provider").on(t.providerTrackerId)],
);

export const trackingEvents = pgTable(
  "tracking_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    labelId: uuid("label_id").references(() => labels.id, { onDelete: "cascade" }),
    trackerId: uuid("tracker_id").references(() => trackers.id, { onDelete: "cascade" }),
    dedupeKey: text("dedupe_key").notNull(),
    status: text("status").notNull(),
    rawStatus: text("raw_status").notNull(),
    statusDetail: text("status_detail"),
    description: text("description").notNull(),
    city: text("city"),
    state: text("state"),
    zip: text("zip"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    source: text("source").notNull(),
  },
  (t) => [
    uniqueIndex("tracking_events_label_dedupe").on(t.labelId, t.dedupeKey).where(sql`${t.labelId} is not null`),
    uniqueIndex("tracking_events_tracker_dedupe").on(t.trackerId, t.dedupeKey).where(sql`${t.trackerId} is not null`),
    index("tracking_events_label_time").on(t.labelId, t.occurredAt),
  ],
);

export const pickups = pgTable("pickups", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  addressId: uuid("address_id").notNull().references(() => addresses.id),
  labelId: uuid("label_id").references(() => labels.id),
  batchId: uuid("batch_id").references(() => batches.id),
  providerPickupId: text("provider_pickup_id"),
  carrier: text("carrier"),
  serviceCode: text("service_code"),
  priceCents: integer("price_cents"),
  rates: jsonb("rates").$type<Array<{ carrier: string; serviceCode: string; priceCents: number }>>().notNull().default([]),
  minDatetime: timestamp("min_datetime", { withTimezone: true }).notNull(),
  maxDatetime: timestamp("max_datetime", { withTimezone: true }).notNull(),
  instructions: text("instructions"),
  status: pickupStatus("status").notNull().default("quoted"),
  confirmation: text("confirmation"),
  messages: jsonb("messages").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** USPS/FedEx/UPS end-of-day manifests. */
export const scanForms = pgTable("scan_forms", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  providerScanFormId: text("provider_scan_form_id"),
  carrier: text("carrier").notNull(),
  status: scanFormStatus("status").notNull().default("creating"),
  formUrl: text("form_url"),
  trackingNumbers: text("tracking_numbers").array().notNull().default(sql`'{}'::text[]`),
  labelCount: integer("label_count").notNull().default(0),
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const claims = pgTable("claims", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  labelId: uuid("label_id").references(() => labels.id),
  providerClaimId: text("provider_claim_id"),
  trackingNumber: text("tracking_number").notNull(),
  type: text("type").notNull(),
  requestedCents: integer("requested_cents").notNull(),
  approvedCents: integer("approved_cents"),
  status: text("status").notNull().default("submitted"),
  statusDetail: text("status_detail"),
  description: text("description").notNull(),
  contactEmail: text("contact_email").notNull(),
  history: jsonb("history").$type<Array<{ status: string; statusDetail?: string | null; at: string }>>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Customer-owned carrier accounts registered with EasyPost (credentials live there, not here). */
export const carrierAccounts = pgTable("carrier_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  carrier: text("carrier").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  providerCarrierAccountId: text("provider_carrier_account_id").notNull().unique(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const inboundEvents = pgTable("inbound_events", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  type: text("type"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  prefix: text("prefix").notNull(),
  mode: text("mode").notNull().default("live"),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const webhookEndpoints = pgTable("webhook_endpoints", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
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
    endpointId: uuid("endpoint_id").notNull().references(() => webhookEndpoints.id, { onDelete: "cascade" }),
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
export type Tracker = typeof trackers.$inferSelect;
export type TrackingEvent = typeof trackingEvents.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Store = typeof stores.$inferSelect;
export type Batch = typeof batches.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type WebhookEndpoint = typeof webhookEndpoints.$inferSelect;
export type Pickup = typeof pickups.$inferSelect;
export type ScanForm = typeof scanForms.$inferSelect;
export type Claim = typeof claims.$inferSelect;
export type ParcelPreset = typeof parcelPresets.$inferSelect;
export type CarrierAccount = typeof carrierAccounts.$inferSelect;
