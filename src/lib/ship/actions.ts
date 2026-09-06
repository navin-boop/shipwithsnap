"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { getShippingProvider, ProviderError, type AddressInput, type DeliveryEstimate } from "@/lib/shipping";
import { parseAddressLine } from "./address";
import { BuyError, buyLabel, convertLabel, quoteMultiParcel, quoteReturn, quoteShipment, upsertAddress, type Quote } from "./service";

async function requireAccount() {
  const session = await auth();
  if (!session?.user) throw new Error("Not signed in");
  const account = await db().query.accounts.findFirst({ where: eq(schema.accounts.id, session.user.accountId) });
  if (!account) throw new Error("Account not found");
  return { account, userId: session.user.id };
}

const addressInput = z
  .object({
    name: z.string().trim().max(80).nullable().optional(),
    company: z.string().trim().max(80).nullable().optional(),
    phone: z.string().trim().max(30).nullable().optional(),
    email: z.string().trim().email().nullable().optional().or(z.literal("")),
    street1: z.string().trim().min(1),
    street2: z.string().trim().nullable().optional(),
    city: z.string().trim().min(1),
    state: z.string().trim().max(40),
    zip: z.string().trim().min(3).max(12),
    country: z.string().trim().length(2).default("US"),
  })
  .superRefine((a, ctx) => {
    if (a.country === "US") {
      if (!/^[A-Za-z]{2}$/.test(a.state)) ctx.addIssue({ code: "custom", path: ["state"], message: "State should be two letters." });
      if (!/^\d{5}(-\d{4})?$/.test(a.zip)) ctx.addIssue({ code: "custom", path: ["zip"], message: "ZIP needs 5 digits." });
    }
  });

export type VerifyResult =
  | { ok: true; address: AddressInput; residential: boolean | null }
  | { ok: false; errors: string[] };

/** Free text → verified address. Returns field problems rather than throwing. */
export async function verifyShipTo(name: string, line: string, email?: string, country = "US"): Promise<VerifyResult> {
  await requireAccount();
  const parsed = parseAddressLine(line);
  if (!parsed) return { ok: false, errors: ["Couldn't read that address — try \"418 Bergen St, Brooklyn, NY 11217\"."] };
  return verifyAddressFields({ ...parsed, country, name: name.trim() || null, email: email?.trim() || null });
}

/** Structured fields → verified address (used by the field editor and international entry). */
export async function verifyAddressFields(fields: z.input<typeof addressInput>): Promise<VerifyResult> {
  await requireAccount();
  const input = addressInput.safeParse(fields);
  if (!input.success) return { ok: false, errors: [input.error.issues.some((i) => i.path[0] === "email") ? "That email doesn't look right." : input.error.issues[0]?.message ?? "Check the street, city, state and ZIP."] };
  try {
    const v = await getShippingProvider().verifyAddress(input.data);
    if (!v.ok || !v.address) return { ok: false, errors: v.errors ?? ["Address could not be verified."] };
    return { ok: true, address: { ...v.address, name: input.data.name ?? null, email: input.data.email || null, phone: v.address.phone ?? input.data.phone ?? null }, residential: v.residential ?? null };
  } catch (err) {
    if (err instanceof ProviderError) return { ok: false, errors: ["Address verification is unavailable right now — try again."] };
    throw err;
  }
}

const shipFromInput = z.object({
  name: z.string().trim().min(1, "Name or store is required."),
  company: z.string().trim().max(80).nullable().optional(),
  phone: z.string().trim().regex(/^\+?[\d\s().-]{10,}$/, "Carriers require a phone number on the label."),
  email: z.string().trim().email().nullable().optional().or(z.literal("")),
  street1: z.string().trim().min(1),
  street2: z.string().trim().nullable().optional(),
  city: z.string().trim().min(1),
  state: z.string().trim().length(2),
  zip: z.string().trim().regex(/^\d{5}(-\d{4})?$/),
  country: z.string().default("US"),
});

export type SaveShipFromResult = { ok: true; address: schema.Address } | { ok: false; errors: string[] };

/** Saves (or reuses) a ship-from address and makes it the account default. */
export async function saveShipFrom(input: z.input<typeof shipFromInput>): Promise<SaveShipFromResult> {
  const { account } = await requireAccount();
  const parsed = shipFromInput.safeParse(input);
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map((i) => i.message) };
  let residential: boolean | null = null;
  try {
    const v = await getShippingProvider().verifyAddress(parsed.data);
    if (!v.ok) return { ok: false, errors: v.errors ?? ["Address could not be verified."] };
    residential = v.residential ?? null;
  } catch {
    // Verification outage shouldn't block saving a ship-from; rates will still verify it.
  }
  const address = await upsertAddress(account.id, "ship_from", parsed.data, { residential, source: getShippingProvider().name });
  await db().update(schema.accounts).set({ defaultShipFromId: address.id }).where(eq(schema.accounts.id, account.id));
  return { ok: true, address };
}

const parcelSchema = z.object({
  type: z.enum(["box", "mailer", "flat_rate", "carrier_package"]),
  lengthIn: z.number().nonnegative().max(108),
  widthIn: z.number().nonnegative().max(108),
  heightIn: z.number().nonnegative().max(108),
  weightOz: z.number().positive().max(150 * 16),
  predefinedPackage: z.string().optional(),
});

const optionsSchema = z
  .object({
    signature: z.enum(["none", "signature", "adult", "indirect"]).optional(),
    saturdayDelivery: z.boolean().optional(),
    holdForPickup: z.boolean().optional(),
    machinable: z.boolean().optional(),
    additionalHandling: z.boolean().optional(),
    labelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
    printCustom1: z.string().trim().max(40).optional(),
    printCustom2: z.string().trim().max(40).optional(),
    invoiceNumber: z.string().trim().max(40).optional(),
    handlingInstructions: z.string().trim().max(200).optional(),
    contentDescription: z.string().trim().max(120).optional(),
    endorsement: z.string().optional(),
    hazmat: z.string().optional(),
    dryIce: z.boolean().optional(),
    dryIceWeightOz: z.number().nonnegative().optional(),
    alcohol: z.boolean().optional(),
    perishable: z.boolean().optional(),
    certifiedMail: z.boolean().optional(),
    registeredMail: z.boolean().optional(),
    returnReceipt: z.boolean().optional(),
    specialRatesEligibility: z.string().optional(),
    carbonNeutral: z.boolean().optional(),
    carrierNotificationEmail: z.string().trim().email().optional().or(z.literal("")),
    carrierNotificationSms: z.string().trim().max(30).optional(),
  })
  .transform((o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined && v !== false)));

const customsSchema = z.object({
  contentsType: z.string().min(1),
  contentsExplanation: z.string().trim().max(200).nullable().optional(),
  customsCertify: z.boolean().refine((v) => v, { message: "You must certify the customs declaration." }),
  customsSigner: z.string().trim().min(1, "Customs signer is required."),
  eelPfc: z.string().trim().min(1),
  nonDeliveryOption: z.enum(["return", "abandon"]),
  restrictionType: z.string().min(1),
  restrictionComments: z.string().trim().max(200).nullable().optional(),
  declaration: z.string().trim().max(200).nullable().optional(),
  incoterm: z.string().nullable().optional(),
  items: z
    .array(
      z.object({
        description: z.string().trim().min(1, "Every item needs a description."),
        quantity: z.number().int().positive(),
        valueCents: z.number().int().positive("Every item needs a value."),
        weightOz: z.number().positive("Every item needs a weight."),
        hsTariffNumber: z.string().trim().max(20).nullable().optional(),
        originCountry: z.string().length(2),
        code: z.string().trim().max(40).nullable().optional(),
      }),
    )
    .min(1, "Add at least one customs item."),
});

const quoteInput = z.object({
  to: addressInput,
  toResidential: z.boolean().nullable(),
  fromId: z.string().uuid(),
  parcel: parcelSchema,
  parcels: z.array(parcelSchema).optional(),
  extras: z.object({ insuranceCents: z.number().int().nonnegative().max(500_000).optional(), signature: z.boolean().optional() }),
  options: optionsSchema.optional(),
  customs: customsSchema.nullable().optional(),
  isReturn: z.boolean().optional(),
});

export type QuoteResult = { ok: true; quote: Quote & { groupId?: string } } | { ok: false; error: string };

export async function getRates(input: z.input<typeof quoteInput>): Promise<QuoteResult> {
  const { account, userId } = await requireAccount();
  const parsed = quoteInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the package dimensions and weight." };
  const data = parsed.data;
  if (data.to.country !== "US" && !data.customs) return { ok: false, error: "International shipments need a customs declaration." };
  try {
    const base = { to: data.to, toResidential: data.toResidential, fromId: data.fromId, extras: data.extras, options: data.options, customs: data.customs ?? null, isReturn: data.isReturn, createdBy: userId };
    const quote = data.parcels && data.parcels.length > 1
      ? await quoteMultiParcel(account, { ...base, parcels: data.parcels })
      : await quoteShipment(account, { ...base, parcel: data.parcel });
    if (!quote.rates.length) return { ok: false, error: quote.messages[0] ? `No services available: ${quote.messages[0]}` : "No services are available for this package." };
    return { ok: true, quote };
  } catch (err) {
    if (err instanceof ProviderError) {
      return { ok: false, error: err.code === "address_invalid" || err.code === "unknown" ? err.message : "Rates are temporarily unavailable — try again in a moment." };
    }
    throw err;
  }
}

export type LabelView = { id: string; trackingNumber: string; carrier: string; serviceName: string; priceCents: number; retailCents: number | null; fileUrl: string; forms: Array<{ type: string; url: string }> };
export type BuyResult = { ok: true; label: LabelView } | { ok: false; code: BuyError["code"]; error: string };

function labelView(label: schema.Label): LabelView {
  return { id: label.id, trackingNumber: label.trackingNumber, carrier: label.carrier, serviceName: label.serviceName, priceCents: label.priceCents, retailCents: label.retailCents, fileUrl: `/api/labels/${label.id}/file`, forms: label.forms };
}

export async function buy(input: { shipmentId: string; rateQuoteId: string; idempotencyKey: string }): Promise<BuyResult> {
  const { account } = await requireAccount();
  try {
    const label = await buyLabel(account, input);
    return { ok: true, label: labelView(label) };
  } catch (err) {
    if (err instanceof BuyError) return { ok: false, code: err.code, error: err.message };
    throw err;
  }
}

/** SmartRate: when will it arrive, per service, with confidence. */
export async function getDeliveryEstimates(input: { fromZip: string; toZip: string; plannedShipDate?: string }): Promise<DeliveryEstimate[]> {
  await requireAccount();
  if (!/^\d{5}/.test(input.fromZip) || !/^\d{5}/.test(input.toZip)) return [];
  try {
    return await getShippingProvider().estimateDelivery({ fromZip: input.fromZip.slice(0, 5), toZip: input.toZip.slice(0, 5), plannedShipDate: input.plannedShipDate ?? new Date().toISOString().slice(0, 10) });
  } catch {
    return [];
  }
}

export async function getReturnRates(labelId: string, weightOz?: number): Promise<QuoteResult> {
  const { account, userId } = await requireAccount();
  try {
    const quote = await quoteReturn(account, labelId, userId, weightOz);
    if (!quote.rates.length) return { ok: false, error: "No return services are available for this package." };
    return { ok: true, quote };
  } catch (err) {
    if (err instanceof ProviderError) return { ok: false, error: err.message };
    throw err;
  }
}

export async function convertLabelFormat(labelId: string, format: "pdf_4x6" | "pdf_letter" | "zpl"): Promise<{ ok: true; label: LabelView } | { ok: false; error: string }> {
  const { account } = await requireAccount();
  try {
    return { ok: true, label: labelView(await convertLabel(account, labelId, format)) };
  } catch (err) {
    if (err instanceof ProviderError) return { ok: false, error: err.message };
    throw err;
  }
}

export async function listParcelPresets() {
  const { account } = await requireAccount();
  return db().query.parcelPresets.findMany({ where: eq(schema.parcelPresets.accountId, account.id), orderBy: schema.parcelPresets.createdAt });
}

export async function saveParcelPreset(input: { name: string; parcel: z.input<typeof parcelSchema> }) {
  const { account } = await requireAccount();
  const parcel = parcelSchema.parse(input.parcel);
  const name = input.name.trim().slice(0, 40) || "Saved package";
  const [row] = await db().insert(schema.parcelPresets).values({ accountId: account.id, name, parcel }).returning();
  return row;
}

export async function deleteParcelPreset(id: string) {
  const { account } = await requireAccount();
  await db().delete(schema.parcelPresets).where(and(eq(schema.parcelPresets.id, id), eq(schema.parcelPresets.accountId, account.id)));
}
