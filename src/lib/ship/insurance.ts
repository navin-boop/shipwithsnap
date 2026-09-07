/**
 * What declared-value insurance costs the seller.
 *
 * This is the one place the price is defined. The Ship screen quotes from it, the buy authorizes
 * from it and the receipt itemises from it, so the number a seller is shown before buying is
 * always the number they are charged.
 *
 * Note this is deliberately NOT pass-through, unlike postage. The lowest price guarantee is a
 * promise about postage — `applyPricing` in service.ts stays pass-through and must stay that way —
 * and insurance is a separate, priced product. The public pages say so in as many words.
 */

/** Cents charged per $100 of declared value. EasyPost bills us roughly $0.55 per $100. */
export const INSURANCE_CENTS_PER_100 = 70;

/**
 * Floor on the premium. Carriers and EasyPost apply their own minimum on small policies, so
 * without one a $20 declared value would be sold for 14¢ and cost us more than that to place.
 * It is quoted to the seller alongside the rate, never discovered at checkout.
 */
export const INSURANCE_MINIMUM_CENTS = 100;

/** Highest declared value we will insure, matching what the carriers will actually underwrite. */
export const INSURANCE_MAX_VALUE_CENTS = 500_000;

/**
 * The premium for a declared value, in integer cents. Rounded up, because rounding down on every
 * label is a slow leak, and a cent in the seller's favour is not worth the arithmetic risk.
 */
export function insurancePremiumCents(declaredValueCents: number | null | undefined): number {
  const value = Math.max(0, Math.round(declaredValueCents ?? 0));
  if (value <= 0) return 0;
  return Math.max(INSURANCE_MINIMUM_CENTS, Math.ceil((value * INSURANCE_CENTS_PER_100) / 10_000));
}

/** Plain-language price, for the Ship screen and the marketing pages. */
export function insuranceRateLabel(): string {
  return `$${(INSURANCE_CENTS_PER_100 / 100).toFixed(2)} per $100 of declared value, minimum $${(INSURANCE_MINIMUM_CENTS / 100).toFixed(2)}`;
}

/** Why a declared value was refused, or null when it is fine. */
export function insuranceValueError(declaredValueCents: number): string | null {
  if (declaredValueCents < 0) return "Declared value can't be negative.";
  if (declaredValueCents > INSURANCE_MAX_VALUE_CENTS) return `The most we can insure is $${(INSURANCE_MAX_VALUE_CENTS / 100).toLocaleString("en-US")}.`;
  return null;
}
