import { and, desc, eq, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { db, schema } from "@/lib/db";
import type { Account, Charge, PaymentMethod } from "@/lib/db/schema";
import { assertNotLocked } from "./policy";
import { BillingError, billingEnabled, fromStripeError, getStripe } from "./stripe";

// Spec: design/Ledger.dc.html. Account-scoped core, shared by the server actions, the buy flow
// and the Stripe webhook. Money is integer cents throughout.

export { billingEnabled, BillingError };
export { assertNotLocked, lockReasonMessage } from "./policy";

/** Stripe customer per Snap account, created lazily and remembered. */
export async function ensureCustomer(account: Account): Promise<string> {
  const stripe = getStripe();
  if (!stripe) throw new BillingError("not_configured", "Billing is not configured.");
  if (account.stripeCustomerId) return account.stripeCustomerId;

  const owner = await db().query.users.findFirst({ where: and(eq(schema.users.accountId, account.id), eq(schema.users.role, "owner")) });
  const customer = await stripe.customers.create(
    { name: account.name, email: owner?.email, metadata: { account_id: account.id } },
    { idempotencyKey: `customer:${account.id}` },
  );
  await db().update(schema.accounts).set({ stripeCustomerId: customer.id }).where(eq(schema.accounts.id, account.id));
  return customer.id;
}

/**
 * A SetupIntent is how a card gets saved: Stripe Elements confirms it in the browser, 3D Secure
 * happens once here, and later charges run off_session without prompting the customer.
 */
export async function createSetupIntent(account: Account): Promise<{ clientSecret: string }> {
  const stripe = getStripe();
  if (!stripe) throw new BillingError("not_configured", "Billing is not configured.");
  const customer = await ensureCustomer(account);
  const intent = await stripe.setupIntents.create({
    customer,
    usage: "off_session",
    payment_method_types: ["card"],
    metadata: { account_id: account.id },
  });
  if (!intent.client_secret) throw new BillingError("unknown", "Stripe did not return a client secret.");
  return { clientSecret: intent.client_secret };
}

const cardLabel = (pm: Pick<PaymentMethod, "brand" | "last4">) => `${pm.brand} ·· ${pm.last4}`;

/** Called after Elements confirms the SetupIntent — records the card so we can show and charge it. */
export async function savePaymentMethod(account: Account, stripePaymentMethodId: string): Promise<PaymentMethod> {
  const stripe = getStripe();
  if (!stripe) throw new BillingError("not_configured", "Billing is not configured.");
  const customer = await ensureCustomer(account);

  const pm = await stripe.paymentMethods.retrieve(stripePaymentMethodId);
  if (pm.customer && pm.customer !== customer) throw new BillingError("unknown", "That card belongs to another account.");
  if (!pm.customer) await stripe.paymentMethods.attach(stripePaymentMethodId, { customer });
  if (!pm.card) throw new BillingError("unknown", "Only cards are supported.");

  const existing = await db().query.paymentMethods.findMany({ where: eq(schema.paymentMethods.accountId, account.id) });
  const [row] = await db()
    .insert(schema.paymentMethods)
    .values({
      accountId: account.id,
      stripePaymentMethodId,
      brand: titleCase(pm.card.brand),
      last4: pm.card.last4,
      expMonth: pm.card.exp_month,
      expYear: pm.card.exp_year,
      nameOnCard: pm.billing_details?.name ?? null,
      isDefault: existing.length === 0,
    })
    .onConflictDoUpdate({ target: schema.paymentMethods.stripePaymentMethodId, set: { last4: pm.card.last4, expMonth: pm.card.exp_month, expYear: pm.card.exp_year } })
    .returning();

  if (row.isDefault) {
    await stripe.customers.update(customer, { invoice_settings: { default_payment_method: stripePaymentMethodId } });
  }
  return row;
}

function titleCase(s: string): string {
  if (s === "amex") return "Amex";
  if (s === "mastercard") return "Mastercard";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function listPaymentMethods(accountId: string): Promise<PaymentMethod[]> {
  return db().query.paymentMethods.findMany({ where: eq(schema.paymentMethods.accountId, accountId), orderBy: [desc(schema.paymentMethods.isDefault), desc(schema.paymentMethods.createdAt)] });
}

export async function getDefaultPaymentMethod(accountId: string): Promise<PaymentMethod | null> {
  const rows = await listPaymentMethods(accountId);
  return rows.find((r) => r.isDefault) ?? rows[0] ?? null;
}

export async function setDefaultPaymentMethod(account: Account, id: string): Promise<void> {
  const row = await db().query.paymentMethods.findFirst({ where: and(eq(schema.paymentMethods.id, id), eq(schema.paymentMethods.accountId, account.id)) });
  if (!row) throw new BillingError("unknown", "Card not found.");
  await db().batch([
    db().update(schema.paymentMethods).set({ isDefault: false }).where(eq(schema.paymentMethods.accountId, account.id)),
    db().update(schema.paymentMethods).set({ isDefault: true }).where(eq(schema.paymentMethods.id, row.id)),
  ]);
  const stripe = getStripe();
  if (stripe && account.stripeCustomerId) {
    await stripe.customers.update(account.stripeCustomerId, { invoice_settings: { default_payment_method: row.stripePaymentMethodId } });
  }
}

export async function removePaymentMethod(account: Account, id: string): Promise<void> {
  const row = await db().query.paymentMethods.findFirst({ where: and(eq(schema.paymentMethods.id, id), eq(schema.paymentMethods.accountId, account.id)) });
  if (!row) throw new BillingError("unknown", "Card not found.");
  const stripe = getStripe();
  if (stripe) await stripe.paymentMethods.detach(row.stripePaymentMethodId).catch(() => {});
  await db().delete(schema.paymentMethods).where(eq(schema.paymentMethods.id, row.id));
  // Keep exactly one default so the next purchase still knows which card to use.
  const rest = await listPaymentMethods(account.id);
  if (rest.length && !rest.some((r) => r.isDefault)) await setDefaultPaymentMethod(account, rest[0].id);
}

export type AuthorizedCharge = { charge: Charge; paymentIntentId: string | null };

/**
 * Step 3 of design/BuyLabelFlow.dc.html — authorize before anything is bought. Manual capture
 * means the money is only held; if the buy fails we cancel and the hold drops off the card.
 *
 * The idempotency key is our own charge id, so a retry never authorizes twice.
 */
export async function authorize(account: Account, input: { amountCents: number; description: string; idempotencyKey: string; kind?: "label" | "batch" | "adjustment"; batchId?: string | null }): Promise<AuthorizedCharge> {
  const replay = await db().query.charges.findFirst({ where: eq(schema.charges.idempotencyKey, input.idempotencyKey) });
  if (replay) return { charge: replay, paymentIntentId: replay.stripePaymentIntentId };

  assertNotLocked(account);

  const stripe = getStripe();
  if (!stripe) {
    // Billing not configured: record nothing and let the label be bought without a charge.
    throw new BillingError("not_configured", "Billing is not configured.");
  }
  const card = await getDefaultPaymentMethod(account.id);
  if (!card) throw new BillingError("no_card", "Add a card on the Billing page before buying labels.");
  const customer = await ensureCustomer(account);

  const [charge] = await db()
    .insert(schema.charges)
    .values({
      accountId: account.id,
      kind: input.kind ?? "label",
      status: "authorized",
      paymentMethodId: card.id,
      cardLabel: cardLabel(card),
      amountAuthorizedCents: input.amountCents,
      description: input.description,
      batchId: input.batchId ?? null,
      idempotencyKey: input.idempotencyKey,
    })
    .returning();

  try {
    const intent = await stripe.paymentIntents.create(
      {
        amount: input.amountCents,
        currency: "usd",
        customer,
        payment_method: card.stripePaymentMethodId,
        capture_method: "manual",
        confirm: true,
        off_session: true,
        description: input.description,
        metadata: { account_id: account.id, charge_id: charge.id, kind: input.kind ?? "label" },
      },
      { idempotencyKey: `charge:${charge.id}` },
    );
    const [updated] = await db().update(schema.charges).set({ stripePaymentIntentId: intent.id, updatedAt: new Date() }).where(eq(schema.charges.id, charge.id)).returning();
    if (intent.status !== "requires_capture") {
      await markFailed(charge.id, intent.last_payment_error?.code ?? intent.status, intent.last_payment_error?.message ?? `Card authorization did not complete (${intent.status}).`);
      throw new BillingError("card_declined", intent.last_payment_error?.message ?? "Your card was declined.", intent.last_payment_error?.decline_code ?? null);
    }
    return { charge: updated, paymentIntentId: intent.id };
  } catch (err) {
    if (err instanceof BillingError) throw err;
    const mapped = fromStripeError(err);
    await markFailed(charge.id, mapped.declineCode ?? mapped.code, mapped.message);
    if (mapped.code === "card_declined") await db().update(schema.accounts).set({ billingLockedReason: "card_declined" }).where(eq(schema.accounts.id, account.id));
    throw mapped;
  }
}

async function markFailed(chargeId: string, code: string | null, message: string) {
  await db().update(schema.charges).set({ status: "failed", failureCode: code, failureMessage: message, updatedAt: new Date() }).where(eq(schema.charges.id, chargeId));
}

/**
 * Step 8 — capture what was actually bought. A batch captures only the rows that succeeded,
 * which Stripe supports as a partial capture on the same PaymentIntent.
 */
export async function capture(chargeId: string, amountCents?: number): Promise<Charge> {
  const charge = await db().query.charges.findFirst({ where: eq(schema.charges.id, chargeId) });
  if (!charge) throw new BillingError("unknown", "Charge not found.");
  if (charge.status === "captured") return charge;
  const stripe = getStripe();
  if (!stripe || !charge.stripePaymentIntentId) return charge;

  const amount = amountCents ?? charge.amountAuthorizedCents;
  if (amount <= 0) return cancelAuthorization(chargeId);

  const intent = await stripe.paymentIntents.capture(charge.stripePaymentIntentId, { amount_to_capture: amount });
  const receiptUrl = await latestReceiptUrl(stripe, intent);
  const [updated] = await db()
    .update(schema.charges)
    .set({ status: "captured", amountCapturedCents: amount, receiptUrl, updatedAt: new Date() })
    .where(eq(schema.charges.id, charge.id))
    .returning();
  return updated;
}

async function latestReceiptUrl(stripe: Stripe, intent: Stripe.PaymentIntent): Promise<string | null> {
  const id = typeof intent.latest_charge === "string" ? intent.latest_charge : intent.latest_charge?.id;
  if (!id) return null;
  try {
    const ch = await stripe.charges.retrieve(id);
    return ch.receipt_url ?? null;
  } catch {
    return null;
  }
}

/** The buy failed — drop the hold. Nothing is charged. */
export async function cancelAuthorization(chargeId: string): Promise<Charge> {
  const charge = await db().query.charges.findFirst({ where: eq(schema.charges.id, chargeId) });
  if (!charge) throw new BillingError("unknown", "Charge not found.");
  const stripe = getStripe();
  if (stripe && charge.stripePaymentIntentId && charge.status === "authorized") {
    await stripe.paymentIntents.cancel(charge.stripePaymentIntentId).catch(() => {});
  }
  const [updated] = await db().update(schema.charges).set({ status: "canceled", amountCapturedCents: 0, updatedAt: new Date() }).where(eq(schema.charges.id, charge.id)).returning();
  return updated;
}

/**
 * Refunds follow the carrier: only once EasyPost reports the label refunded do we put the money
 * back on the original card. Until then the Billing screen shows the refund as pending.
 */
export async function refundForLabel(accountId: string, labelId: string, amountCents: number, reason: string): Promise<void> {
  const label = await db().query.labels.findFirst({ where: eq(schema.labels.id, labelId) });
  if (!label?.chargeId) return; // bought before billing existed, or no charge taken
  const charge = await db().query.charges.findFirst({ where: eq(schema.charges.id, label.chargeId) });
  if (!charge || charge.status === "canceled" || charge.status === "failed") return;

  const already = await db().query.refunds.findFirst({ where: and(eq(schema.refunds.labelId, labelId), eq(schema.refunds.status, "refunded")) });
  if (already) return;

  const refundable = charge.amountCapturedCents - charge.amountRefundedCents;
  const amount = Math.min(amountCents, refundable);
  if (amount <= 0) return;

  const [row] = await db()
    .insert(schema.refunds)
    .values({ accountId, chargeId: charge.id, labelId, amountCents: amount, status: "requested", reason })
    .returning();

  const stripe = getStripe();
  if (!stripe || !charge.stripePaymentIntentId) return;
  try {
    const refund = await stripe.refunds.create(
      { payment_intent: charge.stripePaymentIntentId, amount, metadata: { label_id: labelId, account_id: accountId } },
      { idempotencyKey: `refund:${row.id}` },
    );
    const refunded = charge.amountRefundedCents + amount;
    await db().batch([
      db().update(schema.refunds).set({ stripeRefundId: refund.id, status: "refunded", updatedAt: new Date() }).where(eq(schema.refunds.id, row.id)),
      db().update(schema.charges).set({ amountRefundedCents: refunded, status: refunded >= charge.amountCapturedCents ? "refunded" : "partially_refunded", updatedAt: new Date() }).where(eq(schema.charges.id, charge.id)),
    ]);
  } catch (err) {
    const mapped = fromStripeError(err);
    await db().update(schema.refunds).set({ status: "failed", failureMessage: mapped.message, updatedAt: new Date() }).where(eq(schema.refunds.id, row.id));
    console.error(`Stripe refund failed for label ${labelId}:`, mapped.message);
  }
}

/** A carrier re-weigh, billed on its own PaymentIntent with automatic capture. */
export async function chargeAdjustment(account: Account, input: { amountCents: number; description: string; idempotencyKey: string }): Promise<Charge> {
  const stripe = getStripe();
  const card = await getDefaultPaymentMethod(account.id);
  const replay = await db().query.charges.findFirst({ where: eq(schema.charges.idempotencyKey, input.idempotencyKey) });
  if (replay) return replay;

  const [charge] = await db()
    .insert(schema.charges)
    .values({
      accountId: account.id, kind: "adjustment", status: "authorized", paymentMethodId: card?.id ?? null,
      cardLabel: card ? cardLabel(card) : null, amountAuthorizedCents: input.amountCents, description: input.description, idempotencyKey: input.idempotencyKey,
    })
    .returning();

  if (!stripe || !card) {
    await db().update(schema.accounts).set({ billingLockedReason: "unpaid_adjustment" }).where(eq(schema.accounts.id, account.id));
    return charge;
  }
  try {
    const intent = await stripe.paymentIntents.create(
      {
        amount: input.amountCents, currency: "usd", customer: await ensureCustomer(account), payment_method: card.stripePaymentMethodId,
        confirm: true, off_session: true, description: input.description, metadata: { account_id: account.id, charge_id: charge.id, kind: "adjustment" },
      },
      { idempotencyKey: `charge:${charge.id}` },
    );
    const [updated] = await db()
      .update(schema.charges)
      .set({ stripePaymentIntentId: intent.id, status: intent.status === "succeeded" ? "captured" : "failed", amountCapturedCents: intent.status === "succeeded" ? input.amountCents : 0, receiptUrl: await latestReceiptUrl(stripe, intent), updatedAt: new Date() })
      .where(eq(schema.charges.id, charge.id))
      .returning();
    if (intent.status !== "succeeded") {
      await db().update(schema.accounts).set({ billingLockedReason: "unpaid_adjustment" }).where(eq(schema.accounts.id, account.id));
    }
    return updated;
  } catch (err) {
    const mapped = fromStripeError(err);
    await markFailed(charge.id, mapped.declineCode ?? mapped.code, mapped.message);
    await db().update(schema.accounts).set({ billingLockedReason: "unpaid_adjustment" }).where(eq(schema.accounts.id, account.id));
    return (await db().query.charges.findFirst({ where: eq(schema.charges.id, charge.id) }))!;
  }
}

export type LedgerEntry = {
  id: string;
  kind: "label" | "batch" | "adjustment" | "refund";
  status: string;
  description: string;
  detail: string;
  cardLabel: string | null;
  amountCents: number;
  receiptUrl: string | null;
  at: string;
};

/** Charges and refunds interleaved, newest first — the table in design/Wallet.dc.html. */
export async function listLedger(accountId: string, limit = 60): Promise<LedgerEntry[]> {
  const [charges, refundRows] = await Promise.all([
    db().query.charges.findMany({ where: eq(schema.charges.accountId, accountId), orderBy: desc(schema.charges.createdAt), limit }),
    db().query.refunds.findMany({ where: eq(schema.refunds.accountId, accountId), orderBy: desc(schema.refunds.createdAt), limit }),
  ]);
  const chargeById = new Map(charges.map((c) => [c.id, c]));

  const entries: LedgerEntry[] = [
    ...charges
      .filter((c) => c.status !== "failed" || c.kind === "adjustment")
      .map((c) => ({
        id: c.id,
        kind: c.kind as LedgerEntry["kind"],
        status: c.status === "captured" ? "Paid" : c.status === "authorized" ? "Pending" : c.status === "canceled" ? "Not charged" : c.status === "failed" ? "Failed" : c.status === "refunded" ? "Refunded" : "Partly refunded",
        description: c.description,
        detail: "",
        cardLabel: c.cardLabel,
        amountCents: c.status === "captured" || c.status === "refunded" || c.status === "partially_refunded" ? c.amountCapturedCents : c.amountAuthorizedCents,
        receiptUrl: c.receiptUrl,
        at: c.createdAt.toISOString(),
      })),
    ...refundRows.map((r) => ({
      id: r.id,
      kind: "refund" as const,
      status: r.status === "refunded" ? "Refunded" : r.status === "failed" ? "Failed" : "Pending",
      description: r.status === "refunded" ? "Refund · voided label" : "Refund requested · voided label",
      detail: r.reason ?? "",
      cardLabel: chargeById.get(r.chargeId)?.cardLabel ?? null,
      amountCents: -r.amountCents,
      receiptUrl: null,
      at: r.createdAt.toISOString(),
    })),
  ];
  return entries.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

/** "September so far: $54.28 across 7 charges · $10.12 refunded" */
export async function monthSummary(accountId: string): Promise<{ month: string; chargedCents: number; charges: number; refundedCents: number }> {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const [c] = await db()
    .select({ total: sql<number>`coalesce(sum(${schema.charges.amountCapturedCents}), 0)`, n: sql<number>`count(*)` })
    .from(schema.charges)
    .where(and(eq(schema.charges.accountId, accountId), sql`${schema.charges.createdAt} >= ${start.toISOString()}`, sql`${schema.charges.status} in ('captured','refunded','partially_refunded')`));
  const [r] = await db()
    .select({ total: sql<number>`coalesce(sum(${schema.refunds.amountCents}), 0)` })
    .from(schema.refunds)
    .where(and(eq(schema.refunds.accountId, accountId), sql`${schema.refunds.createdAt} >= ${start.toISOString()}`, eq(schema.refunds.status, "refunded")));
  return {
    month: start.toLocaleString("en-US", { month: "long" }),
    chargedCents: Number(c?.total ?? 0),
    charges: Number(c?.n ?? 0),
    refundedCents: Number(r?.total ?? 0),
  };
}
