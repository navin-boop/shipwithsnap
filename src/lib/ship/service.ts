import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, schema } from "@/lib/db";
import type { Account, Address, Label, Parcel, ShipmentExtras } from "@/lib/db/schema";
import { applyRateRules } from "./rules";
import {
  getShippingProvider,
  ProviderError,
  type AddressInput,
  type CustomsInput,
  type LabelFormatCode,
  type RateQuoteResult,
  type ShipmentOptions,
} from "@/lib/shipping";
import { addressHash } from "./address";
import { BillingError, authorize, billingEnabled, cancelAuthorization, capture, getDefaultPaymentMethod } from "@/lib/billing/service";

const QUOTE_TTL_MS = 10 * 60 * 1000;

/** Pricing tiers are pass-through today; markup by tier plugs in here. */
function applyPricing(_account: Account, priceCents: number): number {
  return priceCents;
}

export function toAddressInput(a: Address): AddressInput {
  return {
    name: a.name,
    company: a.company,
    phone: a.phone,
    email: a.email,
    street1: a.street1,
    street2: a.street2,
    city: a.city,
    state: a.state,
    zip: a.zip,
    country: a.country,
    residential: a.residential,
  };
}

/** Insert-or-touch an address for the account, deduplicated by hash. */
export async function upsertAddress(
  accountId: string,
  kind: "ship_to" | "ship_from",
  a: AddressInput,
  validation?: { residential?: boolean | null; source: string; latitude?: number | null; longitude?: number | null },
): Promise<Address> {
  const hash = addressHash(a);
  const [row] = await db()
    .insert(schema.addresses)
    .values({
      accountId,
      kind,
      name: a.name ?? null,
      company: a.company ?? null,
      phone: a.phone ?? null,
      email: a.email ?? null,
      street1: a.street1,
      street2: a.street2 ?? null,
      city: a.city,
      state: a.state,
      zip: a.zip,
      country: a.country ?? "US",
      residential: validation?.residential ?? null,
      latitude: validation?.latitude ?? null,
      longitude: validation?.longitude ?? null,
      validatedAt: validation ? new Date() : null,
      validationSource: validation?.source ?? null,
      hash,
    })
    .onConflictDoUpdate({
      target: [schema.addresses.accountId, schema.addresses.hash],
      set: {
        lastUsedAt: new Date(),
        residential: validation?.residential ?? sql`${schema.addresses.residential}`,
        validatedAt: validation ? new Date() : sql`${schema.addresses.validatedAt}`,
        validationSource: validation?.source ?? sql`${schema.addresses.validationSource}`,
      },
    })
    .returning();
  return row;
}

export async function getDefaultShipFrom(account: Account): Promise<Address | null> {
  if (account.defaultShipFromId) {
    const a = await db().query.addresses.findFirst({ where: eq(schema.addresses.id, account.defaultShipFromId) });
    if (a) return a;
  }
  return (
    (await db().query.addresses.findFirst({
      where: and(eq(schema.addresses.accountId, account.id), eq(schema.addresses.kind, "ship_from")),
      orderBy: desc(schema.addresses.lastUsedAt),
    })) ?? null
  );
}

/** Provider ids of the customer's own enabled carrier accounts (UPS/FedEx/DHL negotiated rates). */
export async function enabledCarrierAccountIds(accountId: string): Promise<string[]> {
  const rows = await db().query.carrierAccounts.findMany({ where: and(eq(schema.carrierAccounts.accountId, accountId), eq(schema.carrierAccounts.enabled, true)) });
  return rows.map((r) => r.providerCarrierAccountId);
}

export type RateView = RateQuoteResult & { id: string; expiresAt: string };

export { applyRateRules, pickRate } from "./rules";

export type QuoteInput = {
  to: AddressInput;
  toResidential: boolean | null;
  fromId: string;
  parcel: Parcel;
  extras: ShipmentExtras;
  options?: ShipmentOptions;
  customs?: CustomsInput | null;
  isReturn?: boolean;
  returnOfLabelId?: string | null;
  /** Null for purchases made through the public API. */
  createdBy: string | null;
  orderId?: string;
};

export type Quote = {
  shipmentId: string;
  rates: RateView[];
  messages: string[];
};

function parcelInput(p: Parcel) {
  return { lengthIn: p.lengthIn, widthIn: p.widthIn, heightIn: p.heightIn, weightOz: p.weightOz, predefinedPackage: p.predefinedPackage };
}

async function storeQuotes(shipmentId: string, account: Account, rates: RateQuoteResult[]): Promise<RateView[]> {
  const expiresAt = new Date(Date.now() + QUOTE_TTL_MS);
  const priced = applyRateRules(rates, account.rateRules)
    .map((r) => ({ ...r, priceCents: applyPricing(account, r.priceCents) }))
    .sort((a, b) => a.priceCents - b.priceCents);
  const rows = priced.length
    ? await db()
        .insert(schema.rateQuotes)
        .values(
          priced.map((r) => ({
            shipmentId,
            providerRateId: r.providerRateId,
            carrier: r.carrier,
            serviceCode: r.serviceCode,
            serviceName: r.serviceName,
            retailCents: r.retailCents,
            priceCents: r.priceCents,
            estDays: r.estDays,
            estDeliveryDate: r.estDeliveryDate,
            deliveryDateGuaranteed: r.deliveryDateGuaranteed ?? false,
            expiresAt,
          })),
        )
        .returning()
    : [];
  return rows.map((row) => ({
    id: row.id,
    providerRateId: row.providerRateId,
    carrier: row.carrier,
    serviceCode: row.serviceCode,
    serviceName: row.serviceName,
    priceCents: row.priceCents,
    retailCents: row.retailCents,
    estDays: row.estDays,
    estDeliveryDate: row.estDeliveryDate,
    deliveryDateGuaranteed: row.deliveryDateGuaranteed,
    expiresAt: expiresAt.toISOString(),
  }));
}

/** Creates a draft shipment, rates it with the provider, stores the quotes. */
export async function quoteShipment(account: Account, input: QuoteInput): Promise<Quote> {
  const from = await db().query.addresses.findFirst({
    where: and(eq(schema.addresses.id, input.fromId), eq(schema.addresses.accountId, account.id)),
  });
  if (!from) throw new ProviderError("unknown", "Ship-from address not found");

  const to = await upsertAddress(account.id, "ship_to", input.to, {
    residential: input.toResidential,
    source: getShippingProvider().name,
  });

  const [shipment] = await db()
    .insert(schema.shipments)
    .values({
      accountId: account.id,
      shipToId: to.id,
      shipFromId: from.id,
      parcel: input.parcel,
      extras: input.extras,
      options: input.options ?? {},
      customs: input.customs ?? null,
      isReturn: !!input.isReturn,
      returnOfLabelId: input.returnOfLabelId ?? null,
      createdBy: input.createdBy,
      orderId: input.orderId ?? null,
    })
    .returning();

  const provider = getShippingProvider();
  // Carriers (FedEx especially) reject labels without a phone; fall back to the sender's.
  const toInput = toAddressInput(to);
  if (!toInput.phone && from.phone) toInput.phone = from.phone;
  const { providerShipmentId, rates, messages } = await provider.rate({
    reference: shipment.id,
    to: toInput,
    from: toAddressInput(from),
    parcel: parcelInput(input.parcel),
    format: account.labelFormat,
    insuranceCents: input.extras.insuranceCents,
    options: input.options,
    customs: input.customs ?? null,
    isReturn: input.isReturn,
    carrierAccountIds: await enabledCarrierAccountIds(account.id),
    signature: input.extras.signature,
  });

  await db().update(schema.shipments).set({ providerShipmentId, updatedAt: new Date() }).where(eq(schema.shipments.id, shipment.id));
  const stored = await storeQuotes(shipment.id, account, rates);
  return { shipmentId: shipment.id, rates: stored, messages: messages ?? [] };
}

/** Multi-parcel: N boxes to one address, one rate per service, one buy. */
export async function quoteMultiParcel(account: Account, input: Omit<QuoteInput, "parcel"> & { parcels: Parcel[] }): Promise<Quote & { groupId: string; shipmentIds: string[] }> {
  if (input.parcels.length < 2) throw new ProviderError("unknown", "A multi-box shipment needs at least two boxes");
  const from = await db().query.addresses.findFirst({ where: and(eq(schema.addresses.id, input.fromId), eq(schema.addresses.accountId, account.id)) });
  if (!from) throw new ProviderError("unknown", "Ship-from address not found");
  const to = await upsertAddress(account.id, "ship_to", input.to, { residential: input.toResidential, source: getShippingProvider().name });

  const groupId = randomUUID();
  const rows = await db()
    .insert(schema.shipments)
    .values(
      input.parcels.map((parcel, i) => ({
        accountId: account.id, shipToId: to.id, shipFromId: from.id, groupId, parcelIndex: i, parcel, extras: input.extras, options: input.options ?? {},
        customs: input.customs ?? null, isReturn: !!input.isReturn, createdBy: input.createdBy, orderId: input.orderId ?? null,
      })),
    )
    .returning();

  const toInput = toAddressInput(to);
  if (!toInput.phone && from.phone) toInput.phone = from.phone;
  const { providerOrderId, rates, messages } = await getShippingProvider().rateOrder({
    reference: groupId, to: toInput, from: toAddressInput(from), parcels: input.parcels.map(parcelInput), format: account.labelFormat,
    insuranceCents: input.extras.insuranceCents, options: input.options, customs: input.customs ?? null, isReturn: input.isReturn,
    carrierAccountIds: await enabledCarrierAccountIds(account.id),
  });
  await db().update(schema.shipments).set({ providerOrderId, updatedAt: new Date() }).where(eq(schema.shipments.groupId, groupId));

  // Quotes hang off the first shipment; the provider rate id encodes the order-level choice.
  const stored = await storeQuotes(rows[0].id, account, rates.map((r) => ({
    providerRateId: `order:${r.carrier}:${r.serviceCode}`, carrier: r.carrier, serviceCode: r.serviceCode, serviceName: r.serviceName,
    priceCents: r.priceCents, retailCents: r.retailCents, estDays: r.estDays, estDeliveryDate: r.estDeliveryDate,
  })));
  return { shipmentId: rows[0].id, groupId, shipmentIds: rows.map((r) => r.id), rates: stored, messages: messages ?? [] };
}

export type BuyInput = {
  shipmentId: string;
  rateQuoteId: string;
  idempotencyKey: string;
  /** Set for batch rows: they ride on the batch's single authorization instead of taking their own. */
  chargeId?: string | null;
};

export class BuyError extends Error {
  constructor(
    public readonly code: "rate_expired" | "already_labeled" | "provider_unavailable" | "address_invalid" | "not_supported" | "card_declined" | "no_card" | "billing_locked" | "unknown",
    message: string,
    /** The issuer's decline code, when the card was the problem. */
    public readonly declineCode?: string | null,
  ) {
    super(message);
    this.name = "BuyError";
  }
}

/** Billing failures are buy failures from the caller's point of view. */
function buyErrorFromBilling(err: BillingError): BuyError {
  const code = err.code === "card_declined" || err.code === "no_card" || err.code === "billing_locked" ? err.code : err.code === "provider_unavailable" ? "provider_unavailable" : "unknown";
  return new BuyError(code, err.message, err.declineCode ?? null);
}

function buyErrorFrom(err: unknown): never {
  if (err instanceof ProviderError) throw new BuyError(err.code === "unknown" ? "provider_unavailable" : err.code, err.message);
  throw err;
}

/**
 * design/BuyLabelFlow.dc.html, phase-3 subset: idempotency → quote valid → provider buy →
 * record label + advance shipment. The Stripe authorize/capture steps arrive in phase 4.
 */
export async function buyLabel(account: Account, input: BuyInput): Promise<Label> {
  // 1–2. Idempotency: a retry with the same key returns the label already bought.
  const replay = await db().query.labels.findFirst({ where: eq(schema.labels.idempotencyKey, input.idempotencyKey) });
  if (replay) return replay;

  const shipment = await db().query.shipments.findFirst({
    where: and(eq(schema.shipments.id, input.shipmentId), eq(schema.shipments.accountId, account.id)),
  });
  if (!shipment) throw new BuyError("unknown", "Shipment not found");

  const active = await db().query.labels.findFirst({
    where: and(eq(schema.labels.shipmentId, shipment.id), isNull(schema.labels.voidedAt)),
  });
  if (active) throw new BuyError("already_labeled", "This shipment already has a label");

  // 4. Quote still valid?
  const quote = await db().query.rateQuotes.findFirst({
    where: and(eq(schema.rateQuotes.id, input.rateQuoteId), eq(schema.rateQuotes.shipmentId, shipment.id)),
  });
  if (!quote) throw new BuyError("unknown", "Rate not found");
  if (quote.expiresAt.getTime() < Date.now()) throw new BuyError("rate_expired", "That rate expired — refresh rates");

  if (quote.providerRateId.startsWith("order:") && shipment.groupId) {
    const labels = await buyGroup(account, shipment.groupId, quote, input.idempotencyKey);
    return labels[0];
  }
  if (!shipment.providerShipmentId) throw new BuyError("unknown", "Shipment was never rated");

  // 3. Authorize the card before anything is bought (design/BuyLabelFlow.dc.html). With billing
  //    switched off the label is still bought, just without a charge.
  let chargeId: string | null = input.chargeId ?? null;
  const ownsCharge = !input.chargeId;
  if (billingEnabled() && ownsCharge) {
    try {
      const authorized = await authorize(account, {
        amountCents: quote.priceCents,
        description: `Label · ${quote.carrier} ${quote.serviceName}`,
        idempotencyKey: `label:${input.idempotencyKey}`,
      });
      chargeId = authorized.charge.id;
    } catch (err) {
      if (err instanceof BillingError) throw buyErrorFromBilling(err);
      throw err;
    }
  }

  // 5–7. Buy at the provider. Any failure here cancels the hold — nothing is charged.
  let result;
  try {
    result = await getShippingProvider().buy({
      providerShipmentId: shipment.providerShipmentId,
      providerRateId: quote.providerRateId,
      insuranceCents: shipment.extras.insuranceCents,
      format: account.labelFormat,
      endShipperId: account.providerEndShipperId,
    });
  } catch (err) {
    if (chargeId && ownsCharge) await cancelAuthorization(chargeId).catch((e) => console.error("could not cancel authorization", e));
    buyErrorFrom(err);
  }

  // 8. Record the label and advance the shipment atomically, then capture.
  let inserted;
  try {
    [inserted] = await db().batch([
      db()
        .insert(schema.labels)
        .values({
          accountId: account.id,
          shipmentId: shipment.id,
          rateQuoteId: quote.id,
          carrier: quote.carrier,
          serviceCode: quote.serviceCode,
          serviceName: quote.serviceName,
          trackingNumber: result.trackingCode,
          priceCents: quote.priceCents,
          retailCents: quote.retailCents,
          insuredCents: shipment.extras.insuranceCents ?? 0,
          feesCents: result.feesCents ?? {},
          forms: result.forms ?? [],
          providerLabelId: result.providerLabelId,
          providerTrackerId: result.providerTrackerId,
          fileUrl: result.labelUrl,
          format: account.labelFormat,
          chargeId,
          idempotencyKey: input.idempotencyKey,
          estDeliveryDate: quote.estDeliveryDate,
        })
        .returning(),
      db()
        .update(schema.shipments)
        .set({ status: "label_created", updatedAt: new Date() })
        .where(eq(schema.shipments.id, shipment.id)),
    ]);
  } catch (err) {
    // The label exists at the carrier but we could not record it: refund the orphan and drop the
    // hold, so the seller is not charged for a label they can never see.
    console.error("recording the label failed — refunding the orphan", err);
    await getShippingProvider().void(shipment.providerShipmentId).catch((e) => console.error("orphan refund failed", e));
    if (chargeId && ownsCharge) await cancelAuthorization(chargeId).catch((e) => console.error("could not cancel authorization", e));
    throw new BuyError("unknown", "The label was bought but could not be saved. It has been refunded — nothing was charged.");
  }

  // Capture last. A capture failure leaves the label valid and the charge authorized; the cron
  // retries it rather than losing the label.
  if (chargeId && ownsCharge) {
    try {
      await capture(chargeId, quote.priceCents);
    } catch (err) {
      console.error(`capture failed for charge ${chargeId} — the cron will retry`, err);
    }
  }
  return inserted[0];
}

/** Cards on file, for the Ship page's "charged to …" line. */
export async function hasPaymentMethod(accountId: string): Promise<boolean> {
  if (!billingEnabled()) return true;
  return (await getDefaultPaymentMethod(accountId)) !== null;
}

/** Buys every box of a multi-parcel group with one provider call. */
async function buyGroup(account: Account, groupId: string, quote: schema.RateQuote, idempotencyKey: string): Promise<Label[]> {
  const members = await db().query.shipments.findMany({ where: and(eq(schema.shipments.groupId, groupId), eq(schema.shipments.accountId, account.id)), orderBy: schema.shipments.parcelIndex });
  const providerOrderId = members[0]?.providerOrderId;
  if (!providerOrderId) throw new BuyError("unknown", "Shipment group was never rated");
  const [, carrier, serviceCode] = quote.providerRateId.split(":");
  let results;
  try {
    results = await getShippingProvider().buyOrder(providerOrderId, carrier, serviceCode, account.labelFormat);
  } catch (err) {
    buyErrorFrom(err);
  }
  const perBox = Math.round(quote.priceCents / members.length);
  const inserted = await db()
    .insert(schema.labels)
    .values(
      results.map((r, i) => ({
        accountId: account.id, shipmentId: members[i]?.id ?? members[0].id, rateQuoteId: quote.id, carrier: quote.carrier, serviceCode: quote.serviceCode, serviceName: quote.serviceName,
        trackingNumber: r.trackingCode, priceCents: r.chargedCents || perBox, retailCents: quote.retailCents === null ? null : Math.round(quote.retailCents / members.length),
        insuredCents: members[i]?.extras.insuranceCents ?? 0, feesCents: r.feesCents ?? {}, forms: r.forms ?? [], providerLabelId: r.providerLabelId, providerTrackerId: r.providerTrackerId,
        fileUrl: r.labelUrl, format: account.labelFormat, idempotencyKey: i === 0 ? idempotencyKey : `${idempotencyKey}:${i}`, estDeliveryDate: quote.estDeliveryDate,
      })),
    )
    .returning();
  await db().update(schema.shipments).set({ providerShipmentId: sql`coalesce(${schema.shipments.providerShipmentId}, ${schema.shipments.id}::text)`, status: "label_created", updatedAt: new Date() }).where(inArray(schema.shipments.id, members.map((m) => m.id)));
  for (const [i, r] of results.entries()) if (members[i]) await db().update(schema.shipments).set({ providerShipmentId: r.providerShipmentId }).where(eq(schema.shipments.id, members[i].id));
  return inserted;
}

/** Quote a return label for an existing outbound label: recipient ships it back to us. */
export async function quoteReturn(account: Account, labelId: string, createdBy: string | null, weightOz?: number): Promise<Quote> {
  const label = await db().query.labels.findFirst({ where: and(eq(schema.labels.id, labelId), eq(schema.labels.accountId, account.id)) });
  if (!label) throw new ProviderError("unknown", "Label not found");
  const shipment = await db().query.shipments.findFirst({ where: eq(schema.shipments.id, label.shipmentId) });
  if (!shipment) throw new ProviderError("unknown", "Shipment not found");
  const to = await db().query.addresses.findFirst({ where: eq(schema.addresses.id, shipment.shipToId) });
  if (!to) throw new ProviderError("unknown", "Recipient not found");
  return quoteShipment(account, {
    to: toAddressInput(to),
    toResidential: to.residential,
    fromId: shipment.shipFromId,
    parcel: { ...shipment.parcel, weightOz: weightOz ?? shipment.parcel.weightOz },
    extras: {},
    options: { printCustom1: `Return of ${label.trackingNumber}` },
    isReturn: true,
    returnOfLabelId: label.id,
    createdBy,
  });
}

/** Re-render the label in another format (e.g. ZPL for a thermal printer) and remember it. */
export async function convertLabel(account: Account, labelId: string, format: LabelFormatCode): Promise<Label> {
  const label = await db().query.labels.findFirst({ where: and(eq(schema.labels.id, labelId), eq(schema.labels.accountId, account.id)) });
  if (!label) throw new ProviderError("unknown", "Label not found");
  if (label.format === format) return label;
  const shipment = await db().query.shipments.findFirst({ where: eq(schema.shipments.id, label.shipmentId) });
  if (!shipment?.providerShipmentId) throw new ProviderError("unknown", "Shipment not found");
  const url = await getShippingProvider().convertLabel(shipment.providerShipmentId, format);
  const [updated] = await db().update(schema.labels).set({ fileUrl: url, format }).where(eq(schema.labels.id, label.id)).returning();
  return updated;
}
