"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { refundForLabel } from "@/lib/billing/service";
import { getShippingProvider, ProviderError } from "@/lib/shipping";
import { sendTrackingEmail } from "@/lib/tracking/service";
import { deliverWebhooks } from "@/lib/webhooks/outbound";

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Not signed in");
  return session.user;
}

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

/** Void a label: ask the provider for a refund; the card refund follows once it's approved (phase 4). */
export async function voidLabel(labelId: string): Promise<ActionResult> {
  const user = await requireSession();
  const label = await db().query.labels.findFirst({ where: and(eq(schema.labels.id, labelId), eq(schema.labels.accountId, user.accountId), isNull(schema.labels.voidedAt)) });
  if (!label) return { ok: false, error: "Label not found or already voided." };
  const shipment = await db().query.shipments.findFirst({ where: eq(schema.shipments.id, label.shipmentId) });
  if (!shipment?.providerShipmentId) return { ok: false, error: "Shipment not found." };
  if (["delivered", "out_for_delivery", "in_transit"].includes(shipment.status)) return { ok: false, error: "This label has already been scanned by the carrier and can't be voided." };

  let status: "submitted" | "refunded" | "rejected";
  try {
    status = await getShippingProvider().void(shipment.providerShipmentId);
  } catch (err) {
    return { ok: false, error: err instanceof ProviderError ? err.message : "Couldn't reach the carrier — try again." };
  }
  if (status === "rejected") return { ok: false, error: "The carrier rejected the refund — the label may already be in use." };

  await db().batch([
    db().update(schema.labels).set({ voidedAt: new Date(), refundStatus: status }).where(eq(schema.labels.id, label.id)),
    db().update(schema.shipments).set({ status: "voided", updatedAt: new Date() }).where(eq(schema.shipments.id, shipment.id)),
  ]);
  // Refunds follow the carrier (design/Ledger.dc.html): the card is only refunded once EasyPost
  // says "refunded". A "submitted" void stays pending until the tracker webhook confirms it.
  if (status === "refunded") {
    await refundForLabel(user.accountId, label.id, label.priceCents, `Voided ${label.carrier} ${label.serviceName}`);
  }
  await deliverWebhooks(user.accountId, "label.voided", { label_id: label.id, tracking_number: label.trackingNumber, refund_status: status });
  revalidatePath("/shipments");
  revalidatePath("/billing");
  return { ok: true, message: status === "refunded" ? "Voided and refunded." : "Voided — the refund lands once the carrier approves it." };
}

/** Email the tracking link to the recipient (needs an email on the ship-to address). */
export async function emailTracking(labelId: string): Promise<ActionResult> {
  const user = await requireSession();
  const label = await db().query.labels.findFirst({ where: and(eq(schema.labels.id, labelId), eq(schema.labels.accountId, user.accountId)) });
  if (!label) return { ok: false, error: "Label not found." };
  const [shipment, account] = await Promise.all([
    db().query.shipments.findFirst({ where: eq(schema.shipments.id, label.shipmentId) }),
    db().query.accounts.findFirst({ where: eq(schema.accounts.id, user.accountId) }),
  ]);
  if (!shipment || !account) return { ok: false, error: "Shipment not found." };
  const to = await db().query.addresses.findFirst({ where: eq(schema.addresses.id, shipment.shipToId) });
  if (!to?.email) return { ok: false, error: "No email on this recipient. Add one on the Ship page next time." };
  const kind = shipment.status === "delivered" ? "delivered" : shipment.status === "out_for_delivery" ? "out_for_delivery" : shipment.status === "exception" ? "exception" : "shipped";
  await sendTrackingEmail({ label, account, recipientEmail: to.email, recipientName: to.name ?? "", kind });
  return { ok: true, message: `Tracking link sent to ${to.email}.` };
}
