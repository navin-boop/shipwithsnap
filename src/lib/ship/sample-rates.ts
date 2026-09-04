import { unstable_cache } from "next/cache";
import { getShippingProvider, type RateQuoteResult } from "@/lib/shipping";

export type SampleRate = Pick<RateQuoteResult, "carrier" | "serviceName" | "priceCents" | "retailCents" | "estDays">;

const FALLBACK: SampleRate[] = [
  { carrier: "USPS", serviceName: "Ground Advantage", priceCents: 643, retailCents: 979, estDays: 3 },
  { carrier: "UPS", serviceName: "Ground Saver", priceCents: 716, retailCents: 1132, estDays: 4 },
  { carrier: "USPS", serviceName: "Priority Mail", priceCents: 892, retailCents: 1234, estDays: 2 },
];

/**
 * Live rates for the landing-page example (Brooklyn → Austin, 12×9×4 in, 1.8 lb), cached for an hour.
 * Rating costs nothing at the provider. Falls back to representative numbers if the provider is down.
 */
export const getSampleRates = unstable_cache(
  async (): Promise<{ rates: SampleRate[]; live: boolean }> => {
    try {
      const { rates } = await getShippingProvider().rate({
        reference: "landing-sample",
        from: { name: "Snap", street1: "20 Jay St", city: "Brooklyn", state: "NY", zip: "11201", country: "US" },
        to: { name: "Sample", street1: "2200 S Lamar Blvd", city: "Austin", state: "TX", zip: "78704", country: "US" },
        parcel: { lengthIn: 12, widthIn: 9, heightIn: 4, weightOz: 29 },
        format: "pdf_4x6",
      });
      const sorted = rates.filter((r) => r.priceCents > 0).sort((a, b) => a.priceCents - b.priceCents);
      if (!sorted.length) return { rates: FALLBACK, live: false };
      // Cheapest, fastest, and the cheapest USPS Priority-class option — three rows like the design.
      const cheapest = sorted[0];
      const fastest = sorted.reduce((b, r) => (r.estDays !== null && (b.estDays === null || r.estDays < b.estDays) ? r : b), sorted[0]);
      const pick = [cheapest, sorted.find((r) => r !== cheapest && r.carrier !== cheapest.carrier) ?? sorted[1], fastest]
        .filter((r, i, arr) => r && arr.indexOf(r) === i)
        .slice(0, 3);
      return { rates: pick.map(({ carrier, serviceName, priceCents, retailCents, estDays }) => ({ carrier, serviceName, priceCents, retailCents, estDays })), live: true };
    } catch {
      return { rates: FALLBACK, live: false };
    }
  },
  ["landing-sample-rates"],
  { revalidate: 3600 },
);
