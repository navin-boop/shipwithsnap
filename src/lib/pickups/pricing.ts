/**
 * What a seller pays for a carrier pickup.
 *
 * The carrier's own fee, passed through at cost — no markup, the same as a carrier adjustment.
 * A free pickup (USPS usually is) takes no charge at all, so no hold appears on the card for it.
 */
export function pickupFeeCents(carrierCents: number | null | undefined): number {
  if (carrierCents == null || !Number.isFinite(carrierCents)) return 0;
  return Math.max(0, Math.round(carrierCents));
}

/**
 * Charges for a pickup are found again by their idempotency key, so no column is needed to link
 * them. Each scheduling attempt gets its own key: a retry after the carrier declined must not
 * replay the earlier, cancelled authorization.
 */
export function pickupChargePrefix(pickupId: string): string {
  return `pickup:${pickupId}:`;
}

export function pickupChargeKey(pickupId: string, previousAttempts: number): string {
  return `${pickupChargePrefix(pickupId)}${Math.max(0, Math.floor(previousAttempts)) + 1}`;
}

/** The pickup a charge was taken for, or null when the charge is for something else. */
export function pickupIdFromChargeKey(key: string): string | null {
  const m = /^pickup:([0-9a-f-]{36}):\d+$/i.exec(key);
  return m ? m[1] : null;
}
