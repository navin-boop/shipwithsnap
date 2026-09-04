"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { getShippingProvider, ProviderError, type AddressInput } from "@/lib/shipping";
import { parseAddressLine } from "./address";
import { BuyError, buyLabel, quoteShipment, upsertAddress, type Quote } from "./service";

async function requireAccount() {
  const session = await auth();
  if (!session?.user) throw new Error("Not signed in");
  const account = await db().query.accounts.findFirst({ where: eq(schema.accounts.id, session.user.accountId) });
  if (!account) throw new Error("Account not found");
  return { account, userId: session.user.id };
}

const addressInput = z.object({
  name: z.string().trim().max(80).nullable().optional(),
  company: z.string().trim().max(80).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  email: z.string().trim().email().nullable().optional().or(z.literal("")),
  street1: z.string().trim().min(1),
  street2: z.string().trim().nullable().optional(),
  city: z.string().trim().min(1),
  state: z.string().trim().length(2),
  zip: z.string().trim().regex(/^\d{5}(-\d{4})?$/),
  country: z.string().default("US"),
});

export type VerifyResult =
  | { ok: true; address: AddressInput; residential: boolean | null }
  | { ok: false; errors: string[] };

/** Free text → verified address. Returns field problems rather than throwing. */
export async function verifyShipTo(name: string, line: string, email?: string): Promise<VerifyResult> {
  await requireAccount();
  const parsed = parseAddressLine(line);
  if (!parsed) return { ok: false, errors: ["Couldn't read that address — try \"418 Bergen St, Brooklyn, NY 11217\"."] };
  const input = addressInput.safeParse({ ...parsed, name: name.trim() || null, email: email?.trim() || null });
  if (!input.success) return { ok: false, errors: [input.error.issues.some((i) => i.path[0] === "email") ? "That email doesn't look right." : "Check the street, city, state and ZIP."] };
  try {
    const v = await getShippingProvider().verifyAddress(input.data);
    if (!v.ok || !v.address) return { ok: false, errors: v.errors ?? ["Address could not be verified."] };
    return { ok: true, address: { ...v.address, name: input.data.name ?? null, email: input.data.email || null }, residential: v.residential ?? null };
  } catch (err) {
    if (err instanceof ProviderError) return { ok: false, errors: ["Address verification is unavailable right now — try again."] };
    throw err;
  }
}

const shipFromInput = addressInput.extend({
  name: z.string().trim().min(1, "Name or store is required."),
  phone: z.string().trim().regex(/^\+?[\d\s().-]{10,}$/, "Carriers require a phone number on the label."),
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

const quoteInput = z.object({
  to: addressInput,
  toResidential: z.boolean().nullable(),
  fromId: z.string().uuid(),
  parcel: z.object({
    type: z.enum(["box", "mailer", "flat_rate"]),
    lengthIn: z.number().positive().max(108),
    widthIn: z.number().positive().max(108),
    heightIn: z.number().positive().max(108),
    weightOz: z.number().positive().max(70 * 16),
    predefinedPackage: z.string().optional(),
  }),
  extras: z.object({ insuranceCents: z.number().int().nonnegative().optional(), signature: z.boolean().optional() }),
});

export type QuoteResult = { ok: true; quote: Quote } | { ok: false; error: string };

export async function getRates(input: z.input<typeof quoteInput>): Promise<QuoteResult> {
  const { account, userId } = await requireAccount();
  const parsed = quoteInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the package dimensions and weight." };
  try {
    const quote = await quoteShipment(account, { ...parsed.data, createdBy: userId });
    if (!quote.rates.length) return { ok: false, error: "No services are available for this package." };
    return { ok: true, quote };
  } catch (err) {
    if (err instanceof ProviderError) {
      return { ok: false, error: err.code === "address_invalid" ? err.message : "Rates are temporarily unavailable — try again in a moment." };
    }
    throw err;
  }
}

export type BuyResult =
  | { ok: true; label: { id: string; trackingNumber: string; carrier: string; serviceName: string; priceCents: number; retailCents: number | null; fileUrl: string } }
  | { ok: false; code: BuyError["code"]; error: string };

export async function buy(input: { shipmentId: string; rateQuoteId: string; idempotencyKey: string }): Promise<BuyResult> {
  const { account } = await requireAccount();
  try {
    const label = await buyLabel(account, input);
    return {
      ok: true,
      label: {
        id: label.id,
        trackingNumber: label.trackingNumber,
        carrier: label.carrier,
        serviceName: label.serviceName,
        priceCents: label.priceCents,
        retailCents: label.retailCents,
        fileUrl: `/api/labels/${label.id}/file`,
      },
    };
  } catch (err) {
    if (err instanceof BuyError) return { ok: false, code: err.code, error: err.message };
    throw err;
  }
}
