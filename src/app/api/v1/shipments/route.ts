import { NextResponse } from "next/server";
import { appBase, authenticateApi, isResponse } from "@/lib/api/auth";
import { listShipments, type ShipmentFilter } from "@/lib/shipments/queries";

/** GET /api/v1/shipments?status=all|label|transit|delivered|exception|voided&q= — newest first. */
export async function GET(req: Request) {
  const api = await authenticateApi(req);
  if (isResponse(api)) return api;
  const url = new URL(req.url);
  const filter = (url.searchParams.get("status") ?? "all") as ShipmentFilter;
  const q = url.searchParams.get("q") ?? "";
  const { rows } = await listShipments(api.account.id, ["all", "label", "transit", "delivered", "exception", "voided"].includes(filter) ? filter : "all", q, 200);
  const base = appBase(req);
  return NextResponse.json({
    data: rows.map((r) => ({ label_id: r.labelId, shipment_id: r.shipmentId, recipient: r.name, city: r.city, service: r.service, tracking_number: r.trackingNumber, tracking_url: `${base}/t/${r.trackingToken}`, status: r.status, price_cents: r.priceCents, purchased_at: r.purchasedAt.toISOString() })),
  });
}
