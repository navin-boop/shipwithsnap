/**
 * What a seller pays us for postage.
 *
 * One number, one function, used by every path that turns a carrier rate into a price we show:
 * the Ship screen, the public rate calculator, the landing-page sample, multi-parcel orders and
 * batches. Quote and charge cannot drift apart because `storeQuotes` writes the marked-up price
 * into `rate_quotes`, and `buyLabel` charges the stored row rather than anything the browser sends
 * — so the price is decided server-side and a client cannot talk us into a cheaper one.
 *
 * The markup is applied exactly once, at the moment a carrier rate becomes a customer-facing
 * price. Anything downstream — the authorization, the capture, the label row, the receipt, a
 * refund on void — carries that same number.
 */

/** Percentage added to the carrier's rate. */
export const POSTAGE_MARKUP_PERCENT = 30;

/**
 * The price we show and charge for a carrier rate, in integer cents. Rounded up: rounding down on
 * every label is a slow leak, and a cent in our favour is not worth the arithmetic risk.
 */
export function sellPriceCents(carrierCents: number): number {
  if (!Number.isFinite(carrierCents) || carrierCents <= 0) return 0;
  return Math.ceil((Math.round(carrierCents) * (100 + POSTAGE_MARKUP_PERCENT)) / 100);
}

/** What we keep on a rate, in integer cents. */
export function marginCents(carrierCents: number): number {
  return sellPriceCents(carrierCents) - Math.max(0, Math.round(carrierCents));
}

/**
 * Splits one multi-box price across its boxes, in whole cents, so the per-label prices add up to
 * exactly what was charged. The leftover cents go to the first boxes. Each label carries its own
 * share, which is what a void of that one box refunds.
 */
export function splitCents(totalCents: number, parts: number): number[] {
  const n = Math.max(0, Math.floor(parts));
  if (n === 0) return [];
  const total = Math.max(0, Math.round(totalCents));
  const base = Math.floor(total / n);
  const extra = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}

/** Plain-language description, for the pages that have to state it. */
export function markupLabel(): string {
  return `${POSTAGE_MARKUP_PERCENT}%`;
}
