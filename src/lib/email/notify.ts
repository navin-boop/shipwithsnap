/**
 * Where the product's events meet the templates.
 *
 * Account-scoped plain functions, per the service.ts convention — no session, no "use server".
 * Every one of them is self-contained and swallows its own errors: a Resend outage or a missing
 * row must never fail a label purchase, a refund or a sign-up that has already succeeded. The
 * caller therefore never needs to wrap these in try/catch.
 */
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { appUrl } from "./layout";
import { deliver } from "./index";
import {
  adjustmentCharged,
  batchReceipt,
  labelReceipt,
  paymentFailed,
  pickupUpdate,
  refundIssued,
  teamInvite,
  welcome,
} from "./templates";

/** Who gets account mail: the billing address when set, otherwise the owner who signed up. */
async function billingRecipient(accountId: string): Promise<{ email: string; accountName: string; wantsReceipts: boolean } | null> {
  const account = await db().query.accounts.findFirst({ where: eq(schema.accounts.id, accountId) });
  if (!account) return null;
  if (account.receiptEmail) return { email: account.receiptEmail, accountName: account.name, wantsReceipts: account.receiptEmails };
  const owner = await db().query.users.findFirst({ where: and(eq(schema.users.accountId, accountId), eq(schema.users.role, "owner")) });
  if (!owner?.email) return null;
  return { email: owner.email, accountName: account.name, wantsReceipts: account.receiptEmails };
}

/** "visa ·· 4242" reads better with a capital in prose. */
function prettyCard(label: string | null | undefined): string | null {
  if (!label) return null;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function guard(name: string, fn: () => Promise<unknown>): Promise<void> {
  return fn().then(
    () => undefined,
    (err) => {
      console.error(`notify.${name} failed:`, err);
    },
  );
}

export function notifyWelcome(input: { email: string; name: string | null }): Promise<void> {
  return guard("welcome", () => deliver(input.email, welcome({ name: input.name, email: input.email })));
}

export function notifyTeamInvite(input: { email: string; accountName: string; inviterName: string | null; role: string; inviteUrl: string }): Promise<void> {
  return guard("teamInvite", () =>
    deliver(input.email, teamInvite({ accountName: input.accountName, inviterName: input.inviterName, role: input.role, inviteUrl: input.inviteUrl, expiresInDays: 7 })),
  );
}

/**
 * A capture succeeded. One label gets a label receipt; a batch gets a single batch receipt, which
 * is the whole point of authorizing a batch once.
 */
export function notifyChargeCaptured(chargeId: string): Promise<void> {
  return guard("chargeCaptured", async () => {
    const charge = await db().query.charges.findFirst({ where: eq(schema.charges.id, chargeId) });
    if (!charge || charge.status !== "captured" || charge.amountCapturedCents <= 0) return;
    const to = await billingRecipient(charge.accountId);
    if (!to?.wantsReceipts) return;
    const base = appUrl();
    const labels = await db().query.labels.findMany({ where: eq(schema.labels.chargeId, charge.id) });

    if (charge.kind === "adjustment") {
      const l = labels[0];
      return deliver(
        to.email,
        adjustmentCharged({
          accountName: to.accountName,
          amountCents: charge.amountCapturedCents,
          carrier: l?.carrier ?? "The carrier",
          trackingNumber: l?.trackingNumber ?? "—",
          reason: charge.description ?? "Weight or dimensions differed from what was declared.",
          billingUrl: `${base}/billing`,
        }),
      );
    }

    if (charge.kind === "batch" || labels.length > 1) {
      return deliver(
        to.email,
        batchReceipt({
          accountName: to.accountName,
          amountCents: charge.amountCapturedCents,
          labelCount: labels.length,
          // Anything authorized but not captured is a row that failed to buy.
          failedCount: 0,
          cardLabel: prettyCard(charge.cardLabel),
          batchUrl: charge.batchId ? `${base}/batch/${charge.batchId}` : `${base}/shipments`,
        }),
      );
    }

    const label = labels[0];
    if (!label) return;
    const shipment = await db().query.shipments.findFirst({ where: eq(schema.shipments.id, label.shipmentId) });
    const shipTo = shipment ? await db().query.addresses.findFirst({ where: eq(schema.addresses.id, shipment.shipToId) }) : null;
    return deliver(
      to.email,
      labelReceipt({
        accountName: to.accountName,
        amountCents: charge.amountCapturedCents,
        cardLabel: prettyCard(charge.cardLabel),
        label: {
          carrier: label.carrier,
          serviceName: label.serviceName,
          trackingNumber: label.trackingNumber,
          to: [shipTo?.name, shipTo?.city, shipTo?.state].filter(Boolean).join(", ") || "—",
          amountCents: label.priceCents,
        },
        receiptUrl: charge.receiptUrl ?? `${base}/billing`,
      }),
    );
  });
}

export function notifyRefunded(input: { accountId: string; labelId: string; amountCents: number; cardLabel: string | null }): Promise<void> {
  return guard("refunded", async () => {
    const to = await billingRecipient(input.accountId);
    if (!to?.wantsReceipts) return;
    const label = await db().query.labels.findFirst({ where: eq(schema.labels.id, input.labelId) });
    return deliver(
      to.email,
      refundIssued({
        accountName: to.accountName,
        amountCents: input.amountCents,
        carrier: label?.carrier ?? "The carrier",
        trackingNumber: label?.trackingNumber ?? "—",
        cardLabel: prettyCard(input.cardLabel),
        billingUrl: `${appUrl()}/billing`,
      }),
    );
  });
}

/** A decline. Always sent, even when receipts are switched off — buying is now paused. */
export function notifyPaymentFailed(input: { accountId: string; amountCents: number; reason: string; cardLabel: string | null }): Promise<void> {
  return guard("paymentFailed", async () => {
    const to = await billingRecipient(input.accountId);
    if (!to) return;
    return deliver(
      to.email,
      paymentFailed({
        accountName: to.accountName,
        amountCents: input.amountCents,
        reason: input.reason,
        cardLabel: prettyCard(input.cardLabel),
        billingUrl: `${appUrl()}/billing`,
      }),
    );
  });
}

export function notifyPickup(input: { accountId: string; pickupId: string; state: "confirmed" | "cancelled" }): Promise<void> {
  return guard("pickup", async () => {
    const to = await billingRecipient(input.accountId);
    if (!to) return;
    const pickup = await db().query.pickups.findFirst({ where: eq(schema.pickups.id, input.pickupId) });
    if (!pickup) return;
    const address = await db().query.addresses.findFirst({ where: eq(schema.addresses.id, pickup.addressId) });
    const fmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    return deliver(
      to.email,
      pickupUpdate({
        accountName: to.accountName,
        state: input.state,
        carrier: pickup.carrier ?? "The carrier",
        windowLabel: `${fmt.format(pickup.minDatetime)} – ${new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(pickup.maxDatetime)}`,
        address: [address?.street1, address?.city, address?.state].filter(Boolean).join(", ") || "—",
        confirmationNumber: pickup.confirmation,
        pickupUrl: `${appUrl()}/pickups`,
      }),
    );
  });
}
