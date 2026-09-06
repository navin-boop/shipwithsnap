import { z } from "zod";
import { NextResponse } from "next/server";
import { appBase, authenticateApi, isResponse, problem } from "@/lib/api/auth";
import { getDefaultShipFrom, quoteMultiParcel, quoteShipment, upsertAddress } from "@/lib/ship/service";
import { getShippingProvider, ProviderError } from "@/lib/shipping";

const address = z.object({
  name: z.string().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  street1: z.string().min(1),
  street2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().max(40),
  zip: z.string().min(3).max(12),
  country: z.string().length(2).default("US"),
});

const parcel = z.object({
  length_in: z.number().nonnegative(),
  width_in: z.number().nonnegative(),
  height_in: z.number().nonnegative(),
  weight_oz: z.number().positive(),
  predefined_package: z.string().optional(),
});

const options = z.object({
  signature: z.enum(["none", "signature", "adult", "indirect"]).optional(),
  saturday_delivery: z.boolean().optional(),
  hold_for_pickup: z.boolean().optional(),
  machinable: z.boolean().optional(),
  additional_handling: z.boolean().optional(),
  label_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  print_custom_1: z.string().max(40).optional(),
  print_custom_2: z.string().max(40).optional(),
  invoice_number: z.string().max(40).optional(),
  handling_instructions: z.string().max(200).optional(),
  content_description: z.string().max(120).optional(),
  endorsement: z.string().optional(),
  hazmat: z.string().optional(),
  dry_ice: z.boolean().optional(),
  dry_ice_weight_oz: z.number().optional(),
  alcohol: z.boolean().optional(),
  perishable: z.boolean().optional(),
  certified_mail: z.boolean().optional(),
  registered_mail: z.boolean().optional(),
  return_receipt: z.boolean().optional(),
  special_rates_eligibility: z.string().optional(),
  carbon_neutral: z.boolean().optional(),
});

const customs = z.object({
  contents_type: z.string().default("merchandise"),
  contents_explanation: z.string().optional(),
  customs_signer: z.string().min(1),
  eel_pfc: z.string().default("NOEEI 30.37(a)"),
  non_delivery_option: z.enum(["return", "abandon"]).default("return"),
  restriction_type: z.string().default("none"),
  restriction_comments: z.string().optional(),
  incoterm: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().int().positive(),
    value_cents: z.number().int().positive(),
    weight_oz: z.number().positive(),
    hs_tariff_number: z.string().optional(),
    origin_country: z.string().length(2).default("US"),
    code: z.string().optional(),
  })).min(1),
});

const body = z.object({
  to: address,
  from: address.optional(),
  parcel: parcel.optional(),
  parcels: z.array(parcel).min(1).max(20).optional(),
  insurance_cents: z.number().int().nonnegative().optional(),
  signature: z.boolean().optional(),
  is_return: z.boolean().optional(),
  options: options.optional(),
  customs: customs.optional(),
});

/** POST /api/v1/rates — verifies the address, creates a shipment and returns its rates (valid 10 min). */
export async function POST(req: Request) {
  const ctx = await authenticateApi(req);
  if (isResponse(ctx)) return ctx;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return problem(422, "invalid_request", "Check the request body.", { errors: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) });
  const d = parsed.data;
  const boxes = d.parcels ?? (d.parcel ? [d.parcel] : []);
  if (!boxes.length) return problem(422, "invalid_request", "Send `parcel`, or `parcels` for a multi-box shipment.");
  if (d.to.country !== "US" && !d.customs) return problem(422, "customs_required", "International shipments need a `customs` object.");

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

    const shared = {
      to: { ...v.address, name: d.to.name ?? null, email: d.to.email ?? null, phone: d.to.phone ?? null },
      toResidential: v.residential ?? null,
      fromId,
      extras: { insuranceCents: d.insurance_cents, signature: d.signature },
      isReturn: d.is_return,
      options: d.options && {
        signature: d.options.signature, saturdayDelivery: d.options.saturday_delivery, holdForPickup: d.options.hold_for_pickup, machinable: d.options.machinable,
        additionalHandling: d.options.additional_handling, labelDate: d.options.label_date, printCustom1: d.options.print_custom_1, printCustom2: d.options.print_custom_2,
        invoiceNumber: d.options.invoice_number, handlingInstructions: d.options.handling_instructions, contentDescription: d.options.content_description,
        endorsement: d.options.endorsement, hazmat: d.options.hazmat, dryIce: d.options.dry_ice, dryIceWeightOz: d.options.dry_ice_weight_oz,
        alcohol: d.options.alcohol, perishable: d.options.perishable, certifiedMail: d.options.certified_mail, registeredMail: d.options.registered_mail,
        returnReceipt: d.options.return_receipt, specialRatesEligibility: d.options.special_rates_eligibility, carbonNeutral: d.options.carbon_neutral,
      },
      customs: d.customs && {
        contentsType: d.customs.contents_type, contentsExplanation: d.customs.contents_explanation ?? null, customsCertify: true, customsSigner: d.customs.customs_signer,
        eelPfc: d.customs.eel_pfc, nonDeliveryOption: d.customs.non_delivery_option, restrictionType: d.customs.restriction_type, restrictionComments: d.customs.restriction_comments ?? null,
        incoterm: d.customs.incoterm ?? null,
        items: d.customs.items.map((i) => ({ description: i.description, quantity: i.quantity, valueCents: i.value_cents, weightOz: i.weight_oz, hsTariffNumber: i.hs_tariff_number ?? null, originCountry: i.origin_country, code: i.code ?? null })),
      },
      createdBy: null,
    };
    const toParcel = (p: z.infer<typeof parcel>) => ({ type: (p.predefined_package ? "carrier_package" : "box") as "box" | "carrier_package", lengthIn: p.length_in, widthIn: p.width_in, heightIn: p.height_in, weightOz: p.weight_oz, predefinedPackage: p.predefined_package });

    const quote = boxes.length > 1
      ? await quoteMultiParcel(ctx.account, { ...shared, parcels: boxes.map(toParcel) })
      : await quoteShipment(ctx.account, { ...shared, parcel: toParcel(boxes[0]) });

    return NextResponse.json({
      shipment_id: quote.shipmentId,
      parcel_count: boxes.length,
      to: { ...v.address, residential: v.residential ?? null },
      messages: quote.messages,
      rates: quote.rates.map((r) => ({ id: r.id, carrier: r.carrier, service: r.serviceCode, service_name: r.serviceName, price_cents: r.priceCents, retail_cents: r.retailCents, est_days: r.estDays, est_delivery_date: r.estDeliveryDate, guaranteed: r.deliveryDateGuaranteed ?? false, expires_at: r.expiresAt })),
      links: { buy: `${appBase(req)}/api/v1/labels` },
    });
  } catch (err) {
    if (err instanceof ProviderError) return problem(err.code === "address_invalid" ? 422 : 502, err.code, err.message, err.retryable ? { retry_after: 10 } : {});
    throw err;
  }
}
