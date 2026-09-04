import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listShipments, type ShipmentFilter } from "@/lib/shipments/queries";

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const url = new URL(req.url);
  const filter = (url.searchParams.get("filter") ?? "all") as ShipmentFilter;
  const q = url.searchParams.get("q") ?? "";
  const { rows } = await listShipments(session.user.accountId, filter, q, 5000);
  const header = ["bought_at", "recipient", "city", "service", "tracking_number", "status", "cost_usd", "tracking_url"];
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const lines = rows.map((r) => [r.purchasedAt.toISOString(), r.name, r.city, r.service, r.trackingNumber, r.status, (r.priceCents / 100).toFixed(2), `${base}/t/${r.trackingToken}`].map(csvCell).join(","));
  return new NextResponse([header.join(","), ...lines].join("\n"), {
    headers: { "content-type": "text/csv", "content-disposition": `attachment; filename="snap-shipments.csv"` },
  });
}
