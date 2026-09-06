import type { RateRules } from "@/lib/db/schema";

// Pure helpers shared by the server (quotes, batch) and the client (Ship pre-selection).

/** Hide carriers/services per the account's rules; keep the cheapest ordering. */
export function applyRateRules<T extends { carrier: string; serviceCode: string }>(rates: T[], rules: RateRules | null | undefined): T[] {
  if (!rules) return rates;
  const hc = new Set((rules.hiddenCarriers ?? []).map((c) => c.toLowerCase()));
  const hs = new Set(rules.hiddenServices ?? []);
  const out = rates.filter((r) => !hc.has(r.carrier.toLowerCase()) && !hs.has(`${r.carrier}:${r.serviceCode}`));
  return out.length ? out : rates; // never hide everything
}

/** Which rate to pre-select (Ship default, Batch auto-pick). */
export function pickRate<T extends { carrier: string; priceCents: number; estDays: number | null }>(rates: T[], rules: RateRules | null | undefined): T | undefined {
  if (!rates.length) return undefined;
  const cheapest = [...rates].sort((a, b) => a.priceCents - b.priceCents)[0];
  switch (rules?.mode) {
    case "fastest":
      return [...rates].sort((a, b) => (a.estDays ?? 99) - (b.estDays ?? 99) || a.priceCents - b.priceCents)[0];
    case "cheapest_within_days": {
      const ok = rates.filter((r) => r.estDays !== null && r.estDays <= (rules.maxDays ?? 3));
      return ok.length ? [...ok].sort((a, b) => a.priceCents - b.priceCents)[0] : cheapest;
    }
    case "preferred_carrier": {
      const ok = rates.filter((r) => r.carrier.toLowerCase() === (rules.preferredCarrier ?? "").toLowerCase());
      return ok.length ? [...ok].sort((a, b) => a.priceCents - b.priceCents)[0] : cheapest;
    }
    default:
      return cheapest;
  }
}

export function describeRule(rules: RateRules | null | undefined): string {
  switch (rules?.mode) {
    case "fastest": return "fastest pre-selected";
    case "cheapest_within_days": return `cheapest within ${rules.maxDays ?? 3} days pre-selected`;
    case "preferred_carrier": return `${rules.preferredCarrier ?? "preferred carrier"} pre-selected`;
    default: return "cheapest first";
  }
}

/** Rates say "FEDEX_GROUND" / "GroundAdvantage"; SmartRate says "fedex_ground" / "groundadvantage". */
export function serviceKey(carrier: string, serviceCode: string): string {
  return `${carrier}:${serviceCode}`.toLowerCase().replace(/[^a-z0-9:]/g, "");
}
