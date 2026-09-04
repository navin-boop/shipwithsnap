import { z } from "zod";
import { NextResponse } from "next/server";
import { appBase, authenticateApi, isResponse, problem } from "@/lib/api/auth";
import { getDefaultShipFrom, quoteShipment, upsertAddress } from "@/lib/ship/service";
import { getShippingProvider, ProviderError } from "@/lib/shipping";

const address = z.object({
  name: z.string().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  street1: z.string().min(1),
  street2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().length(2),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/),
  country: z.string().default("US"),
});

const body = z.object({
  to: address,
  from: address.optional(),
  parcel: z.object({ length_in: z.number().positive(), width_in: z.number().positive(), height_in: z.number().positive(), weight_oz: z.number().positive(), predefined_package: z.string().optional() }),
  insurance_cents: z.number().int().nonnegative().optional(),
  signature: z.boolean().optional(),
});

/** POST /api/v1/rates — verifies the address, creates a shipment and returns its rates (valid 10 min). */
export async function POST(req: Request) {
  const ctx = await authenticateApi(req);
  if (isResponse(ctx)) return ctx;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return problem(422, "invalid_request", "Check the request body.", { errors: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) });
  const d = parsed.data;
  try {
    const provider = getShippingProvider();
    const v = await provider.verifyAddress({ ...d.to, street2: d.to.street2 ?? null, name: d.to.name ?? null });
    if (!v.ok || !v.address) return problem(422, "address_invalid", v.errors?.join(" ") ?? "Address could not be verified.");
    let fromId: string;
    if (d.from) {
      fromId = (await upsertAddress(ctx.account.id, "ship_from", { ...d.from, street2: d.from.street2 ?? null, name: d.from.name ?? null })).id;
    } else {
      const def = await getDefaultShipFrom(ctx.account);
      if (!def) return problem(422, "ship_from_missing", "No default ship-from address; pass `from` or set one in the app.");
      fromId = def.id;
    }
    const quote = await quoteShipment(ctx.account, {
      to: { ...v.address, name: d.to.name ?? null, email: d.to.email ?? null, phone: d.to.phone ?? null },
      toResidential: v.residential ?? null,
      fromId,
      parcel: { type: "box", lengthIn: d.parcel.length_in, widthIn: d.parcel.width_in, heightIn: d.parcel.height_in, weightOz: d.parcel.weight_oz, predefinedPackage: d.parcel.predefined_package },
      extras: { insuranceCents: d.insurance_cents, signature: d.signature },
      createdBy: null,
    });
    return NextResponse.json({
      shipment_id: quote.shipmentId,
      to: { ...v.address, residential: v.residential ?? null },
      rates: quote.rates.map((r) => ({ id: r.id, carrier: r.carrier, service: r.serviceCode, service_name: r.serviceName, price_cents: r.priceCents, retail_cents: r.retailCents, est_days: r.estDays, est_delivery_date: r.estDeliveryDate, expires_at: r.expiresAt })),
      links: { buy: `${appBase(req)}/api/v1/labels` },
    });
  } catch (err) {
    if (err instanceof ProviderError) return problem(err.code === "address_invalid" ? 422 : 502, err.code, err.message, err.retryable ? { retry_after: 10 } : {});
    throw err;
  }
}
