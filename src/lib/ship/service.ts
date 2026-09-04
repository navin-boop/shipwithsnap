import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { Account, Address, Parcel, ShipmentExtras } from "@/lib/db/schema";
import { getShippingProvider, ProviderError, type AddressInput, type RateQuoteResult } from "@/lib/shipping";
import { addressHash } from "./address";

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
  };
}

/** Insert-or-touch an address for the account, deduplicated by hash. */
export async function upsertAddress(
  accountId: string,
  kind: "ship_to" | "ship_from",
  a: AddressInput,
  validation?: { residential?: boolean | null; source: string },
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

export type QuoteInput = {
  to: AddressInput;
  toResidential: boolean | null;
  fromId: string;
  parcel: Parcel;
  extras: ShipmentExtras;
  /** Null for purchases made through the public API. */
  createdBy: string | null;
  orderId?: string;
};

export type Quote = {
  shipmentId: string;
  rates: Array<RateQuoteResult & { id: string; expiresAt: string }>;
};

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
      createdBy: input.createdBy,
      orderId: input.orderId ?? null,
    })
    .returning();

  const provider = getShippingProvider();
  // Carriers (FedEx especially) reject labels without a phone; fall back to the sender's.
  const toInput = toAddressInput(to);
  if (!toInput.phone && from.phone) toInput.phone = from.phone;
  const { providerShipmentId, rates } = await provider.rate({
    reference: shipment.id,
    to: toInput,
    from: toAddressInput(from),
    parcel: {
      lengthIn: input.parcel.lengthIn,
      widthIn: input.parcel.widthIn,
      heightIn: input.parcel.heightIn,
      weightOz: input.parcel.weightOz,
      predefinedPackage: input.parcel.predefinedPackage,
    },
    format: account.labelFormat,
    insuranceCents: input.extras.insuranceCents,
    signature: input.extras.signature,
  });

  const expiresAt = new Date(Date.now() + QUOTE_TTL_MS);
  const priced = rates
    .map((r) => ({ ...r, priceCents: applyPricing(account, r.priceCents) }))
    .sort((a, b) => a.priceCents - b.priceCents);

  await db().update(schema.shipments).set({ providerShipmentId, updatedAt: new Date() }).where(eq(schema.shipments.id, shipment.id));

  const rows = priced.length
    ? await db()
        .insert(schema.rateQuotes)
        .values(
          priced.map((r) => ({
            shipmentId: shipment.id,
            providerRateId: r.providerRateId,
            carrier: r.carrier,
            serviceCode: r.serviceCode,
            serviceName: r.serviceName,
            retailCents: r.retailCents,
            priceCents: r.priceCents,
            estDays: r.estDays,
            estDeliveryDate: r.estDeliveryDate,
            expiresAt,
          })),
        )
        .returning()
    : [];

  return {
    shipmentId: shipment.id,
    rates: rows.map((row) => ({
      id: row.id,
      providerRateId: row.providerRateId,
      carrier: row.carrier,
      serviceCode: row.serviceCode,
      serviceName: row.serviceName,
      priceCents: row.priceCents,
      retailCents: row.retailCents,
      estDays: row.estDays,
      estDeliveryDate: row.estDeliveryDate,
      expiresAt: expiresAt.toISOString(),
    })),
  };
}

export type BuyInput = { shipmentId: string; rateQuoteId: string; idempotencyKey: string };

export class BuyError extends Error {
  constructor(
    public readonly code: "rate_expired" | "already_labeled" | "provider_unavailable" | "address_invalid" | "unknown",
    message: string,
  ) {
    super(message);
    this.name = "BuyError";
  }
}

/**
 * design/BuyLabelFlow.dc.html, phase-3 subset: idempotency → quote valid → provider buy →
 * record label + advance shipment. The Stripe authorize/capture steps arrive in phase 4.
 */
export async function buyLabel(account: Account, input: BuyInput) {
  // 1–2. Idempotency: a retry with the same key returns the label already bought.
  const replay = await db().query.labels.findFirst({ where: eq(schema.labels.idempotencyKey, input.idempotencyKey) });
  if (replay) return replay;

  const shipment = await db().query.shipments.findFirst({
    where: and(eq(schema.shipments.id, input.shipmentId), eq(schema.shipments.accountId, account.id)),
  });
  if (!shipment?.providerShipmentId) throw new BuyError("unknown", "Shipment not found");

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

  // 5–7. Buy at the provider.
  let result;
  try {
    result = await getShippingProvider().buy({
      providerShipmentId: shipment.providerShipmentId,
      providerRateId: quote.providerRateId,
      insuranceCents: shipment.extras.insuranceCents,
      format: account.labelFormat,
    });
  } catch (err) {
    if (err instanceof ProviderError) throw new BuyError(err.code === "unknown" ? "provider_unavailable" : err.code, err.message);
    throw err;
  }

  // 8. Record the label and advance the shipment atomically.
  const [inserted] = await db().batch([
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
        providerLabelId: result.providerLabelId,
        providerTrackerId: result.providerTrackerId,
        fileUrl: result.labelUrl,
        format: account.labelFormat,
        idempotencyKey: input.idempotencyKey,
      })
      .returning(),
    db()
      .update(schema.shipments)
      .set({ status: "label_created", updatedAt: new Date() })
      .where(eq(schema.shipments.id, shipment.id)),
  ]);
  return inserted[0];
}
