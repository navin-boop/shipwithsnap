import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export type ShipmentFilter = "all" | "label" | "transit" | "delivered" | "exception" | "voided";

type ShipmentStatus = (typeof schema.shipmentStatus.enumValues)[number];

const FILTER_STATUSES: Record<Exclude<ShipmentFilter, "all">, ShipmentStatus[]> = {
  label: ["label_created"],
  transit: ["accepted", "in_transit", "out_for_delivery"],
  delivered: ["delivered"],
  exception: ["exception", "returned"],
  voided: ["voided"],
};

export type ShipmentRow = {
  labelId: string;
  shipmentId: string;
  name: string;
  city: string;
  email: string | null;
  service: string;
  trackingNumber: string;
  trackingToken: string;
  status: string;
  priceCents: number;
  purchasedAt: Date;
  refundStatus: string | null;
};

export async function listShipments(accountId: string, filter: ShipmentFilter, q: string, limit = 50): Promise<{ rows: ShipmentRow[]; counts: Record<ShipmentFilter, number> }> {
  const base = and(eq(schema.labels.accountId, accountId));
  const where = and(
    base,
    filter === "all" ? undefined : inArray(schema.shipments.status, FILTER_STATUSES[filter]),
    q ? or(ilike(schema.addresses.name, `%${q}%`), ilike(schema.labels.trackingNumber, `%${q.replace(/\s+/g, "")}%`), ilike(schema.addresses.city, `%${q}%`)) : undefined,
  );

  const rows = await db()
    .select({
      labelId: schema.labels.id,
      shipmentId: schema.shipments.id,
      name: schema.addresses.name,
      city: schema.addresses.city,
      state: schema.addresses.state,
      email: schema.addresses.email,
      carrier: schema.labels.carrier,
      serviceName: schema.labels.serviceName,
      trackingNumber: schema.labels.trackingNumber,
      trackingToken: schema.labels.trackingToken,
      status: schema.shipments.status,
      priceCents: schema.labels.priceCents,
      purchasedAt: schema.labels.purchasedAt,
      refundStatus: schema.labels.refundStatus,
    })
    .from(schema.labels)
    .innerJoin(schema.shipments, eq(schema.shipments.id, schema.labels.shipmentId))
    .innerJoin(schema.addresses, eq(schema.addresses.id, schema.shipments.shipToId))
    .where(where)
    .orderBy(desc(schema.labels.purchasedAt))
    .limit(limit);

  const countRows = await db()
    .select({ status: schema.shipments.status, n: count() })
    .from(schema.labels)
    .innerJoin(schema.shipments, eq(schema.shipments.id, schema.labels.shipmentId))
    .where(base)
    .groupBy(schema.shipments.status);
  const byStatus = Object.fromEntries(countRows.map((r) => [r.status, Number(r.n)]));
  const sum = (keys: string[]) => keys.reduce((a, k) => a + (byStatus[k] ?? 0), 0);
  const counts: Record<ShipmentFilter, number> = {
    all: sum(Object.keys(byStatus)),
    label: sum(FILTER_STATUSES.label),
    transit: sum(FILTER_STATUSES.transit),
    delivered: sum(FILTER_STATUSES.delivered),
    exception: sum(FILTER_STATUSES.exception),
    voided: sum(FILTER_STATUSES.voided),
  };

  return {
    rows: rows.map((r) => ({
      labelId: r.labelId,
      shipmentId: r.shipmentId,
      name: r.name ?? "—",
      city: `${r.city}, ${r.state}`,
      email: r.email,
      service: `${r.carrier} ${r.serviceName}`,
      trackingNumber: r.trackingNumber,
      trackingToken: r.trackingToken,
      status: r.status,
      priceCents: r.priceCents,
      purchasedAt: r.purchasedAt,
      refundStatus: r.refundStatus,
    })),
    counts,
  };
}

export { sql };
