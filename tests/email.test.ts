import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as t from "../src/lib/email/templates";
import { esc, money } from "../src/lib/email/layout";
import { safeSubject } from "../src/lib/email";

/** Store names, recipient names and carrier messages all come from outside. None may be trusted. */
const XSS = `<script>alert('x')</script>" onload="evil()`;

function everyTemplate(): Array<{ name: string; email: t.RenderedEmail }> {
  const url = "https://www.shipwithsnap.com/x";
  return [
    ...(["shipped", "out_for_delivery", "delivered", "exception"] as const).map((kind) => ({
      name: `tracking_${kind}`,
      email: t.trackingUpdate({ kind, storeName: XSS, recipientName: XSS, carrier: "USPS", serviceName: "Priority Mail", trackingNumber: "94001", trackingUrl: url, carrierMessage: XSS, etaLabel: "Tuesday" }),
    })),
    { name: "welcome", email: t.welcome({ name: XSS, email: "a@b.com" }) },
    { name: "team_invite", email: t.teamInvite({ accountName: XSS, inviterName: XSS, role: "shipper", inviteUrl: url, expiresInDays: 7 }) },
    { name: "password_reset", email: t.passwordReset({ email: "a@b.com", resetUrl: url, expiresInMinutes: 30 }) },
    { name: "label_receipt", email: t.labelReceipt({ accountName: XSS, amountCents: 812, cardLabel: "Visa ·· 4242", label: { carrier: "USPS", serviceName: "Ground Advantage", trackingNumber: "94001", to: XSS, amountCents: 812 }, receiptUrl: url }) },
    { name: "batch_receipt", email: t.batchReceipt({ accountName: XSS, amountCents: 14260, labelCount: 18, failedCount: 2, cardLabel: null, batchUrl: url }) },
    { name: "refund_issued", email: t.refundIssued({ accountName: XSS, amountCents: 812, trackingNumber: "94001", carrier: "USPS", cardLabel: null, billingUrl: url }) },
    { name: "payment_failed", email: t.paymentFailed({ accountName: XSS, amountCents: 812, reason: XSS, cardLabel: null, billingUrl: url }) },
    { name: "adjustment_charged", email: t.adjustmentCharged({ accountName: XSS, amountCents: 340, trackingNumber: "94001", carrier: "UPS", reason: XSS, billingUrl: url }) },
    { name: "claim_update", email: t.claimUpdate({ accountName: XSS, status: "approved", type: "damage", amountCents: 12000, trackingNumber: "94001", claimUrl: url, carrierNote: XSS }) },
    { name: "pickup_confirmed", email: t.pickupUpdate({ accountName: XSS, state: "confirmed", carrier: "USPS", windowLabel: "9–5", address: XSS, confirmationNumber: "WDC1", pickupUrl: url }) },
    { name: "pickup_cancelled", email: t.pickupUpdate({ accountName: XSS, state: "cancelled", carrier: "USPS", windowLabel: "9–5", address: XSS, confirmationNumber: null, pickupUrl: url }) },
  ];
}

describe("email templates", () => {
  it("covers every name in TEMPLATE_NAMES", () => {
    const rendered = new Set(everyTemplate().map((e) => e.name));
    for (const name of t.TEMPLATE_NAMES) assert.ok(rendered.has(name), `${name} has no rendered sample`);
  });

  for (const { name, email } of everyTemplate()) {
    it(`${name} renders a subject, html and text`, () => {
      assert.ok(email.subject.length > 5, "subject is too short to be useful");
      assert.ok(email.html.startsWith("<!doctype html>"));
      assert.ok(email.text.length > 20, "plain-text twin is missing — spam filters read it");
    });

    it(`${name} escapes hostile input`, () => {
      // The raw tag must never survive into the markup.
      assert.ok(!email.html.includes("<script>"), "unescaped <script> reached the HTML");
      assert.ok(!email.html.includes(`" onload="`), "attribute injection reached the HTML");
      // A subject is a header, not HTML: markup is inert there, but a newline would split it.
      assert.ok(!/[\r\n]/.test(safeSubject(email.subject)), "a newline survived into the subject");
    });

    it(`${name} leaks no undefined or NaN`, () => {
      assert.ok(!/undefined|NaN|\[object Object\]/.test(email.html), "a missing value rendered into the HTML");
      assert.ok(!/undefined|NaN/.test(email.subject));
    });
  }
});

describe("email helpers", () => {
  it("escapes the five dangerous characters", () => {
    assert.equal(esc(`<a href="x">&'`), "&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
  });

  it("folds newlines out of subjects, so a store name cannot forge a header", () => {
    assert.equal(safeSubject("Order shipped\r\nBcc: attacker@example.com"), "Order shipped Bcc: attacker@example.com");
    assert.equal(safeSubject("  spaced   out  "), "spaced out");
    assert.ok(safeSubject("x".repeat(500)).length <= 200);
  });

  it("formats integer cents, never floats", () => {
    assert.equal(money(812), "$8.12");
    assert.equal(money(0), "$0.00");
    assert.equal(money(100000), "$1000.00");
  });
});
