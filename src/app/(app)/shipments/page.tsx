import type { Metadata } from "next";
import { Suspense } from "react";
import { ShipmentsTable } from "@/components/shipments/ShipmentsTable";
import { auth } from "@/lib/auth";
import { listShipments, type ShipmentFilter } from "@/lib/shipments/queries";

export const metadata: Metadata = { title: "Shipments · Ship with Snap" };

const FILTERS: ShipmentFilter[] = ["all", "label", "transit", "delivered", "exception", "voided"];

export default async function ShipmentsPage({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string }> }) {
  const session = await auth();
  const sp = await searchParams;
  const filter = (FILTERS.includes(sp.filter as ShipmentFilter) ? sp.filter : "all") as ShipmentFilter;
  const q = (sp.q ?? "").trim();
  const { rows, counts } = await listShipments(session!.user.accountId, filter, q);
  return (
    <main className="flex flex-1 flex-col">
      <Suspense>
        <ShipmentsTable rows={rows} counts={counts} filter={filter} q={q} />
      </Suspense>
    </main>
  );
}
