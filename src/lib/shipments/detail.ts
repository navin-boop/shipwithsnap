import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/** Everything the shipment detail page shows: label, addresses, options, events, related pickups / claims / returns. */
export async function getShipmentDetail(accountId: string, labelId: string) {
  const label = await db().query.labels.findFirst({ where: and(eq(schema.labels.id, labelId), eq(schema.labels.accountId, accountId)) });
  if (!label) return null;
  const shipment = await db().query.shipments.findFirst({ where: eq(schema.shipments.id, label.shipmentId) });
  if (!shipment) return null;
  const [to, from, events, pickups, claims, returns, siblings, order] = await Promise.all([
    db().query.addresses.findFirst({ where: eq(schema.addresses.id, shipment.shipToId) }),
    db().query.addresses.findFirst({ where: eq(schema.addresses.id, shipment.shipFromId) }),
    db().query.trackingEvents.findMany({ where: eq(schema.trackingEvents.labelId, label.id), orderBy: desc(schema.trackingEvents.occurredAt) }),
    db().query.pickups.findMany({ where: eq(schema.pickups.labelId, label.id), orderBy: desc(schema.pickups.createdAt) }),
    db().query.claims.findMany({ where: eq(schema.claims.labelId, label.id), orderBy: desc(schema.claims.createdAt) }),
    db().query.shipments.findMany({ where: eq(schema.shipments.returnOfLabelId, label.id) }),
    shipment.groupId ? db().query.shipments.findMany({ where: eq(schema.shipments.groupId, shipment.groupId), orderBy: schema.shipments.parcelIndex }) : Promise.resolve([]),
    shipment.orderId ? db().query.orders.findFirst({ where: eq(schema.orders.id, shipment.orderId) }) : Promise.resolve(null),
  ]);
  const returnLabels = returns.length ? await db().query.labels.findMany({ where: and(eq(schema.labels.accountId, accountId)) }).then((ls) => ls.filter((l) => returns.some((r) => r.id === l.shipmentId))) : [];
  const siblingLabels = siblings.length > 1 ? await db().query.labels.findMany({ where: eq(schema.labels.accountId, accountId) }).then((ls) => ls.filter((l) => siblings.some((s) => s.id === l.shipmentId) && l.id !== label.id)) : [];
  const outbound = shipment.returnOfLabelId ? await db().query.labels.findFirst({ where: eq(schema.labels.id, shipment.returnOfLabelId) }) : null;
  return { label, shipment, to, from, events, pickups, claims, returnLabels, siblingLabels, outbound, order };
}
