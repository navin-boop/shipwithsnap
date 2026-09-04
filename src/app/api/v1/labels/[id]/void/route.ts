import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { appBase, authenticateApi, isResponse, labelJson, problem } from "@/lib/api/auth";
import { db, schema } from "@/lib/db";
import { getShippingProvider, ProviderError } from "@/lib/shipping";
import { deliverWebhooks } from "@/lib/webhooks/outbound";

/** POST /api/v1/labels/{id}/void — requests a carrier refund; the card refund follows approval. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const api = await authenticateApi(req);
  if (isResponse(api)) return api;
  const { id } = await ctx.params;
  const label = await db().query.labels.findFirst({ where: and(eq(schema.labels.id, id), eq(schema.labels.accountId, api.account.id), isNull(schema.labels.voidedAt)) });
  if (!label) return problem(404, "not_found", "Label not found or already voided.");
  const shipment = await db().query.shipments.findFirst({ where: eq(schema.shipments.id, label.shipmentId) });
  if (!shipment?.providerShipmentId) return problem(404, "not_found", "Shipment not found.");
  if (["delivered", "out_for_delivery", "in_transit"].includes(shipment.status)) return problem(409, "already_in_transit", "The carrier has scanned this label; it can't be voided.");
  try {
    const status = await getShippingProvider().void(shipment.providerShipmentId);
    if (status === "rejected") return problem(409, "refund_rejected", "The carrier rejected the refund.");
    await db().batch([
      db().update(schema.labels).set({ voidedAt: new Date(), refundStatus: status }).where(eq(schema.labels.id, label.id)),
      db().update(schema.shipments).set({ status: "voided", updatedAt: new Date() }).where(eq(schema.shipments.id, shipment.id)),
    ]);
    await deliverWebhooks(api.account.id, "label.voided", { label_id: label.id, tracking_number: label.trackingNumber, refund_status: status });
    const updated = (await db().query.labels.findFirst({ where: eq(schema.labels.id, label.id) }))!;
    return NextResponse.json(labelJson(updated, appBase(req)));
  } catch (err) {
    if (err instanceof ProviderError) return problem(502, err.code, err.message);
    throw err;
  }
}
