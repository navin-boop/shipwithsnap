"use server";

import { z } from "zod";
import { getShippingProvider, ProviderError, type RateQuoteResult } from "@/lib/shipping";

const input = z.object({
  fromZip: z.string().trim().regex(/^\d{5}$/, "From ZIP needs 5 digits."),
  toZip: z.string().trim().regex(/^\d{5}$/, "To ZIP needs 5 digits."),
  lengthIn: z.coerce.number().positive().max(108),
  widthIn: z.coerce.number().positive().max(108),
  heightIn: z.coerce.number().positive().max(108),
  weightLb: z.coerce.number().positive().max(70),
});

export type PublicRatesResult =
  | { ok: true; rates: Array<Pick<RateQuoteResult, "carrier" | "serviceName" | "priceCents" | "retailCents" | "estDays">> }
  | { ok: false; error: string };

/** Public, unauthenticated rate check for the /rates page. ZIP-only addresses; rating is free. */
export async function publicRates(raw: z.input<typeof input>): Promise<PublicRatesResult> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the inputs." };
  const d = parsed.data;
  try {
    const { rates } = await getShippingProvider().rate({
      reference: "public-rates",
      from: { street1: "", city: "", state: "", zip: d.fromZip, country: "US" },
      to: { street1: "", city: "", state: "", zip: d.toZip, country: "US" },
      parcel: { lengthIn: d.lengthIn, widthIn: d.widthIn, heightIn: d.heightIn, weightOz: Math.round(d.weightLb * 16) },
      format: "pdf_4x6",
    });
    const sorted = rates.filter((r) => r.priceCents > 0).sort((a, b) => a.priceCents - b.priceCents);
    if (!sorted.length) return { ok: false, error: "No services found for that package." };
    return { ok: true, rates: sorted.map(({ carrier, serviceName, priceCents, retailCents, estDays }) => ({ carrier, serviceName, priceCents, retailCents, estDays })) };
  } catch (err) {
    if (err instanceof ProviderError) return { ok: false, error: "Rates are temporarily unavailable — try again in a moment." };
    throw err;
  }
}
