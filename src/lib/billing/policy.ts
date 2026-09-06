import { BillingError } from "./stripe";

// Billing policy that depends on nothing but the account row, kept free of database imports so it
// can be reasoned about — and tested — on its own.

export type LockReason = "unpaid_adjustment" | "dispute" | "card_declined" | null;

const WHY: Record<Exclude<LockReason, null>, string> = {
  unpaid_adjustment: "A carrier adjustment on your account could not be charged. Settle it on the Billing page to start buying labels again.",
  dispute: "A payment on this account is disputed. New purchases are paused until it is resolved.",
  card_declined: "Your last charge was declined. Update your card on the Billing page to start buying labels again.",
};

export function lockReasonMessage(reason: LockReason): string | null {
  return reason ? (WHY[reason] ?? "Buying is paused on this account.") : null;
}

/** Buying is blocked while an adjustment is unpaid or a dispute is open (design/Ledger.dc.html). */
export function assertNotLocked(account: { billingLockedReason: LockReason }): void {
  const message = lockReasonMessage(account.billingLockedReason);
  if (message) throw new BillingError("billing_locked", message);
}
