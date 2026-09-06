import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShipmentDetail, type DetailProps } from "@/components/shipments/ShipmentDetail";
import { auth } from "@/lib/auth";
import { getShipmentDetail } from "@/lib/shipments/detail";

export const metadata: Metadata = { title: "Shipment · Ship with Snap" };

export default async function ShipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;
  const d = await getShipmentDetail(session!.user.accountId, id);
  if (!d) notFound();

  const related: DetailProps["relatedLabels"] = [
    ...d.returnLabels.map((l) => ({ id: l.id, kind: "return" as const, trackingNumber: l.trackingNumber, serviceName: l.serviceName })),
    ...(d.outbound ? [{ id: d.outbound.id, kind: "outbound" as const, trackingNumber: d.outbound.trackingNumber, serviceName: d.outbound.serviceName }] : []),
    ...d.siblingLabels.map((l) => ({ id: l.id, kind: "box" as const, trackingNumber: l.trackingNumber, serviceName: l.serviceName })),
  ];

  return (
    <main className="flex flex-1 flex-col">
      <ShipmentDetail
        label={{
          id: d.label.id, carrier: d.label.carrier, serviceName: d.label.serviceName, trackingNumber: d.label.trackingNumber, trackingToken: d.label.trackingToken,
          priceCents: d.label.priceCents, retailCents: d.label.retailCents, insuredCents: d.label.insuredCents, format: d.label.format,
          estDeliveryDate: d.label.estDeliveryDate, statusDetail: d.label.statusDetail, signedBy: d.label.signedBy, carrierWeightOz: d.label.carrierWeightOz,
          purchasedAt: d.label.purchasedAt.toISOString(), voidedAt: d.label.voidedAt?.toISOString() ?? null, refundStatus: d.label.refundStatus,
          feesCents: d.label.feesCents, forms: d.label.forms,
        }}
        status={d.shipment.status}
        isReturn={d.shipment.isReturn}
        parcel={d.shipment.parcel}
        options={d.shipment.options as Record<string, unknown>}
        hasCustoms={!!d.shipment.customs}
        to={d.to ? { name: d.to.name, company: d.to.company, street1: d.to.street1, street2: d.to.street2, city: d.to.city, state: d.to.state, zip: d.to.zip, country: d.to.country, email: d.to.email, phone: d.to.phone } : null}
        from={d.from ? { name: d.from.name, city: d.from.city, state: d.from.state, zip: d.from.zip } : null}
        events={d.events.map((e) => ({ id: e.id, description: e.description, statusDetail: e.statusDetail, city: e.city, state: e.state, zip: e.zip, occurredAt: e.occurredAt.toISOString() }))}
        pickups={d.pickups.map((p) => ({ id: p.id, status: p.status, carrier: p.carrier, confirmation: p.confirmation, minDatetime: p.minDatetime.toISOString() }))}
        claims={d.claims.map((c) => ({ id: c.id, status: c.status, type: c.type, requestedCents: c.requestedCents }))}
        relatedLabels={related}
        orderNumber={d.order?.number ?? null}
      />
    </main>
  );
}
