import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Spec: design/DataModel.dc.html. Every table carries account_id; money is integer cents.
// Phase 2 covers accounts + users; later phases add addresses, shipments, labels, charges, …

export const userRole = pgEnum("user_role", ["owner", "shipper", "viewer"]);
export const labelFormat = pgEnum("label_format", ["pdf_4x6", "pdf_letter", "zpl"]);
export const billingLockedReason = pgEnum("billing_locked_reason", [
  "unpaid_adjustment",
  "dispute",
  "card_declined",
]);

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

export type Account = typeof accounts.$inferSelect;
export type User = typeof users.$inferSelect;
