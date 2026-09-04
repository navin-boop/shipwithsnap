import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { appBase, authenticateApi, isResponse, problem } from "@/lib/api/auth";
import { db, schema } from "@/lib/db";

/** GET /api/v1/tracking/{tracking_number} — canonical status plus events. */
export async function GET(req: Request, ctx: { params: Promise<{ number: string }> }) {
  const api = await authenticateApi(req);
  if (isResponse(api)) return api;
  const { number } = await ctx.params;
  const label = await db().query.labels.findFirst({ where: and(eq(schema.labels.trackingNumber, number.replace(/\s+/g, "")), eq(schema.labels.accountId, api.account.id)) });
  if (!label) return problem(404, "not_found", "No label with that tracking number.");
  const [shipment, events] = await Promise.all([
    db().query.shipments.findFirst({ where: eq(schema.shipments.id, label.shipmentId) }),
    db().query.trackingEvents.findMany({ where: eq(schema.trackingEvents.labelId, label.id), orderBy: desc(schema.trackingEvents.occurredAt) }),
  ]);
  return NextResponse.json({
    tracking_number: label.trackingNumber,
    carrier: label.carrier,
    status: shipment?.status ?? "label_created",
    est_delivery_date: label.estDeliveryDate,
    tracking_url: `${appBase(req)}/t/${label.trackingToken}`,
    events: events.map((e) => ({ status: e.status, description: e.description, city: e.city, state: e.state, zip: e.zip, occurred_at: e.occurredAt.toISOString() })),
  });
}
