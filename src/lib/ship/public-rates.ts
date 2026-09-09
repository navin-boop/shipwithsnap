"use server";

import { z } from "zod";
import { getShippingProvider, ProviderError, publicCarrierNotes, type RateQuoteResult } from "@/lib/shipping";
import { sellPriceCents } from "./pricing";
import { stateForZip } from "./zip-state";

const input = z.object({
  fromZip: z.string().trim().regex(/^\d{5}$/, "From ZIP needs 5 digits."),
  toZip: z.string().trim().regex(/^\d{5}$/, "To ZIP needs 5 digits."),
  lengthIn: z.coerce.number().positive().max(108),
  widthIn: z.coerce.number().positive().max(108),
  heightIn: z.coerce.number().positive().max(108),
  weightLb: z.coerce.number().positive().max(70),
});

export type PublicRatesResult =
  | { ok: true; rates: Array<Pick<RateQuoteResult, "carrier" | "serviceName" | "priceCents" | "retailCents" | "estDays">>; notes: string[] }
  | { ok: false; error: string };

/** Public, unauthenticated rate check for the /rates page. ZIP-only addresses; rating is free. */
export async function publicRates(raw: z.input<typeof input>): Promise<PublicRatesResult> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the inputs." };
  const d = parsed.data;
  try {
    const { rates, messages = [] } = await getShippingProvider().rate({
      reference: "public-rates",
      // Several carriers refuse to quote without a state — DHL eCommerce and USAExportPBA among
      // them — so they used to drop out of every estimate. The calculator only asks for ZIPs, and
      // EasyPost will not resolve a bare ZIP, so the state is derived from the ZIP itself.
      from: { street1: "", city: "", state: stateForZip(d.fromZip) ?? "", zip: d.fromZip, country: "US" },
      to: { street1: "", city: "", state: stateForZip(d.toZip) ?? "", zip: d.toZip, country: "US" },
      parcel: { lengthIn: d.lengthIn, widthIn: d.widthIn, heightIn: d.heightIn, weightOz: Math.round(d.weightLb * 16) },
      format: "pdf_4x6",
    });
    // Our price, not the carrier's — an estimate that undercuts the checkout price is worse than
    // no estimate at all.
    const sorted = rates
      .filter((r) => r.priceCents > 0)
      .map((r) => ({ ...r, priceCents: sellPriceCents(r.priceCents) }))
      .sort((a, b) => a.priceCents - b.priceCents);
    // A carrier that declines to rate says why in `messages`. Discarding those made a missing
    // carrier indistinguishable from one that does not exist — which is exactly how UPS looked
    // absent here for hours. So they are always logged in full; what a visitor sees is the
    // humanised subset, because the raw text names EasyPost fields and reads like a broken site.
    if (messages.length) console.info(`[public-rates] ${d.fromZip}->${d.toZip}: ${messages.join(" | ")}`);
    // The calculator only takes US ZIPs, so the lane is always domestic.
    const notes = publicCarrierNotes(messages, { fromCountry: "US", toCountry: "US" });
    if (!sorted.length) return { ok: false, error: notes[0] ?? "No services found for that package." };
    return {
      ok: true,
      rates: sorted.map(({ carrier, serviceName, priceCents, retailCents, estDays }) => ({ carrier, serviceName, priceCents, retailCents, estDays })),
      notes,
    };
  } catch (err) {
    if (err instanceof ProviderError) return { ok: false, error: "Rates are temporarily unavailable — try again in a moment." };
    throw err;
  }
}
