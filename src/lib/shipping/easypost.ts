import { createHash } from "node:crypto";
import EasyPostClient, { type IRate, type ITrackingDetail } from "@easypost/api";
import {
  ProviderError,
  type AddressInput,
  type AddressValidation,
  type BuyRequest,
  type CanonicalStatus,
  type CarrierAccountInfo,
  type CarrierMetadataInfo,
  type CarrierTypeInfo,
  type ClaimRequest,
  type ClaimResult,
  type CustomsInput,
  type DeliveryEstimate,
  type LabelFormatCode,
  type LabelResult,
  type OrderRateResult,
  type ParcelInput,
  type PickupRequest,
  type PickupResult,
  type RateQuoteResult,
  type RateRequest,
  type ScanFormResult,
  type ShipmentOptions,
  type ShippingProvider,
  type TrackerDetails,
  type TrackingEvent,
} from "./provider";

// Spec: design/CarrierAdapter.dc.html ("EasyPost integration").
// SDK static resource methods on a client instance; a few endpoints without SDK coverage go through `raw()`.

const CARRIER_NAMES: Record<string, string> = {
  USPS: "USPS", USPSShip: "USPS", UPS: "UPS", UPSDAP: "UPS", UPSSurePost: "UPS", UPSMailInnovations: "UPS",
  FedEx: "FedEx", FedExDefault: "FedEx", FedExSmartPost: "FedEx", DHLExpress: "DHL", DhlEcs: "DHL", DHLEcommerce: "DHL",
};
export function carrierName(account: string): string {
  if (CARRIER_NAMES[account]) return CARRIER_NAMES[account];
  // Carrier metadata returns lowercase, underscored names ("usps", "dhl_express").
  const key = account.toLowerCase().replace(/[^a-z]/g, "");
  const lower: Record<string, string> = { usps: "USPS", uspsship: "USPS", ups: "UPS", upsdap: "UPS", upsmailinnovations: "UPS", upssurepost: "UPS", fedex: "FedEx", fedexdefault: "FedEx", fedexsmartpost: "FedEx", dhlexpress: "DHL", dhlecommerce: "DHL", dhlecs: "DHL", canadapost: "Canada Post" };
  return lower[key] ?? account.replace(/(Default|DAP|Account)$/i, "");
}

const SERVICE_NAMES: Record<string, string> = {
  FEDEX_GROUND: "Ground", GROUND_HOME_DELIVERY: "Home Delivery", SMART_POST: "Ground Economy", FEDEX_EXPRESS_SAVER: "Express Saver",
  FEDEX_2_DAY: "2Day", FEDEX_2_DAY_AM: "2Day A.M.", STANDARD_OVERNIGHT: "Standard Overnight", PRIORITY_OVERNIGHT: "Priority Overnight",
  FIRST_OVERNIGHT: "First Overnight", INTERNATIONAL_ECONOMY: "International Economy", INTERNATIONAL_PRIORITY: "International Priority",
  GroundAdvantage: "Ground Advantage", Priority: "Priority Mail", Express: "Priority Mail Express", First: "First-Class",
  ParcelSelect: "Parcel Select", MediaMail: "Media Mail", LibraryMail: "Library Mail", PriorityMailInternational: "Priority Mail International",
  ExpressMailInternational: "Priority Mail Express International", FirstClassPackageInternationalService: "First-Class Package International",
  Ground: "Ground", GroundSaver: "Ground Saver", "3DaySelect": "3 Day Select", "2ndDayAir": "2nd Day Air", "2ndDayAirAM": "2nd Day Air A.M.",
  NextDayAir: "Next Day Air", NextDayAirSaver: "Next Day Air Saver", NextDayAirEarlyAM: "Next Day Air Early", Standard: "Standard (Canada/Mexico)",
  Expedited: "Worldwide Expedited", Express_Plus: "Worldwide Express Plus", Saver: "Worldwide Saver", UPSStandard: "Standard",
};
export function serviceName(code: string): string {
  if (SERVICE_NAMES[code]) return SERVICE_NAMES[code];
  if (code.includes("_")) return code.toLowerCase().split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  return code.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function toCents(amount: string | number | null | undefined): number | null {
  if (amount === null || amount === undefined || amount === "") return null;
  const n = Number(amount);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}
const dollars = (cents: number) => (cents / 100).toFixed(2);

function labelOptions(format: LabelFormatCode): Record<string, string> {
  switch (format) {
    case "zpl": return { label_format: "ZPL", label_size: "4x6" };
    case "pdf_letter": return { label_format: "PDF", label_size: "8.5x11" };
    default: return { label_format: "PDF", label_size: "4x6" };
  }
}

const SIGNATURE: Record<string, string> = { none: "NO_SIGNATURE", signature: "SIGNATURE", adult: "ADULT_SIGNATURE", indirect: "INDIRECT_SIGNATURE" };

/** Our option names → EasyPost `options`. Empty values are dropped so carriers get clean requests. */
export function toEpOptions(o: ShipmentOptions | undefined, format: LabelFormatCode, legacySignature?: boolean): Record<string, unknown> {
  const out: Record<string, unknown> = { ...labelOptions(format) };
  const sig = o?.signature ?? (legacySignature ? "signature" : undefined);
  if (sig && sig !== "none") out.delivery_confirmation = SIGNATURE[sig];
  if (o?.saturdayDelivery) out.saturday_delivery = true;
  if (o?.holdForPickup) out.hold_for_pickup = true;
  if (o?.machinable === false) out.machinable = false;
  if (o?.additionalHandling) out.additional_handling = true;
  if (o?.labelDate) out.label_date = `${o.labelDate}T12:00:00Z`;
  if (o?.printCustom1) out.print_custom_1 = o.printCustom1;
  if (o?.printCustom2) out.print_custom_2 = o.printCustom2;
  if (o?.invoiceNumber) out.invoice_number = o.invoiceNumber;
  if (o?.handlingInstructions) out.handling_instructions = o.handlingInstructions;
  if (o?.contentDescription) out.content_description = o.contentDescription;
  if (o?.endorsement) out.endorsement = o.endorsement;
  if (o?.hazmat) out.hazmat = o.hazmat;
  if (o?.dryIce) { out.dry_ice = true; if (o.dryIceWeightOz) out.dry_ice_weight = String(o.dryIceWeightOz); }
  if (o?.alcohol) out.alcohol = true;
  if (o?.perishable) out.perishable = true;
  if (o?.certifiedMail) out.certified_mail = true;
  if (o?.registeredMail) out.registered_mail = true;
  if (o?.returnReceipt) out.return_receipt = true;
  if (o?.specialRatesEligibility) out.special_rates_eligibility = o.specialRatesEligibility;
  if (o?.carbonNeutral) out.carbon_neutral = true;
  if (o?.deliveryMaxDatetime) out.delivery_max_datetime = o.deliveryMaxDatetime;
  if (o?.carrierNotificationEmail) out.carrier_notification_email = o.carrierNotificationEmail;
  if (o?.carrierNotificationSms) out.carrier_notification_sms = o.carrierNotificationSms;
  return out;
}

function toEpAddress(a: AddressInput) {
  return {
    name: a.name ?? undefined, company: a.company ?? undefined, phone: a.phone ?? undefined, email: a.email ?? undefined,
    street1: a.street1, street2: a.street2 ?? undefined, city: a.city, state: a.state, zip: a.zip, country: a.country ?? "US",
    residential: a.residential ?? undefined,
  };
}

function toEpParcel(p: ParcelInput) {
  return p.predefinedPackage
    ? { weight: p.weightOz, predefined_package: p.predefinedPackage }
    : { length: p.lengthIn, width: p.widthIn, height: p.heightIn, weight: p.weightOz };
}

function toEpCustoms(c: CustomsInput) {
  return {
    contents_type: c.contentsType,
    contents_explanation: c.contentsExplanation ?? undefined,
    customs_certify: c.customsCertify,
    customs_signer: c.customsSigner,
    eel_pfc: c.eelPfc,
    non_delivery_option: c.nonDeliveryOption,
    restriction_type: c.restrictionType,
    restriction_comments: c.restrictionComments ?? undefined,
    declaration: c.declaration ?? undefined,
    customs_items: c.items.map((i) => ({
      description: i.description, quantity: i.quantity, value: dollars(i.valueCents * i.quantity), weight: i.weightOz * i.quantity,
      hs_tariff_number: i.hsTariffNumber ?? undefined, origin_country: i.originCountry, code: i.code ?? undefined, currency: "USD",
    })),
  };
}

const STATUS_MAP: Record<string, CanonicalStatus> = {
  pre_transit: "label_created", in_transit: "in_transit", out_for_delivery: "out_for_delivery", delivered: "delivered",
  available_for_pickup: "out_for_delivery", return_to_sender: "returned", failure: "exception", cancelled: "exception", error: "exception", unknown: "label_created",
};

function mapEasyPostError(err: unknown): ProviderError {
  const e = err as { statusCode?: number; status?: number; message?: string; code?: string; errors?: Array<{ message?: string; field?: string }> };
  const status = e.statusCode ?? e.status ?? 0;
  const detail = e.errors?.map((x) => [x.field, x.message].filter(Boolean).join(": ")).join("; ");
  const message = detail || e.message || "EasyPost request failed";
  if (status === 422 && /address/i.test(message)) return new ProviderError("address_invalid", message);
  if (status === 429) return new ProviderError("provider_unavailable", "Rate limited by EasyPost", true);
  if (status >= 500 || status === 0) return new ProviderError("provider_unavailable", message, true);
  return new ProviderError("unknown", message);
}

function rateOf(r: IRate): RateQuoteResult {
  return {
    providerRateId: r.id,
    carrier: carrierName(r.carrier),
    serviceCode: r.service,
    serviceName: serviceName(r.service),
    priceCents: toCents(r.rate) ?? 0,
    retailCents: toCents(r.retail_rate),
    estDays: r.delivery_days ?? r.est_delivery_days ?? null,
    estDeliveryDate: r.delivery_date ? String(r.delivery_date).slice(0, 10) : null,
    deliveryDateGuaranteed: r.delivery_date_guaranteed ?? false,
    carrierAccountId: r.carrier_account_id ?? null,
  };
}

type EpShipment = {
  id: string; rates?: IRate[]; messages?: Array<{ message?: string; carrier?: string }>; postage_label?: { id: string; label_url: string; label_pdf_url?: string; label_zpl_url?: string };
  tracker?: { id?: string } | null; tracking_code: string; selected_rate?: IRate | null; refund_status?: "submitted" | "refunded" | "rejected" | null;
  fees?: Array<{ type: string; amount: string }>; forms?: Array<{ form_type: string; form_url: string }>;
};

function labelOf(s: EpShipment, format: LabelFormatCode, chargedFallback = 0): LabelResult {
  const label = s.postage_label!;
  const url = format === "zpl" ? label.label_zpl_url || label.label_url : label.label_pdf_url || label.label_url;
  const fees: Record<string, number> = {};
  for (const f of s.fees ?? []) fees[f.type] = (fees[f.type] ?? 0) + (toCents(f.amount) ?? 0);
  return {
    providerLabelId: label.id,
    providerTrackerId: s.tracker?.id ?? null,
    trackingCode: s.tracking_code,
    labelUrl: url,
    chargedCents: toCents(s.selected_rate?.rate) ?? chargedFallback,
    feesCents: fees,
    forms: (s.forms ?? []).map((f) => ({ type: f.form_type, url: f.form_url })),
  };
}

type EpTracker = {
  id: string; tracking_code: string; carrier: string; status: string; status_detail?: string | null; est_delivery_date?: string | null;
  signed_by?: string | null; weight?: number | null; public_url?: string | null; carrier_detail?: { service?: string | null } | null; tracking_details?: ITrackingDetail[];
};

function trackerOf(t: EpTracker): TrackerDetails {
  return {
    providerTrackerId: t.id,
    trackingCode: t.tracking_code,
    carrier: carrierName(t.carrier),
    status: STATUS_MAP[t.status] ?? "in_transit",
    rawStatus: t.status,
    statusDetail: t.status_detail ?? null,
    estDeliveryDate: t.est_delivery_date ? String(t.est_delivery_date).slice(0, 10) : null,
    signedBy: t.signed_by ?? null,
    carrierWeightOz: t.weight ?? null,
    serviceName: t.carrier_detail?.service ?? null,
    publicUrl: t.public_url ?? null,
    events: (t.tracking_details ?? []).map(normalizeDetail),
  };
}

type EpPickup = { id: string; status: "unknown" | "scheduled" | "canceled"; confirmation?: string | null; pickup_rates?: Array<{ carrier: string; service: string; rate: string }>; messages?: Array<{ message?: string; carrier?: string }> };
function pickupOf(p: EpPickup): PickupResult {
  return {
    providerPickupId: p.id, status: p.status, confirmation: p.confirmation ?? null,
    rates: (p.pickup_rates ?? []).map((r) => ({ carrier: carrierName(r.carrier), serviceCode: r.service, priceCents: toCents(r.rate) ?? 0 })),
    messages: (p.messages ?? []).map((m) => [m.carrier, m.message].filter(Boolean).join(": ")),
  };
}

type EpScanForm = { id: string; status: "creating" | "created" | "failed"; form_url?: string | null; tracking_codes?: string[]; message?: string | null };
const scanFormOf = (s: EpScanForm): ScanFormResult => ({ providerScanFormId: s.id, status: s.status, formUrl: s.form_url ?? null, trackingCodes: s.tracking_codes ?? [], message: s.message ?? null });

type EpClaim = { id: string; status: string; status_detail?: string | null; requested_amount?: string; approved_amount?: string | null; insurance_amount?: string | null; history?: Array<{ status: string; status_detail?: string | null; timestamp?: string; status_timestamp?: string }> };
const claimOf = (c: EpClaim): ClaimResult => ({
  providerClaimId: c.id, status: c.status, statusDetail: c.status_detail ?? null,
  requestedCents: toCents(c.requested_amount) ?? 0, approvedCents: toCents(c.approved_amount), insuredCents: toCents(c.insurance_amount),
  history: (c.history ?? []).map((h) => ({ status: h.status, statusDetail: h.status_detail ?? null, at: h.timestamp ?? h.status_timestamp ?? "" })),
});

export class EasyPostProvider implements ShippingProvider {
  readonly name = "easypost" as const;
  private client: InstanceType<typeof EasyPostClient>;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = new EasyPostClient(apiKey, { timeout: 15_000 });
  }

  /** Direct call for the few endpoints the SDK doesn't wrap well. */
  private async raw<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`https://api.easypost.com/v2${path}`, {
      method,
      headers: { authorization: `Basic ${Buffer.from(this.apiKey + ":").toString("base64")}`, "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: { message?: string; errors?: Array<{ field?: string; message?: string }> } };
    if (!res.ok) throw Object.assign(new Error(json.error?.message ?? `EasyPost ${res.status}`), { statusCode: res.status, errors: json.error?.errors });
    return json as T;
  }

  private wrap<T>(p: Promise<T>): Promise<T> {
    return p.catch((err) => { throw mapEasyPostError(err); });
  }

  async verifyAddress(a: AddressInput): Promise<AddressValidation> {
    return this.wrap((async () => {
      const res = (await this.client.Address.create({ ...toEpAddress(a), verify: ["delivery"] })) as unknown as {
        verifications?: { delivery?: { success: boolean; errors: Array<{ message: string }>; details?: { latitude?: number; longitude?: number; time_zone?: string } } };
        residential?: boolean | null; name?: string; company?: string; phone?: string; email?: string; street1?: string; street2?: string; city?: string; state?: string; zip?: string; country?: string;
      };
      const v = res.verifications?.delivery;
      if (v && !v.success) return { ok: false, errors: v.errors.map((e) => e.message) };
      return {
        ok: true,
        residential: res.residential ?? null,
        latitude: v?.details?.latitude ?? null, longitude: v?.details?.longitude ?? null, timeZone: v?.details?.time_zone ?? null,
        address: {
          name: res.name ?? a.name ?? null, company: res.company ?? a.company ?? null, phone: res.phone ?? a.phone ?? null, email: res.email ?? a.email ?? null,
          street1: res.street1 ?? a.street1, street2: res.street2 ?? null, city: res.city ?? a.city, state: res.state ?? a.state, zip: res.zip ?? a.zip, country: res.country ?? a.country ?? "US",
        },
      };
    })());
  }

  private shipmentParams(req: Omit<RateRequest, "parcel">) {
    return {
      reference: req.reference,
      to_address: toEpAddress(req.to),
      from_address: toEpAddress(req.from),
      is_return: req.isReturn ? true : undefined,
      customs_info: req.customs ? toEpCustoms(req.customs) : undefined,
      options: toEpOptions(req.options, req.format, req.signature),
      ...(req.carrierAccountIds?.length ? { carrier_accounts: req.carrierAccountIds } : {}),
    };
  }

  async rate(req: RateRequest) {
    return this.wrap((async () => {
      const s = (await this.client.Shipment.create({ ...this.shipmentParams(req), parcel: toEpParcel(req.parcel) })) as unknown as EpShipment;
      return {
        providerShipmentId: s.id,
        rates: ((s.rates ?? []) as IRate[]).map(rateOf),
        messages: (s.messages ?? []).map((m) => [m.carrier, m.message].filter(Boolean).join(": ")),
      };
    })());
  }

  async buy(req: BuyRequest): Promise<LabelResult> {
    return this.wrap((async () => {
      // Idempotency: EasyPost has no key header on buy, so check for an existing label first.
      const existing = (await this.client.Shipment.retrieve(req.providerShipmentId)) as unknown as EpShipment;
      const bought = existing.postage_label
        ? existing
        : ((await this.client.Shipment.buy(req.providerShipmentId, req.providerRateId, req.insuranceCents ? req.insuranceCents / 100 : undefined, req.endShipperId ?? undefined)) as unknown as EpShipment);
      return labelOf(bought, req.format);
    })());
  }

  async void(providerShipmentId: string) {
    return this.wrap((async () => {
      const s = (await this.client.Shipment.refund(providerShipmentId)) as unknown as EpShipment;
      return s.refund_status ?? "submitted";
    })());
  }

  async convertLabel(providerShipmentId: string, format: LabelFormatCode): Promise<string> {
    return this.wrap((async () => {
      const s = (await this.client.Shipment.convertLabelFormat(providerShipmentId, format === "zpl" ? "ZPL" : "PDF")) as unknown as EpShipment;
      return labelOf(s, format).labelUrl;
    })());
  }

  async estimateDelivery(req: { fromZip: string; toZip: string; plannedShipDate: string; carriers?: string[] }): Promise<DeliveryEstimate[]> {
    return this.wrap((async () => {
      // SmartRate requires an explicit carrier list and answers with `results`, one row per service.
      const res = await this.raw<{ results?: Array<{ carrier: string; service: string; easypost_time_in_transit_data?: { days_in_transit?: Record<string, number>; easypost_estimated_delivery_date?: string | null } }> }>(
        "POST", "/smartrate/deliver_by",
        { from_zip: req.fromZip, to_zip: req.toZip, planned_ship_date: req.plannedShipDate, carriers: req.carriers?.length ? req.carriers : ["USPS", "UPS", "FedEx"] },
      );
      return (res.results ?? []).map((e) => {
        const tint = e.easypost_time_in_transit_data;
        const d = tint?.days_in_transit ?? {};
        const at = (k: string) => (typeof d[`percentile_${k}`] === "number" ? d[`percentile_${k}`] : undefined);
        return {
          carrier: carrierName(e.carrier),
          serviceCode: e.service,
          estDeliveryDate: tint?.easypost_estimated_delivery_date ? String(tint.easypost_estimated_delivery_date).slice(0, 10) : null,
          daysInTransit: { "50": at("50"), "75": at("75"), "85": at("85"), "90": at("90"), "95": at("95"), "97": at("97"), "99": at("99") },
        };
      });
    })());
  }

  async rateOrder(req: Omit<RateRequest, "parcel"> & { parcels: ParcelInput[] }) {
    return this.wrap((async () => {
      const base = this.shipmentParams(req);
      const o = (await this.client.Order.create({
        reference: base.reference, to_address: base.to_address, from_address: base.from_address, is_return: base.is_return,
        ...(base.carrier_accounts ? { carrier_accounts: base.carrier_accounts } : {}),
        shipments: req.parcels.map((p) => ({ parcel: toEpParcel(p), options: base.options, customs_info: base.customs_info })),
      })) as unknown as { id: string; rates?: IRate[]; messages?: Array<{ message?: string; carrier?: string }> };
      const rates: OrderRateResult[] = ((o.rates ?? []) as IRate[]).map((r) => ({
        carrier: carrierName(r.carrier), serviceCode: r.service, serviceName: serviceName(r.service),
        priceCents: toCents(r.rate) ?? 0, retailCents: toCents(r.retail_rate), estDays: r.delivery_days ?? null, estDeliveryDate: r.delivery_date ? String(r.delivery_date).slice(0, 10) : null,
      }));
      return { providerOrderId: o.id, rates, messages: (o.messages ?? []).map((m) => [m.carrier, m.message].filter(Boolean).join(": ")) };
    })());
  }

  async buyOrder(providerOrderId: string, carrier: string, serviceCode: string, format: LabelFormatCode) {
    return this.wrap((async () => {
      // EasyPost wants the carrier *account* name it rated with; look it up from the order's rates.
      const existing = (await this.client.Order.retrieve(providerOrderId)) as unknown as { rates?: IRate[]; shipments?: EpShipment[] };
      const match = (existing.rates ?? []).find((r) => carrierName(r.carrier) === carrier && r.service === serviceCode);
      const o = existing.shipments?.every((s) => s.postage_label)
        ? existing
        : ((await this.client.Order.buy(providerOrderId, match?.carrier ?? carrier, serviceCode)) as unknown as { shipments?: EpShipment[] });
      return (o.shipments ?? []).map((s, i) => ({ ...labelOf(s, format), providerShipmentId: s.id, parcelIndex: i }));
    })());
  }

  async track(providerTrackerId: string): Promise<TrackingEvent[]> {
    return (await this.trackerDetails(providerTrackerId)).events;
  }

  async trackerDetails(providerTrackerId: string): Promise<TrackerDetails> {
    return this.wrap((async () => trackerOf((await this.client.Tracker.retrieve(providerTrackerId)) as unknown as EpTracker))());
  }

  async createTracker(trackingCode: string, carrier?: string | null): Promise<TrackerDetails> {
    return this.wrap((async () => trackerOf((await this.client.Tracker.create({ tracking_code: trackingCode, carrier: carrier ?? undefined })) as unknown as EpTracker))());
  }

  async createPickup(req: PickupRequest): Promise<PickupResult> {
    return this.wrap((async () => {
      const p = (await this.client.Pickup.create({
        address: toEpAddress(req.address),
        shipment: req.providerShipmentId ? { id: req.providerShipmentId } : undefined,
        batch: req.providerBatchId ? { id: req.providerBatchId } : undefined,
        min_datetime: req.minDatetime, max_datetime: req.maxDatetime,
        instructions: req.instructions ?? undefined, reference: req.reference ?? undefined,
        is_account_address: false,
        ...(req.carrierAccountIds?.length ? { carrier_accounts: req.carrierAccountIds } : {}),
      })) as unknown as EpPickup;
      return pickupOf(p);
    })());
  }

  async buyPickup(providerPickupId: string, carrier: string, serviceCode: string): Promise<PickupResult> {
    return this.wrap((async () => {
      const existing = (await this.client.Pickup.retrieve(providerPickupId)) as unknown as EpPickup;
      const match = (existing.pickup_rates ?? []).find((r) => carrierName(r.carrier) === carrier && r.service === serviceCode);
      return pickupOf((await this.client.Pickup.buy(providerPickupId, match?.carrier ?? carrier, serviceCode)) as unknown as EpPickup);
    })());
  }

  async cancelPickup(providerPickupId: string): Promise<PickupResult> {
    return this.wrap((async () => pickupOf((await this.client.Pickup.cancel(providerPickupId)) as unknown as EpPickup))());
  }

  async createScanForm(providerShipmentIds: string[]): Promise<ScanFormResult> {
    return this.wrap((async () => scanFormOf((await this.client.ScanForm.create({ shipments: providerShipmentIds.map((id) => ({ id })) })) as unknown as EpScanForm))());
  }

  async getScanForm(providerScanFormId: string): Promise<ScanFormResult> {
    return this.wrap((async () => scanFormOf((await this.client.ScanForm.retrieve(providerScanFormId)) as unknown as EpScanForm))());
  }

  async createClaim(req: ClaimRequest): Promise<ClaimResult> {
    return this.wrap((async () => claimOf((await this.client.Claim.create({
      tracking_code: req.trackingCode, type: req.type, amount: dollars(req.amountCents), description: req.description, contact_email: req.contactEmail,
      recipient_name: req.recipientName ?? undefined, reference: req.reference ?? undefined,
      email_evidence_attachments: req.attachments?.evidence, invoice_attachments: req.attachments?.invoices, supporting_documentation_attachments: req.attachments?.supporting,
    })) as unknown as EpClaim))());
  }

  async getClaim(providerClaimId: string): Promise<ClaimResult> {
    return this.wrap((async () => claimOf((await this.client.Claim.retrieve(providerClaimId)) as unknown as EpClaim))());
  }

  async cancelClaim(providerClaimId: string): Promise<ClaimResult> {
    return this.wrap((async () => claimOf((await this.client.Claim.cancel(providerClaimId)) as unknown as EpClaim))());
  }

  async listCarrierTypes(): Promise<CarrierTypeInfo[]> {
    return this.wrap((async () => {
      const types = (await this.client.CarrierType.all()) as unknown as Array<{ type: string; readable?: string; logo?: string; fields?: { credentials?: Record<string, { visibility?: string; label?: string }>; custom_workflow?: boolean; auto_link?: boolean } }>;
      return types.map((t) => ({
        type: t.type,
        readable: t.readable ?? t.type.replace(/Account$/, ""),
        customWorkflow: !!t.fields?.custom_workflow,
        credentials: Object.entries(t.fields?.credentials ?? {}).map(([name, f]) => ({ name, label: f.label ?? name, secret: (f.visibility ?? "visible") !== "visible" })),
      }));
    })());
  }

  async listCarrierAccounts(): Promise<CarrierAccountInfo[]> {
    return this.wrap((async () => {
      const list = (await this.client.CarrierAccount.all()) as unknown as Array<{ id: string; type: string; readable?: string; description?: string | null; created_at?: string }>;
      return list.map((a) => ({ providerCarrierAccountId: a.id, type: a.type, readable: a.readable ?? a.type, description: a.description ?? null, createdAt: a.created_at ?? null }));
    })());
  }

  async createCarrierAccount(req: { type: string; description?: string | null; credentials: Record<string, string>; reference?: string | null }): Promise<CarrierAccountInfo> {
    return this.wrap((async () => {
      const a = (await this.client.CarrierAccount.create({ type: req.type, description: req.description ?? undefined, reference: req.reference ?? undefined, credentials: req.credentials })) as unknown as { id: string; type: string; readable?: string; description?: string | null; created_at?: string };
      return { providerCarrierAccountId: a.id, type: a.type, readable: a.readable ?? a.type, description: a.description ?? null, createdAt: a.created_at ?? null };
    })());
  }

  async deleteCarrierAccount(providerCarrierAccountId: string): Promise<void> {
    await this.wrap(Promise.resolve(this.client.CarrierAccount.delete(providerCarrierAccountId)));
  }

  async carrierMetadata(carriers?: string[]): Promise<CarrierMetadataInfo[]> {
    return this.wrap((async () => {
      const res = (await this.client.CarrierMetadata.retrieve(carriers ?? ["usps", "ups", "fedex"], ["service_levels", "predefined_packages"])) as unknown as Array<{ name: string; service_levels?: Array<{ name: string; human_readable?: string | null; description?: string | null; max_weight?: number | null }>; predefined_packages?: Array<{ name: string; dimensions?: string[]; max_weight?: number | null }> }>;
      return res.map((c) => ({
        carrier: carrierName(c.name),
        services: (c.service_levels ?? []).map((s) => ({ code: s.name, name: s.human_readable ?? serviceName(s.name), description: s.description ?? null, maxWeightLb: s.max_weight ?? null })),
        predefinedPackages: (c.predefined_packages ?? []).map((p) => ({ code: p.name, dimensions: p.dimensions ?? [], maxWeightLb: p.max_weight ?? null })),
      }));
    })());
  }

  async createEndShipper(a: AddressInput): Promise<string> {
    return this.wrap((async () => {
      const es = (await this.client.EndShipper.create({ ...toEpAddress(a), street2: a.street2 ?? "", country: "US" })) as unknown as { id: string };
      return es.id;
    })());
  }
}

/** Shared by the pull path and the webhook path (design/TrackingFlow.dc.html). */
export function normalizeDetail(d: ITrackingDetail): TrackingEvent {
  const loc = d.tracking_location;
  const dedupeKey = createHash("sha1").update([d.status, d.datetime, d.message, loc?.city ?? ""].join("|")).digest("hex");
  const raw = d as unknown as { status_detail?: string | null };
  return {
    dedupeKey,
    status: STATUS_MAP[d.status] ?? "in_transit",
    rawStatus: d.status,
    statusDetail: raw.status_detail ?? null,
    description: d.message,
    location: loc ? { city: loc.city, state: loc.state, zip: loc.zip, country: loc.country } : undefined,
    occurredAt: new Date(d.datetime).toISOString(),
  };
}

export { trackerOf as normalizeTracker, STATUS_MAP };
export type { EpTracker };
