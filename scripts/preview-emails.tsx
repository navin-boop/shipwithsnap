/**
 * Renders every template with sample data so they can be reviewed in a browser.
 *
 *   npx tsx scripts/preview-emails.tsx && open email-previews/index.html
 *
 * Output is gitignored — this is a viewer, not a build step. Sample values are obviously fake so
 * nothing here can be mistaken for a real shipment.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import * as t from "../src/lib/email/templates";

const OUT = "email-previews";
const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.shipwithsnap.com";

const samples: Array<{ name: t.TemplateName; title: string; audience: "Customer" | "Account"; email: t.RenderedEmail }> = [
  ...(["shipped", "out_for_delivery", "delivered", "exception"] as const).map((kind) => ({
    name: `tracking_${kind}` as t.TemplateName,
    title: `Tracking — ${kind.replace(/_/g, " ")}`,
    audience: "Customer" as const,
    email: t.trackingUpdate({
      kind,
      storeName: "Cedar & Pine Goods",
      storeLogoUrl: null,
      recipientName: "Dana Whitfield",
      carrier: "USPS",
      serviceName: "Priority Mail",
      trackingNumber: "9434 6002 0819 2109 5640 07",
      trackingUrl: `${BASE}/t/sample-token`,
      etaLabel: "Tuesday, 9 September",
      carrierMessage: kind === "exception" ? "No access to the delivery location. The carrier will retry tomorrow." : null,
    }),
  })),
  {
    name: "verify_email",
    title: "Verify email",
    audience: "Account",
    email: t.verifyEmail({ code: "048213", email: "you@example.com", expiresInMinutes: 15 }),
  },
  {
    name: "welcome",
    title: "Welcome",
    audience: "Account",
    email: t.welcome({ name: "Navin Dhungana", email: "you@example.com" }),
  },
  {
    name: "team_invite",
    title: "Team invite",
    audience: "Account",
    email: t.teamInvite({ accountName: "Cedar & Pine Goods", inviterName: "Navin", role: "shipper", inviteUrl: `${BASE}/invite/sample-token`, expiresInDays: 7 }),
  },
  {
    name: "password_reset",
    title: "Password reset",
    audience: "Account",
    email: t.passwordReset({ email: "you@example.com", resetUrl: `${BASE}/reset/sample-token`, expiresInMinutes: 30 }),
  },
  {
    name: "label_receipt",
    title: "Label receipt",
    audience: "Account",
    email: t.labelReceipt({
      accountName: "Cedar & Pine Goods",
      amountCents: 812,
      cardLabel: "Visa ·· 4242",
      label: { carrier: "USPS", serviceName: "Ground Advantage", trackingNumber: "9434600208192109564007", to: "Dana Whitfield, Austin, TX", amountCents: 812 },
      receiptUrl: `${BASE}/billing`,
    }),
  },
  {
    name: "batch_receipt",
    title: "Batch receipt",
    audience: "Account",
    email: t.batchReceipt({ accountName: "Cedar & Pine Goods", amountCents: 14260, labelCount: 18, failedCount: 2, cardLabel: "Visa ·· 4242", batchUrl: `${BASE}/batch/sample` }),
  },
  {
    name: "refund_issued",
    title: "Refund issued",
    audience: "Account",
    email: t.refundIssued({ accountName: "Cedar & Pine Goods", amountCents: 812, trackingNumber: "9434600208192109564007", carrier: "USPS", cardLabel: "Visa ·· 4242", billingUrl: `${BASE}/billing` }),
  },
  {
    name: "payment_failed",
    title: "Payment failed",
    audience: "Account",
    email: t.paymentFailed({ accountName: "Cedar & Pine Goods", amountCents: 812, reason: "Your card was declined. Contact your bank for more information.", cardLabel: "Visa ·· 4242", billingUrl: `${BASE}/billing` }),
  },
  {
    name: "adjustment_charged",
    title: "Carrier adjustment",
    audience: "Account",
    email: t.adjustmentCharged({ accountName: "Cedar & Pine Goods", amountCents: 340, trackingNumber: "9434600208192109564007", carrier: "UPS", reason: "Billed weight 3 lb, declared 2 lb", billingUrl: `${BASE}/billing` }),
  },
  {
    name: "claim_update",
    title: "Claim update",
    audience: "Account",
    email: t.claimUpdate({ accountName: "Cedar & Pine Goods", status: "approved", type: "damage", amountCents: 12000, trackingNumber: "9434600208192109564007", claimUrl: `${BASE}/claims`, carrierNote: "Approved in full. Payment is issued within 7–10 business days." }),
  },
  {
    name: "pickup_confirmed",
    title: "Pickup confirmed",
    audience: "Account",
    email: t.pickupUpdate({ accountName: "Cedar & Pine Goods", state: "confirmed", carrier: "USPS", windowLabel: "Mon, Sep 8, 9:00 AM – 5:00 PM", address: "418 Larch St, Austin, TX", confirmationNumber: "WDC1234567", pickupUrl: `${BASE}/pickups` }),
  },
  {
    name: "pickup_cancelled",
    title: "Pickup cancelled",
    audience: "Account",
    email: t.pickupUpdate({ accountName: "Cedar & Pine Goods", state: "cancelled", carrier: "USPS", windowLabel: "Mon, Sep 8, 9:00 AM – 5:00 PM", address: "418 Larch St, Austin, TX", confirmationNumber: null, pickupUrl: `${BASE}/pickups` }),
  },
];

mkdirSync(OUT, { recursive: true });
for (const s of samples) writeFileSync(`${OUT}/${s.name}.html`, s.email.html);

const cards = samples
  .map(
    (s) => `<a class="card" href="${s.name}.html">
      <span class="tag ${s.audience.toLowerCase()}">${s.audience}</span>
      <span class="name">${s.title}</span>
      <span class="subject">${s.email.subject.replace(/</g, "&lt;")}</span>
    </a>`,
  )
  .join("");

writeFileSync(
  `${OUT}/index.html`,
  `<!doctype html><meta charset="utf-8"><title>Ship with Snap — email templates</title>
<style>
  body{margin:0;background:#fff8ee;font:600 15px/1.5 Nunito,system-ui,sans-serif;color:#2b2320;padding:40px 24px}
  .wrap{max-width:900px;margin:0 auto}
  h1{font:800 44px/1 Sora,system-ui,sans-serif;letter-spacing:-1px;margin:0 0 8px}
  p.sub{color:#7a6f68;margin:0 0 32px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
  .card{display:block;background:#fff;border:2px solid #2b2320;border-radius:22px;padding:18px 20px;text-decoration:none;color:inherit;box-shadow:6px 6px 0 #2b2320}
  .card:hover{transform:translate(2px,2px);box-shadow:4px 4px 0 #2b2320}
  .tag{display:inline-block;font:800 11px/1 Nunito,sans-serif;padding:6px 10px;border-radius:999px;border:2px solid #2b2320}
  .tag.customer{background:#ffd23f}.tag.account{background:#0fa3a3;color:#fff;border-color:#0fa3a3}
  .name{display:block;font:800 19px/1.15 Sora,system-ui,sans-serif;margin:12px 0 6px}
  .subject{display:block;color:#7a6f68;font-size:13px}
</style>
<div class="wrap"><h1>Email templates</h1>
<p class="sub">${samples.length} templates. Customer mail goes out under the seller's name; account mail carries the snap wordmark.</p>
<div class="grid">${cards}</div></div>`,
);

// One self-contained page with every template inline, for sending to someone who just wants to look.
const frames = samples
  .map(
    (s) => `<section>
      <header><span class="tag ${s.audience.toLowerCase()}">${s.audience}</span><h2>${s.title}</h2>
      <p class="subject"><b>Subject:</b> ${s.email.subject.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p></header>
      <iframe loading="lazy" srcdoc="${s.email.html.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"></iframe>
    </section>`,
  )
  .join("");

writeFileSync(
  `${OUT}/all.html`,
  `<!doctype html><meta charset="utf-8"><title>Ship with Snap — every email</title>
<style>
  body{margin:0;background:#f4ece1;font:600 15px/1.5 Nunito,system-ui,sans-serif;color:#2b2320;padding:36px 20px 60px}
  .wrap{max-width:1180px;margin:0 auto}
  h1{font:800 46px/1 Sora,system-ui,sans-serif;letter-spacing:-1.4px;margin:0 0 6px}
  p.lede{color:#7a6f68;margin:0 0 30px;max-width:640px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:22px}
  section{background:#fff;border:2px solid #2b2320;border-radius:22px;overflow:hidden;box-shadow:6px 6px 0 #2b2320}
  header{padding:16px 18px 12px;border-bottom:2px solid #2b2320}
  h2{font:800 20px/1.1 Sora,system-ui,sans-serif;margin:10px 0 6px}
  .tag{display:inline-block;font:800 11px/1 Nunito,sans-serif;padding:6px 10px;border-radius:999px;border:2px solid #2b2320}
  .tag.customer{background:#ffd23f}.tag.account{background:#0fa3a3;color:#fff;border-color:#0fa3a3}
  .subject{margin:0;font-size:12px;color:#7a6f68}
  iframe{display:block;width:100%;height:660px;border:0;background:#fff8ee}
</style>
<div class="wrap">
  <h1>Every email, one page</h1>
  <p class="lede">${samples.length} templates. Yellow = sent to your customer under your store's name; teal = sent to you, carrying the snap wordmark. Each frame is the real rendered email.</p>
  <div class="grid">${frames}</div>
</div>`,
);

console.log(`wrote ${samples.length} previews to ${OUT}/ (open ${OUT}/all.html)`);
