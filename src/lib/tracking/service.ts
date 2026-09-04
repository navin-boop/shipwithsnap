import { and, asc, desc, eq, isNull, lt, notInArray, or, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { Account, Label } from "@/lib/db/schema";
import { emailShell, sendEmail } from "@/lib/email";
import { getShippingProvider, type CanonicalStatus, type TrackingEvent } from "@/lib/shipping";
import { deliverWebhooks } from "@/lib/webhooks/outbound";

// Spec: design/TrackingFlow.dc.html — normalize → upsert (idempotent) → advance state machine → notify.

const TERMINAL = ["delivered", "returned", "voided"];

/** Status is derived from the latest known event by occurred_at; delivered/voided are terminal. */
export function deriveStatus(events: Array<{ status: string; occurredAt: Date }>, current: string): CanonicalStatus | null {
  if (current === "delivered" || current === "voided") return null;
  const latest = events.reduce<{ status: string; occurredAt: Date } | null>((b, e) => (!b || e.occurredAt > b.occurredAt ? e : b), null);
  return latest ? (latest.status as CanonicalStatus) : null;
}

export type IngestResult = { inserted: number; from: string; to: string | null };

/** Records provider events for a label and advances its shipment. Safe to call repeatedly. */
export async function ingestTrackingEvents(label: Label, events: TrackingEvent[], source: "webhook" | "poll", estDeliveryDate?: string | null): Promise<IngestResult> {
  const shipment = await db().query.shipments.findFirst({ where: eq(schema.shipments.id, label.shipmentId) });
  if (!shipment) return { inserted: 0, from: "unknown", to: null };

  let inserted = 0;
  if (events.length) {
    const rows = await db()
      .insert(schema.trackingEvents)
      .values(
        events.map((e) => ({
          labelId: label.id,
          dedupeKey: e.dedupeKey,
          status: e.status,
          rawStatus: e.rawStatus,
          description: e.description,
          city: e.location?.city ?? null,
          state: e.location?.state ?? null,
          zip: e.location?.zip ?? null,
          occurredAt: new Date(e.occurredAt),
          source,
        })),
      )
      .onConflictDoNothing({ target: [schema.trackingEvents.labelId, schema.trackingEvents.dedupeKey] })
      .returning({ id: schema.trackingEvents.id });
    inserted = rows.length;
  }

  await db()
    .update(schema.labels)
    .set({ lastTrackedAt: new Date(), ...(estDeliveryDate ? { estDeliveryDate } : {}) })
    .where(eq(schema.labels.id, label.id));

  const all = await db().query.trackingEvents.findMany({ where: eq(schema.trackingEvents.labelId, label.id) });
  const next = deriveStatus(all, shipment.status);
  if (!next || next === shipment.status) return { inserted, from: shipment.status, to: null };

  await db().update(schema.shipments).set({ status: next, updatedAt: new Date() }).where(eq(schema.shipments.id, shipment.id));
  await notifyStatusChange(label, shipment.status, next);
  return { inserted, from: shipment.status, to: next };
}

/** Customer emails (per account prefs) and outbound webhooks on a state change. */
async function notifyStatusChange(label: Label, previous: string, next: CanonicalStatus) {
  const [account, shipment] = await Promise.all([
    db().query.accounts.findFirst({ where: eq(schema.accounts.id, label.accountId) }),
    db().query.shipments.findFirst({ where: eq(schema.shipments.id, label.shipmentId) }),
  ]);
  if (!account || !shipment) return;
  const recipient = await db().query.addresses.findFirst({ where: eq(schema.addresses.id, shipment.shipToId) });

  const data = { label_id: label.id, shipment_id: shipment.id, tracking_number: label.trackingNumber, carrier: label.carrier, status: next, previous_status: previous };
  await deliverWebhooks(label.accountId, "tracking.updated", data);
  if (next === "delivered") await deliverWebhooks(label.accountId, "tracking.delivered", data);
  if (next === "exception") await deliverWebhooks(label.accountId, "tracking.exception", data);

  const prefs = account.customerEmails;
  const kind = emailKind(next, previous);
  const wants = kind === "shipped" ? prefs.shipped : kind === "out_for_delivery" ? prefs.outForDelivery : kind === "delivered" ? prefs.delivered : kind === "exception" ? prefs.exception : false;
  if (!wants || !kind || !recipient?.email) return;
  await sendTrackingEmail({ label, account, recipientEmail: recipient.email, recipientName: recipient.name ?? "", kind });
}

export type TrackingEmailKind = "shipped" | "out_for_delivery" | "delivered" | "exception";

/** Which customer email (if any) a transition deserves. "Shipped" fires on the first carrier scan only. */
export function emailKind(next: CanonicalStatus, previous: string): TrackingEmailKind | null {
  if (next === "out_for_delivery") return "out_for_delivery";
  if (next === "delivered") return "delivered";
  if (next === "exception") return "exception";
  if ((next === "in_transit" || next === "accepted") && previous === "label_created") return "shipped";
  return null;
}

export async function sendTrackingEmail(input: { label: Label; account: Pick<Account, "name" | "replyTo">; recipientEmail: string; recipientName: string; kind: TrackingEmailKind }) {
  const { label, account, kind } = input;
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://shipwithsnap.com"}/t/${label.trackingToken}`;
  const first = input.recipientName.split(" ")[0] || "there";
  const copy: Record<TrackingEmailKind, { subject: string; heading: string; body: string }> = {
    shipped: { subject: `Your order from ${account.name} is on its way`, heading: "It's on the way.", body: `Hi ${first} — ${account.name} shipped your order with ${label.carrier} ${label.serviceName}. Tracking number ${label.trackingNumber}.` },
    out_for_delivery: { subject: `Out for delivery today — ${account.name}`, heading: "Arriving today.", body: `Hi ${first} — your package from ${account.name} is out for delivery.` },
    delivered: { subject: `Delivered — your order from ${account.name}`, heading: "Delivered.", body: `Hi ${first} — your package from ${account.name} was delivered.` },
    exception: { subject: `A delivery problem with your order from ${account.name}`, heading: "There's a hold-up.", body: `Hi ${first} — the carrier reported a problem delivering your package from ${account.name}. The tracking page has the latest.` },
  };
  const c = copy[kind];
  await sendEmail({
    to: input.recipientEmail,
    subject: c.subject,
    replyTo: account.replyTo,
    html: emailShell({ eyebrow: account.name, heading: c.heading, bodyHtml: `<p>${c.body}</p>`, ctaLabel: "Track package", ctaUrl: url }),
    text: `${c.body}\n\nTrack: ${url}`,
  });
}

/** Pull path: labels still moving that haven't been updated in a day. */
export async function pollStaleTrackers(limit = 50): Promise<{ polled: number; updated: number }> {
  const cutoff = new Date(Date.now() - 24 * 3600 * 1000);
  const rows = await db()
    .select({ label: schema.labels })
    .from(schema.labels)
    .innerJoin(schema.shipments, eq(schema.shipments.id, schema.labels.shipmentId))
    .where(
      and(
        isNull(schema.labels.voidedAt),
        notInArray(schema.shipments.status, TERMINAL as ["delivered", "returned", "voided"]),
        or(isNull(schema.labels.lastTrackedAt), lt(schema.labels.lastTrackedAt, cutoff)),
        sql`${schema.labels.providerTrackerId} is not null`,
      ),
    )
    .orderBy(asc(schema.labels.lastTrackedAt))
    .limit(limit);

  let updated = 0;
  const provider = getShippingProvider();
  for (const { label } of rows) {
    try {
      const events = await provider.track(label.providerTrackerId!);
      const r = await ingestTrackingEvents(label, events, "poll");
      if (r.to) updated++;
    } catch (err) {
      console.error(`tracking poll failed for label ${label.id}:`, err);
    }
  }
  return { polled: rows.length, updated };
}

/** Everything the public tracking page needs, by token. */
export async function getPublicTracking(token: string) {
  const label = await db().query.labels.findFirst({ where: eq(schema.labels.trackingToken, token) });
  if (!label) return null;
  const [shipment, account, events] = await Promise.all([
    db().query.shipments.findFirst({ where: eq(schema.shipments.id, label.shipmentId) }),
    db().query.accounts.findFirst({ where: eq(schema.accounts.id, label.accountId) }),
    db().query.trackingEvents.findMany({ where: eq(schema.trackingEvents.labelId, label.id), orderBy: desc(schema.trackingEvents.occurredAt) }),
  ]);
  if (!shipment || !account) return null;
  const to = await db().query.addresses.findFirst({ where: eq(schema.addresses.id, shipment.shipToId) });
  const order = shipment.orderId ? await db().query.orders.findFirst({ where: eq(schema.orders.id, shipment.orderId) }) : null;
  return { label, shipment, account, events, to, order };
}

export async function findLabelsByTracker(providerTrackerId: string, trackingNumber: string) {
  return db().query.labels.findMany({
    where: or(eq(schema.labels.providerTrackerId, providerTrackerId), eq(schema.labels.trackingNumber, trackingNumber)),
  });
}
