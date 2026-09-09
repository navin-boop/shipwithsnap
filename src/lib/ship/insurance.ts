/**
 * What declared-value insurance costs the seller.
 *
 * This is the one place the price is defined. The Ship screen quotes from it, the buy authorizes
 * from it and the receipt itemises from it, so the number a seller is shown before buying is
 * always the number they are charged.
 *
 * Insurance is priced separately from postage: postage carries the markup in pricing.ts, and this
 * premium is charged on top and itemised on its own line, so a receipt always adds up.
 */

/**
 * EasyPost's own charge, measured rather than assumed: buying test labels at declared values of
 * $50, $100, $500 and $2,000 returned an InsuranceFee of $1.00, $1.00, $5.00 and $20.00 — a flat
 * 1% of declared value with a $1.00 floor. (An earlier version of this file guessed 0.55%, which
 * was wrong in the expensive direction: it priced cover below cost.)
 */
export const EASYPOST_INSURANCE_PERCENT = 1;
export const EASYPOST_INSURANCE_MINIMUM_CENTS = 100;

/** What we add on top of EasyPost's fee. */
export const INSURANCE_MARKUP_PERCENT = 70;

/** Highest declared value we will insure, matching what the carriers will actually underwrite. */
export const INSURANCE_MAX_VALUE_CENTS = 500_000;

/**
 * What the declared value starts at on the Ship screen, where insurance is on by default.
 * $100 is EasyPost's own floor, so the default is the cheapest cover that exists.
 */
export const DEFAULT_INSURED_DOLLARS = 100;

/** What EasyPost bills us for a given declared value, in integer cents. */
export function easypostInsuranceCostCents(declaredValueCents: number | null | undefined): number {
  const value = Math.max(0, Math.round(declaredValueCents ?? 0));
  if (value <= 0) return 0;
  return Math.max(EASYPOST_INSURANCE_MINIMUM_CENTS, Math.ceil((value * EASYPOST_INSURANCE_PERCENT) / 100));
}

/**
 * The premium the seller pays: EasyPost's fee plus our markup. Rounded up, because rounding down
 * on every label is a slow leak, and a cent in the seller's favour is not worth the arithmetic risk.
 */
export function insurancePremiumCents(declaredValueCents: number | null | undefined): number {
  const cost = easypostInsuranceCostCents(declaredValueCents);
  if (cost <= 0) return 0;
  return Math.ceil((cost * (100 + INSURANCE_MARKUP_PERCENT)) / 100);
}

/** The floor a seller can pay, which is EasyPost's floor plus the markup. */
export const INSURANCE_MINIMUM_CENTS = insurancePremiumCents(1);

/** Plain-language price, for the Ship screen and the marketing pages. */
export function insuranceRateLabel(): string {
  const per100 = insurancePremiumCents(10_000);
  return `$${(per100 / 100).toFixed(2)} per $100 of declared value, minimum $${(INSURANCE_MINIMUM_CENTS / 100).toFixed(2)}`;
}

/** Why a declared value was refused, or null when it is fine. */
export function insuranceValueError(declaredValueCents: number): string | null {
  if (declaredValueCents < 0) return "Declared value can't be negative.";
  if (declaredValueCents > INSURANCE_MAX_VALUE_CENTS) return `The most we can insure is $${(INSURANCE_MAX_VALUE_CENTS / 100).toLocaleString("en-US")}.`;
  return null;
}
