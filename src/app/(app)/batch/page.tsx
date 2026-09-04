import type { Metadata } from "next";
import { BatchTable } from "@/components/batch/BatchTable";
import { auth } from "@/lib/auth";
import { listOpenOrders } from "@/lib/batch/actions";

export const metadata: Metadata = { title: "Batch · Ship with Snap" };

export default async function BatchPage() {
  const session = await auth();
  const orders = await listOpenOrders(session!.user.accountId);
  return (
    <main className="flex flex-1 flex-col">
      <BatchTable orders={orders} storeCounts={{ csv: orders.length }} />
    </main>
  );
}
