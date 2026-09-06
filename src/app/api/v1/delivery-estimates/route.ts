import { z } from "zod";
import { NextResponse } from "next/server";
import { authenticateApi, isResponse, problem } from "@/lib/api/auth";
import { getShippingProvider, ProviderError } from "@/lib/shipping";

const body = z.object({
  from_zip: z.string().regex(/^\d{5}/),
  to_zip: z.string().regex(/^\d{5}/),
  planned_ship_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  carriers: z.array(z.string()).optional(),
});

/** POST /api/v1/delivery-estimates — how long each service actually takes between two ZIPs, with confidence. */
export async function POST(req: Request) {
  const ctx = await authenticateApi(req);
  if (isResponse(ctx)) return ctx;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return problem(422, "invalid_request", "Body needs from_zip and to_zip (US ZIPs).");
  const d = parsed.data;
  try {
    const estimates = await getShippingProvider().estimateDelivery({
      fromZip: d.from_zip.slice(0, 5), toZip: d.to_zip.slice(0, 5),
      plannedShipDate: d.planned_ship_date ?? new Date().toISOString().slice(0, 10),
      carriers: d.carriers,
    });
    return NextResponse.json({ estimates: estimates.map((e) => ({ carrier: e.carrier, service: e.serviceCode, est_delivery_date: e.estDeliveryDate, days_in_transit: e.daysInTransit })) });
  } catch (err) {
    if (err instanceof ProviderError) return problem(502, err.code, err.message);
    throw err;
  }
}
