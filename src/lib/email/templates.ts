/**
 * Every email the product sends, in one file.
 *
 * A template is a pure function: data in, `{ subject, html, text }` out. Nothing here touches the
 * database or the network, so each one can be rendered in a script, diffed in review and previewed
 * in a browser without a running app (see scripts/preview-emails.tsx).
 *
 * Two audiences, and the difference matters:
 *   - customer mail (tracking) is sent on a seller's behalf and carries the seller's name and logo,
 *     with ours only in the footer;
 *   - account mail (receipts, invites, billing) is from us and carries the snap wordmark.
 */
import { company } from "@/lib/company";
import {
  appUrl,
  esc,
  link,
  money,
  p,
  raw,
  renderEmail,
  snapBrand,
  strong,
  type Brand,
  type Row,
} from "./layout";

export type RenderedEmail = { subject: string; html: string; text: string };

/** Plain-text twin. Every template supplies one: it is what spam filters and screen readers read. */
function textBody(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

function rowsText(rows: Row[]): string {
  return rows.map((r) => `${r.label}: ${r.value.replace(/<[^>]+>/g, "")}`).join("\n");
}

const SIGNOFF = `— ${company.brand}`;

/* ------------------------------------------------------------------ customer: tracking updates */

export type TrackingKind = "shipped" | "out_for_delivery" | "delivered" | "exception";

export type TrackingInput = {
  kind: TrackingKind;
  /** The seller's store name — this mail goes out under their name, not ours. */
  storeName: string;
  storeLogoUrl?: string | null;
  recipientName: string;
  carrier: string;
  serviceName: string;
  trackingNumber: string;
  trackingUrl: string;
  /** Free-text carrier message, shown only on exceptions. */
  carrierMessage?: string | null;
  etaLabel?: string | null;
};

export function trackingUpdate(input: TrackingInput): RenderedEmail {
  const first = input.recipientName.trim().split(/\s+/)[0] || "there";
  const brand: Brand = { name: input.storeName, logoUrl: input.storeLogoUrl ?? null };

  const copy: Record<TrackingKind, { subject: string; heading: string; body: string; callout?: { tone: "teal" | "coral" | "danger" | "yellow"; title: string; body?: string } }> = {
    shipped: {
      subject: `Your ${input.storeName} order is on its way`,
      heading: "It's on the way.",
      body: `Hi ${first} — ${input.storeName} has handed your order to ${input.carrier}. You can follow it the whole way with the button below.`,
    },
    out_for_delivery: {
      subject: `Arriving today — your ${input.storeName} order`,
      heading: "Arriving today.",
      body: `Hi ${first} — your package is on the truck and out for delivery.`,
      callout: { tone: "teal", title: "Out for delivery", body: "Someone may need to be there to receive it." },
    },
    delivered: {
      subject: `Delivered — your ${input.storeName} order`,
      heading: "Delivered.",
      body: `Hi ${first} — ${input.carrier} marked your package as delivered. If it isn't where you expected, check with anyone else at the address before getting in touch.`,
      callout: { tone: "teal", title: "Delivered" },
    },
    exception: {
      subject: `A problem delivering your ${input.storeName} order`,
      heading: "There's a hold-up.",
      body: `Hi ${first} — ${input.carrier} reported a problem on the way to you. Nothing is lost; these usually clear on their own within a day or two.`,
      callout: { tone: "danger", title: "Delivery exception", body: input.carrierMessage ?? "The carrier has not given a reason yet. The tracking page has the latest." },
    },
  };

  const c = copy[input.kind];
  const rows: Row[] = [
    { label: "Carrier", value: esc(`${input.carrier} ${input.serviceName}`) },
    { label: "Tracking number", value: esc(input.trackingNumber), strong: true },
  ];
  if (input.etaLabel && input.kind !== "delivered") rows.push({ label: "Expected", value: esc(input.etaLabel) });

  return {
    subject: c.subject,
    html: renderEmail({
      preheader: c.body.slice(0, 120),
      brand,
      eyebrow: input.storeName,
      heading: c.heading,
      bodyHtml: p(c.body),
      rows,
      callout: c.callout ?? null,
      cta: { label: "Track package", url: input.trackingUrl },
      onBehalfOf: input.storeName,
      note: "You're getting this because you placed an order with this store.",
    }),
    text: textBody([c.body, rowsText(rows), `Track your package: ${input.trackingUrl}`, `Sent by ${company.brand} on behalf of ${input.storeName}.`]),
  };
}

/* -------------------------------------------------------------------------- account: onboarding */

export function welcome(input: { name?: string | null; email: string }): RenderedEmail {
  const base = appUrl();
  const first = (input.name ?? "").trim().split(/\s+/)[0];
  const body = textBody([
    `${first ? `Hi ${first} — welcome` : "Welcome"} to ${company.brand}. Your account is ready.`,
    "There's no monthly fee and no balance to top up. Add a card the first time you buy a label, and you only ever pay postage.",
    "The fastest way to see what it does: paste an address on the Ship page and compare live USPS and UPS rates.",
  ]);
  return {
    subject: `Welcome to ${company.brand}`,
    html: renderEmail({
      preheader: "Your account is ready — no monthly fee, no balance to top up.",
      brand: snapBrand(),
      heading: "You're in.",
      bodyHtml:
        p(`${first ? `Hi ${first} — welcome` : "Welcome"} to ${company.brand}. Your account is ready.`) +
        p("There's no monthly fee and no balance to top up. Add a card the first time you buy a label, and you only ever pay postage — we never mark it up.") +
        raw(`The fastest way to see what it does: paste an address on the Ship page and compare live rates. Questions go to ${link(company.email.support, `mailto:${company.email.support}`)}.`),
      cta: { label: "Ship something", url: `${base}/ship` },
      secondaryCta: { label: "How it works", url: `${base}/how-it-works`, variant: "outline" },
      note: `Sent to ${input.email} because an account was created with this address.`,
    }),
    text: textBody([body, `Ship: ${base}/ship`, SIGNOFF]),
  };
}

export function teamInvite(input: { accountName: string; inviterName?: string | null; role: string; inviteUrl: string; expiresInDays: number }): RenderedEmail {
  const who = input.inviterName?.trim() || "Someone";
  const roleCopy: Record<string, string> = {
    owner: "Owners can do everything, including billing and team.",
    shipper: "Shippers can buy labels, run batches and manage shipments.",
    viewer: "Viewers can see shipments and reports, but can't spend money.",
  };
  return {
    subject: `${who} invited you to ${input.accountName} on ${company.brand}`,
    html: renderEmail({
      preheader: `Join ${input.accountName} as a ${input.role}. The link expires in ${input.expiresInDays} days.`,
      brand: snapBrand(),
      eyebrow: input.accountName,
      heading: "You've been invited.",
      bodyHtml:
        p(`${who} invited you to join ${input.accountName} on ${company.brand} as a ${input.role}.`) +
        p(roleCopy[input.role] ?? "") +
        p("Accepting takes a moment — you'll set a password if you don't already have an account."),
      rows: [
        { label: "Account", value: esc(input.accountName) },
        { label: "Your role", value: esc(input.role), strong: true },
      ],
      cta: { label: "Accept invitation", url: input.inviteUrl },
      note: `This invitation expires in ${input.expiresInDays} days. If you weren't expecting it, you can ignore this email.`,
    }),
    text: textBody([
      `${who} invited you to join ${input.accountName} on ${company.brand} as a ${input.role}.`,
      roleCopy[input.role] ?? "",
      `Accept: ${input.inviteUrl}`,
      `The invitation expires in ${input.expiresInDays} days.`,
      SIGNOFF,
    ]),
  };
}

export function passwordReset(input: { email: string; resetUrl: string; expiresInMinutes: number }): RenderedEmail {
  return {
    subject: `Reset your ${company.brand} password`,
    html: renderEmail({
      preheader: `The link works for ${input.expiresInMinutes} minutes.`,
      brand: snapBrand(),
      heading: "Reset your password.",
      bodyHtml:
        p(`Someone asked to reset the password for ${input.email}. If that was you, use the button below.`) +
        p(`The link works for ${input.expiresInMinutes} minutes and can only be used once.`),
      cta: { label: "Choose a new password", url: input.resetUrl },
      callout: { tone: "yellow", title: "Didn't ask for this?", body: "Ignore this email and your password stays as it is. Nobody can reset it without the link." },
      note: `Sent to ${input.email}.`,
    }),
    text: textBody([
      `Someone asked to reset the password for ${input.email}.`,
      `Reset it here (valid for ${input.expiresInMinutes} minutes): ${input.resetUrl}`,
      "If you didn't ask for this, ignore this email — your password stays as it is.",
      SIGNOFF,
    ]),
  };
}

/* ---------------------------------------------------------------------------- account: billing */

export type LabelLine = { carrier: string; serviceName: string; trackingNumber: string; to: string; amountCents: number };

export function labelReceipt(input: { accountName: string; amountCents: number; cardLabel?: string | null; label: LabelLine; receiptUrl: string }): RenderedEmail {
  const base = appUrl();
  const card = input.cardLabel ? `your ${input.cardLabel}` : "your card on file";
  const rows: Row[] = [
    { label: "Service", value: esc(`${input.label.carrier} ${input.label.serviceName}`) },
    { label: "To", value: esc(input.label.to) },
    { label: "Tracking number", value: esc(input.label.trackingNumber) },
    { label: "Charged", value: esc(money(input.amountCents)), strong: true },
  ];
  return {
    subject: `Receipt — ${money(input.amountCents)} for ${input.label.carrier} ${input.label.serviceName}`,
    html: renderEmail({
      preheader: `${money(input.amountCents)} charged to ${card}. Postage only — no markup.`,
      brand: snapBrand(),
      eyebrow: input.accountName,
      heading: "Label bought.",
      bodyHtml:
        p(`We charged ${money(input.amountCents)} to ${card} for the label below.`) +
        raw(`That's postage at cost. ${strong("We never mark it up")} — the whole amount goes to the carrier.`),
      rows,
      cta: { label: "View receipt", url: input.receiptUrl },
      secondaryCta: { label: "Print label", url: `${base}/shipments`, variant: "outline" },
      note: `Receipts go to the address set in Settings → Billing. ${company.legalName} appears on your statement.`,
    }),
    text: textBody([`We charged ${money(input.amountCents)} to ${card}.`, rowsText(rows), `Receipt: ${input.receiptUrl}`, SIGNOFF]),
  };
}

export function batchReceipt(input: { accountName: string; amountCents: number; labelCount: number; failedCount: number; cardLabel?: string | null; batchUrl: string }): RenderedEmail {
  const card = input.cardLabel ? `your ${input.cardLabel}` : "your card on file";
  const rows: Row[] = [
    { label: "Labels bought", value: esc(String(input.labelCount)) },
    { label: "Average per label", value: esc(money(Math.round(input.amountCents / Math.max(1, input.labelCount)))) },
    { label: "Charged", value: esc(money(input.amountCents)), strong: true },
  ];
  return {
    subject: `Batch done — ${input.labelCount} labels, ${money(input.amountCents)}`,
    html: renderEmail({
      preheader: `${input.labelCount} labels bought and charged as one payment of ${money(input.amountCents)}.`,
      brand: snapBrand(),
      eyebrow: input.accountName,
      heading: "Batch is done.",
      bodyHtml:
        p(`${input.labelCount} ${input.labelCount === 1 ? "label" : "labels"} bought and charged as a single payment of ${money(input.amountCents)} to ${card}.`) +
        p("The merged PDF is ready to print — every label in one file, in the same order as your list."),
      rows,
      callout: input.failedCount
        ? { tone: "coral", title: `${input.failedCount} ${input.failedCount === 1 ? "row" : "rows"} didn't buy`, body: "Those rows were not charged. Open the batch to see why and retry them." }
        : null,
      cta: { label: "Print all labels", url: input.batchUrl },
      note: "One authorization per batch: only the rows that bought successfully were captured.",
    }),
    text: textBody([
      `${input.labelCount} labels bought, charged ${money(input.amountCents)} to ${card}.`,
      input.failedCount ? `${input.failedCount} rows did not buy and were not charged.` : "",
      rowsText(rows),
      `Print: ${input.batchUrl}`,
      SIGNOFF,
    ]),
  };
}

export function refundIssued(input: { accountName: string; amountCents: number; trackingNumber: string; carrier: string; cardLabel?: string | null; billingUrl: string }): RenderedEmail {
  const rows: Row[] = [
    { label: "Voided label", value: esc(`${input.carrier} · ${input.trackingNumber}`) },
    { label: "Refunded", value: esc(money(input.amountCents)), strong: true },
  ];
  return {
    subject: `Refunded ${money(input.amountCents)} for a voided label`,
    html: renderEmail({
      preheader: `${input.carrier} accepted the void. ${money(input.amountCents)} is on its way back to your card.`,
      brand: snapBrand(),
      eyebrow: input.accountName,
      heading: "Refund on its way.",
      bodyHtml:
        p(`${input.carrier} accepted the void, so we've refunded ${money(input.amountCents)} to ${input.cardLabel ? `your ${input.cardLabel}` : "your card"}.`) +
        p("Card refunds usually appear within five to ten business days, depending on your bank."),
      rows,
      callout: { tone: "teal", title: "Refund issued" },
      cta: { label: "See billing", url: input.billingUrl },
      note: "We only refund once the carrier confirms the label was voided — that's why it isn't instant.",
    }),
    text: textBody([`${input.carrier} accepted the void. Refunded ${money(input.amountCents)}.`, rowsText(rows), `Billing: ${input.billingUrl}`, SIGNOFF]),
  };
}

export function paymentFailed(input: { accountName: string; amountCents: number; reason: string; cardLabel?: string | null; billingUrl: string }): RenderedEmail {
  return {
    subject: `Your card was declined — buying is paused`,
    html: renderEmail({
      preheader: "Add or update a card to start buying labels again. Nothing was charged.",
      brand: snapBrand(),
      eyebrow: input.accountName,
      heading: "Your card was declined.",
      bodyHtml:
        p(`We couldn't charge ${money(input.amountCents)} to ${input.cardLabel ? `your ${input.cardLabel}` : "your card on file"}, so buying is paused on your account.`) +
        p("Nothing was charged and no label was bought. Adding a working card clears the pause straight away."),
      callout: { tone: "danger", title: "Reason given by the bank", body: input.reason },
      cta: { label: "Update card", url: input.billingUrl },
      note: `If the card looks fine, your bank may need to approve ${company.legalName} — they usually do on a second attempt.`,
    }),
    text: textBody([
      `We couldn't charge ${money(input.amountCents)}. Buying is paused until a working card is added.`,
      `Reason: ${input.reason}`,
      `Update your card: ${input.billingUrl}`,
      SIGNOFF,
    ]),
  };
}

export function adjustmentCharged(input: { accountName: string; amountCents: number; trackingNumber: string; carrier: string; reason: string; billingUrl: string }): RenderedEmail {
  const rows: Row[] = [
    { label: "Shipment", value: esc(`${input.carrier} · ${input.trackingNumber}`) },
    { label: "Reason", value: esc(input.reason) },
    { label: "Charged", value: esc(money(input.amountCents)), strong: true },
  ];
  return {
    subject: `Carrier adjustment — ${money(input.amountCents)}`,
    html: renderEmail({
      preheader: `${input.carrier} re-rated a shipment after pickup and billed the difference.`,
      brand: snapBrand(),
      eyebrow: input.accountName,
      heading: "The carrier re-rated a shipment.",
      bodyHtml:
        p(`${input.carrier} weighed or measured this package after pickup and found it differed from what was declared, so they charged the difference.`) +
        p("We pass adjustments through at cost as a separate charge. If you think this one is wrong, reply and we'll dispute it with the carrier for you."),
      rows,
      cta: { label: "See billing", url: input.billingUrl },
      note: "Adjustments come from the carrier's own scales, sometimes weeks after a shipment.",
    }),
    text: textBody([`${input.carrier} re-rated a shipment and charged ${money(input.amountCents)}.`, rowsText(rows), `Billing: ${input.billingUrl}`, SIGNOFF]),
  };
}

/* ------------------------------------------------------------------ account: operational alerts */

export function claimUpdate(input: { accountName: string; status: string; type: string; amountCents: number; trackingNumber: string; claimUrl: string; carrierNote?: string | null }): RenderedEmail {
  const approved = /approve|paid/i.test(input.status);
  const rejected = /reject|denied/i.test(input.status);
  return {
    subject: `Claim ${input.status} — ${input.trackingNumber}`,
    html: renderEmail({
      preheader: `Your ${input.type} claim for ${money(input.amountCents)} is now ${input.status}.`,
      brand: snapBrand(),
      eyebrow: input.accountName,
      heading: approved ? "Your claim was approved." : rejected ? "Your claim was rejected." : "Your claim moved.",
      bodyHtml: p(`The ${input.type} claim you filed for ${input.trackingNumber} is now ${input.status}.`),
      rows: [
        { label: "Claim type", value: esc(input.type) },
        { label: "Tracking number", value: esc(input.trackingNumber) },
        { label: "Amount claimed", value: esc(money(input.amountCents)), strong: true },
      ],
      callout: input.carrierNote ? { tone: approved ? "teal" : rejected ? "danger" : "yellow", title: "From the carrier", body: input.carrierNote } : null,
      cta: { label: "View claim", url: input.claimUrl },
    }),
    text: textBody([`Your ${input.type} claim for ${input.trackingNumber} is now ${input.status}.`, input.carrierNote ?? "", `View: ${input.claimUrl}`, SIGNOFF]),
  };
}

export function pickupUpdate(input: { accountName: string; state: "confirmed" | "cancelled"; carrier: string; windowLabel: string; address: string; confirmationNumber?: string | null; pickupUrl: string }): RenderedEmail {
  const confirmed = input.state === "confirmed";
  const rows: Row[] = [
    { label: "Carrier", value: esc(input.carrier) },
    { label: "Window", value: esc(input.windowLabel), strong: true },
    { label: "Address", value: esc(input.address) },
  ];
  if (input.confirmationNumber) rows.push({ label: "Confirmation", value: esc(input.confirmationNumber) });
  return {
    subject: confirmed ? `Pickup booked — ${input.carrier}, ${input.windowLabel}` : `Pickup cancelled — ${input.carrier}`,
    html: renderEmail({
      preheader: confirmed ? `${input.carrier} will collect during ${input.windowLabel}.` : `Your ${input.carrier} pickup has been cancelled.`,
      brand: snapBrand(),
      eyebrow: input.accountName,
      heading: confirmed ? "Pickup is booked." : "Pickup cancelled.",
      bodyHtml: confirmed
        ? p(`${input.carrier} will collect during ${input.windowLabel}. Have the packages labelled and ready before the window opens.`)
        : p(`Your ${input.carrier} pickup has been cancelled. Nothing will be collected — you can book another any time.`),
      rows,
      callout: confirmed ? { tone: "teal", title: "Booked" } : { tone: "coral", title: "Cancelled" },
      cta: { label: confirmed ? "See pickup" : "Book another", url: input.pickupUrl },
    }),
    text: textBody([
      confirmed ? `${input.carrier} will collect during ${input.windowLabel}.` : `Your ${input.carrier} pickup has been cancelled.`,
      rowsText(rows),
      `Pickups: ${input.pickupUrl}`,
      SIGNOFF,
    ]),
  };
}

/** Every template, keyed for the preview script and any future admin tooling. */
export const TEMPLATE_NAMES = [
  "tracking_shipped",
  "tracking_out_for_delivery",
  "tracking_delivered",
  "tracking_exception",
  "welcome",
  "team_invite",
  "password_reset",
  "label_receipt",
  "batch_receipt",
  "refund_issued",
  "payment_failed",
  "adjustment_charged",
  "claim_update",
  "pickup_confirmed",
  "pickup_cancelled",
] as const;

export type TemplateName = (typeof TEMPLATE_NAMES)[number];
