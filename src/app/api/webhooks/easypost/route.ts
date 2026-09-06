import { createHmac, timingSafeEqual } from "node:crypto";
import { eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { normalizeTracker, type EpTracker } from "@/lib/shipping/easypost";
import { findLabelsByTracker, findTrackersByProvider, ingestTrackerDetails, ingestTrackingEvents } from "@/lib/tracking/service";
import { deliverWebhooks } from "@/lib/webhooks/outbound";

// Spec: design/TrackingFlow.dc.html — verify HMAC, dedupe on event id, 200 fast, then process.
// EasyPost signs the raw body with the webhook secret: X-Hmac-Signature: hmac-sha256-hex=<hex>.
// Events handled: tracker.*, refund.successful, scan_form.*, claim.*, batch.*; the rest are recorded and ignored.

function verify(raw: string, header: string | null): boolean {
  const secret = process.env.EASYPOST_WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production"; // allow unsigned locally
  if (!header) return false;
  const expected = createHmac("sha256", secret).update(raw, "utf8").digest("hex");
  const given = header.replace(/^hmac-sha256-hex=/, "");
  return given.length === expected.length && timingSafeEqual(Buffer.from(given, "hex"), Buffer.from(expected, "hex"));
}

type EasyPostEvent = {
  id: string;
  description: string;
  result?: Record<string, unknown> & { id?: string; object?: string };
};

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verify(raw, req.headers.get("x-hmac-signature"))) return new NextResponse("Bad signature", { status: 401 });

  let event: EasyPostEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }
  if (!event.id) return new NextResponse("Missing id", { status: 400 });

  // Idempotency: drop replays.
  const seen = await db().insert(schema.inboundEvents).values({ id: event.id, provider: "easypost", type: event.description }).onConflictDoNothing().returning({ id: schema.inboundEvents.id });
  if (!seen.length) return NextResponse.json({ ok: true, duplicate: true });

  const r = event.result;
  const kind = event.description.split(".")[0];
  try {
    if (kind === "tracker" && r?.id) {
      const details = normalizeTracker(r as unknown as EpTracker);
      const labels = await findLabelsByTracker(details.providerTrackerId, details.trackingCode);
      for (const label of labels) await ingestTrackingEvents(label, details.events, "webhook", details);
      if (!labels.length) {
        for (const t of await findTrackersByProvider(details.providerTrackerId, details.trackingCode)) await ingestTrackerDetails(t, details, "webhook");
      }
    } else if (kind === "refund" && r) {
      // refund.successful: { shipment_id, tracking_code, status }
      const shipmentId = String(r.shipment_id ?? "");
      const tracking = String(r.tracking_code ?? "");
      const status = String(r.status ?? "refunded") as "submitted" | "refunded" | "rejected";
      const shipments = shipmentId ? await db().query.shipments.findMany({ where: eq(schema.shipments.providerShipmentId, shipmentId) }) : [];
      const labels = await db().query.labels.findMany({
        where: or(...(shipments.map((s) => eq(schema.labels.shipmentId, s.id))), ...(tracking ? [eq(schema.labels.trackingNumber, tracking)] : [])),
      });
      for (const label of labels) {
        await db().update(schema.labels).set({ refundStatus: status, ...(status === "refunded" && !label.voidedAt ? { voidedAt: new Date() } : {}) }).where(eq(schema.labels.id, label.id));
        if (status === "refunded") {
          await db().update(schema.shipments).set({ status: "voided", updatedAt: new Date() }).where(eq(schema.shipments.id, label.shipmentId));
          await deliverWebhooks(label.accountId, "label.refunded", { label_id: label.id, tracking_number: label.trackingNumber, price_cents: label.priceCents });
        }
      }
    } else if (kind === "scan_form" && r?.id) {
      await db()
        .update(schema.scanForms)
        .set({ status: (r.status as "creating" | "created" | "failed") ?? "created", formUrl: (r.form_url as string) ?? null, message: (r.message as string) ?? null, trackingNumbers: (r.tracking_codes as string[]) ?? [] })
        .where(eq(schema.scanForms.providerScanFormId, r.id));
    } else if ((kind === "claim" || kind === "claims") && r?.id) {
      const hist = (r.history as Array<{ status: string; status_detail?: string; timestamp?: string; status_timestamp?: string }> | undefined) ?? [];
      const [claim] = await db()
        .update(schema.claims)
        .set({
          status: String(r.status ?? "in_review"),
          statusDetail: (r.status_detail as string) ?? null,
          approvedCents: r.approved_amount ? Math.round(Number(r.approved_amount) * 100) : null,
          history: hist.map((h) => ({ status: h.status, statusDetail: h.status_detail ?? null, at: h.timestamp ?? h.status_timestamp ?? "" })),
          updatedAt: new Date(),
        })
        .where(eq(schema.claims.providerClaimId, r.id))
        .returning();
      if (claim) await deliverWebhooks(claim.accountId, "claim.updated", { claim_id: claim.id, tracking_number: claim.trackingNumber, status: claim.status, approved_cents: claim.approvedCents });
    }
    // batch.*, insurance.*, payment.*, report.*: recorded in inbound_events for audit; nothing to do.
  } catch (err) {
    console.error(`easypost webhook ${event.description} failed:`, err);
    return new NextResponse("Processing failed", { status: 500 }); // EasyPost retries
  }

  await db().update(schema.inboundEvents).set({ processedAt: new Date() }).where(eq(schema.inboundEvents.id, event.id));
  return NextResponse.json({ ok: true });
}
