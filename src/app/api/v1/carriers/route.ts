import { NextResponse } from "next/server";
import { authenticateApi, isResponse } from "@/lib/api/auth";
import { getShippingProvider } from "@/lib/shipping";

/** GET /api/v1/carriers — the services and predefined packages you can name in a rate request. */
export async function GET(req: Request) {
  const ctx = await authenticateApi(req);
  if (isResponse(ctx)) return ctx;
  const url = new URL(req.url);
  const only = url.searchParams.get("carriers")?.split(",").map((s) => s.trim()).filter(Boolean);
  try {
    const meta = await getShippingProvider().carrierMetadata(only?.length ? only : undefined);
    return NextResponse.json({
      carriers: meta.map((c) => ({
        carrier: c.carrier,
        services: c.services.map((s) => ({ code: s.code, name: s.name, description: s.description, max_weight_lb: s.maxWeightLb })),
        predefined_packages: c.predefinedPackages.map((p) => ({ code: p.code, dimensions: p.dimensions, max_weight_lb: p.maxWeightLb })),
      })),
    }, { headers: { "cache-control": "private, max-age=3600" } });
  } catch {
    return NextResponse.json({ carriers: [] });
  }
}
