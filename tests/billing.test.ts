import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

// The failure branches from design/BuyLabelFlow.dc.html and design/Ledger.dc.html, as tests.
// These cover the decisions that are pure: what each failure maps to, and when buying is blocked.

const env = { ...process.env };
after(() => { process.env = env; });

describe("Stripe seam", () => {
  it("is disabled with no key, so labels are bought without a charge", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const { getStripe, billingEnabled } = await freshStripeModule();
    assert.equal(getStripe(), null);
    assert.equal(billingEnabled(), false);
  });

  it("refuses a live key outside production, so test labels never take real money", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_notarealkey";
    process.env.VERCEL_ENV = "preview";
    delete process.env.ALLOW_LIVE_STRIPE;
    const { billingEnabled } = await freshStripeModule();
    assert.equal(billingEnabled(), false);
  });

  it("allows a live key in production", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_notarealkey";
    process.env.VERCEL_ENV = "production";
    const { billingEnabled } = await freshStripeModule();
    assert.equal(billingEnabled(), true);
  });

  it("allows a test key anywhere", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_notarealkey";
    process.env.VERCEL_ENV = "development";
    const { billingEnabled } = await freshStripeModule();
    assert.equal(billingEnabled(), true);
  });
});

describe("card errors reach the seller intact", () => {
  it("keeps the issuer's decline code", async () => {
    const { fromStripeError } = await freshStripeModule();
    const mapped = fromStripeError({ type: "StripeCardError", message: "Your card has insufficient funds.", decline_code: "insufficient_funds", code: "card_declined" });
    assert.equal(mapped.code, "card_declined");
    assert.equal(mapped.declineCode, "insufficient_funds");
    assert.equal(mapped.message, "Your card has insufficient funds.");
  });

  it("treats a Stripe outage as retryable rather than a decline", async () => {
    const { fromStripeError } = await freshStripeModule();
    assert.equal(fromStripeError({ type: "StripeConnectionError" }).code, "provider_unavailable");
  });

  it("falls back to unknown for anything else", async () => {
    const { fromStripeError } = await freshStripeModule();
    assert.equal(fromStripeError(new Error("boom")).code, "unknown");
  });
});

describe("buying is blocked while money is owed", () => {
  it("blocks on an unpaid carrier adjustment", async () => {
    const { assertNotLocked } = await import("@/lib/billing/policy");
    assert.throws(() => assertNotLocked({ billingLockedReason: "unpaid_adjustment" } as never), (e: unknown) => e instanceof Error && e.name === "BillingError");
  });

  it("blocks while a dispute is open", async () => {
    const { assertNotLocked } = await import("@/lib/billing/policy");
    assert.throws(() => assertNotLocked({ billingLockedReason: "dispute" } as never), (e: unknown) => e instanceof Error && e.name === "BillingError");
  });

  it("allows buying on a healthy account", async () => {
    const { assertNotLocked } = await import("@/lib/billing/policy");
    assert.doesNotThrow(() => assertNotLocked({ billingLockedReason: null } as never));
  });
});

/** Re-imports the module so the memoised client picks up the current env. */
async function freshStripeModule() {
  return import(`@/lib/billing/stripe?cachebust=${Math.random()}`);
}
