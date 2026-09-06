import Stripe from "stripe";

/**
 * The Stripe seam. Spec: design/Ledger.dc.html.
 *
 * Billing is optional: with no STRIPE_SECRET_KEY the whole system is inert and labels are bought
 * without a charge, exactly as before Stripe existed. That keeps the app usable while keys are
 * being set up, and makes local development free.
 *
 * Safety: a live key (sk_live_) outside Vercel Production would take real money for test labels,
 * so it is refused there unless ALLOW_LIVE_STRIPE=1 is set — the same guard the EasyPost seam uses.
 */

let cached: Stripe | null | undefined;

export function getStripe(): Stripe | null {
  if (cached !== undefined) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    cached = null;
    return cached;
  }
  if (key.startsWith("sk_live") && process.env.VERCEL_ENV !== "production" && process.env.ALLOW_LIVE_STRIPE !== "1") {
    console.error("STRIPE_SECRET_KEY is a live key outside production — billing is disabled. Use a test key (sk_test_…).");
    cached = null;
    return cached;
  }
  cached = new Stripe(key, { apiVersion: "2026-08-26.dahlia", typescript: true, maxNetworkRetries: 2, timeout: 20_000 });
  return cached;
}

/** True when charges can actually be taken. Everything else degrades to "no charge". */
export function billingEnabled(): boolean {
  return getStripe() !== null;
}

/**
 * The publishable key, read on the server and handed to the card form as a prop — it is never
 * inlined into the client bundle, so it does not need the NEXT_PUBLIC_ prefix.
 *
 * Both names work. Prefer plain STRIPE_PUBLISHABLE_KEY: a NEXT_PUBLIC_ name marked "Secret" on
 * Vercel triggers a public-prefix warning, and a saved Secret cannot be converted to Config.
 */
export function publishableKey(): string | null {
  return process.env.STRIPE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null;
}

/** Errors we surface to the seller, with the decline reason the card issuer gave. */
export class BillingError extends Error {
  constructor(
    public readonly code: "card_declined" | "no_card" | "billing_locked" | "provider_unavailable" | "not_configured" | "unknown",
    message: string,
    public readonly declineCode?: string | null,
  ) {
    super(message);
    this.name = "BillingError";
  }
}

/** Stripe's own message is usually the clearest thing we can show; fall back when it is missing. */
export function fromStripeError(err: unknown): BillingError {
  const e = err as Stripe.errors.StripeError;
  if (e?.type === "StripeCardError") {
    return new BillingError("card_declined", e.message || "Your card was declined.", e.decline_code ?? e.code ?? null);
  }
  if (e?.type === "StripeConnectionError" || e?.type === "StripeAPIError") {
    return new BillingError("provider_unavailable", "Card processing is unavailable right now — try again in a moment.");
  }
  return new BillingError("unknown", e?.message || "Payment failed.");
}
