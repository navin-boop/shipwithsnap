import { createHash, randomUUID } from "node:crypto";
import type {
  AddressInput,
  AddressValidation,
  BuyRequest,
  CarrierAccountInfo,
  CarrierMetadataInfo,
  CarrierTypeInfo,
  ClaimRequest,
  ClaimResult,
  DeliveryEstimate,
  LabelFormatCode,
  LabelResult,
  OrderRateResult,
  ParcelInput,
  PickupRequest,
  PickupResult,
  RateQuoteResult,
  RateRequest,
  ScanFormResult,
  ShippingProvider,
  TrackerDetails,
  TrackingEvent,
} from "./provider";
import { PREDEFINED_PACKAGES } from "./options";

/**
 * Deterministic in-memory provider for local development and tests.
 * Prices follow the design prototype so the UI behaves like the canvas. Label files are SVGs.
 */
export class FakeProvider implements ShippingProvider {
  readonly name = "fake" as const;
  private pickups = new Map<string, PickupResult>();
  private claims = new Map<string, ClaimResult>();
  private accounts: CarrierAccountInfo[] = [];

  async verifyAddress(a: AddressInput): Promise<AddressValidation> {
    const errors: string[] = [];
    const intl = (a.country ?? "US") !== "US";
    if (!a.street1?.trim()) errors.push("Street is missing.");
    if (!a.city?.trim()) errors.push("City is missing.");
    if (!intl && !/^[A-Za-z]{2}$/.test(a.state ?? "")) errors.push("State should be two letters.");
    if (!intl && !/^\d{5}(-\d{4})?$/.test(a.zip ?? "")) errors.push("ZIP needs 5 digits.");
    if (errors.length) return { ok: false, errors };
    const residential = !/\b(ste|suite|fl|floor|unit|bldg)\b/i.test(`${a.street1} ${a.street2 ?? ""}`);
    return { ok: true, residential, latitude: 40.68, longitude: -73.98, timeZone: "America/New_York", address: { ...a, street1: a.street1.trim(), street2: a.street2?.trim() || null, city: a.city.trim(), state: intl ? a.state : a.state.toUpperCase(), zip: intl ? a.zip : a.zip.slice(0, 5), country: a.country ?? "US" } };
  }

  private priceList(parcel: ParcelInput, extraCents: number, intl: boolean): Array<Omit<RateQuoteResult, "providerRateId">> {
    const w = Math.min(70, Math.max(0.1, parcel.weightOz / 16));
    const cents = (d: number) => Math.round(d * 100) + extraCents;
    if (intl) {
      return [
        { carrier: "USPS", serviceCode: "FirstClassPackageInternationalService", serviceName: "First-Class Package International", priceCents: cents(14.5 + w * 4), retailCents: cents(18 + w * 5), estDays: 10, estDeliveryDate: null },
        { carrier: "USPS", serviceCode: "PriorityMailInternational", serviceName: "Priority Mail International", priceCents: cents(29 + w * 5), retailCents: cents(36 + w * 6), estDays: 7, estDeliveryDate: null },
        { carrier: "UPS", serviceCode: "Saver", serviceName: "Worldwide Saver", priceCents: cents(48 + w * 6), retailCents: cents(70 + w * 8), estDays: 3, estDeliveryDate: null },
      ];
    }
    if (parcel.predefinedPackage?.includes("FlatRate")) {
      const size = parcel.predefinedPackage.includes("Small") ? 8.05 : parcel.predefinedPackage.includes("Large") ? 20.1 : parcel.predefinedPackage.includes("Envelope") ? 8.05 : 14.75;
      return [{ carrier: "USPS", serviceCode: "Priority", serviceName: "Priority Mail Flat Rate", priceCents: cents(size), retailCents: cents(size * 1.3), estDays: 2, estDeliveryDate: null }];
    }
    const m = parcel.heightIn <= 1 ? 0.92 : 1;
    return [
      { carrier: "USPS", serviceCode: "GroundAdvantage", serviceName: "Ground Advantage", priceCents: cents((3.95 + w * 1.38) * m), retailCents: cents((4.75 + w * 2.8) * m), estDays: 3, estDeliveryDate: null },
      { carrier: "UPS", serviceCode: "GroundSaver", serviceName: "Ground Saver", priceCents: cents((4.6 + w * 1.42) * m), retailCents: cents((6.1 + w * 2.9) * m), estDays: 4, estDeliveryDate: null },
      { carrier: "FedEx", serviceCode: "SMART_POST", serviceName: "Ground Economy", priceCents: cents(4.9 + w * 1.5), retailCents: null, estDays: 4, estDeliveryDate: null },
      { carrier: "USPS", serviceCode: "Priority", serviceName: "Priority Mail", priceCents: cents(6.4 + w * 1.4), retailCents: cents(8.2 + w * 2.3), estDays: 2, estDeliveryDate: null },
      { carrier: "UPS", serviceCode: "Ground", serviceName: "Ground", priceCents: cents(7.2 + w * 1.45), retailCents: cents(9.4 + w * 2.6), estDays: 3, estDeliveryDate: null },
      { carrier: "FedEx", serviceCode: "FEDEX_GROUND", serviceName: "Ground", priceCents: cents(9.8 + w * 2.1), retailCents: null, estDays: 3, estDeliveryDate: null },
      { carrier: "UPS", serviceCode: "2ndDayAir", serviceName: "2nd Day Air", priceCents: cents(14.2 + w * 2.6), retailCents: cents(18.9 + w * 4.1), estDays: 2, estDeliveryDate: null },
    ];
  }

  private extras(req: Pick<RateRequest, "insuranceCents" | "options" | "signature">): number {
    const o = req.options;
    let extra = req.insuranceCents ? Math.max(125, Math.round(req.insuranceCents * 0.01)) : 0;
    const sig = o?.signature ?? (req.signature ? "signature" : "none");
    if (sig === "signature" || sig === "indirect") extra += 345;
    if (sig === "adult") extra += 795;
    if (o?.saturdayDelivery) extra += 1600;
    if (o?.additionalHandling) extra += 1200;
    if (o?.certifiedMail) extra += 465;
    return extra;
  }

  async rate(req: RateRequest) {
    const intl = (req.to.country ?? "US") !== "US";
    const list = this.priceList(req.parcel, this.extras(req), intl).sort((a, b) => a.priceCents - b.priceCents);
    const providerShipmentId = `fake_shp_${randomUUID().slice(0, 8)}`;
    return { providerShipmentId, rates: list.map((r) => ({ ...r, providerRateId: `fake_rate_${r.carrier}_${r.serviceCode}_${r.priceCents}` })), messages: [] };
  }

  private fakeLabel(carrier: string, service: string, seed: string, format: LabelFormatCode): Pick<LabelResult, "trackingCode" | "labelUrl"> {
    const digits = createHash("sha1").update(seed).digest("hex").replace(/\D/g, "").padEnd(18, "0").slice(0, 18);
    const trackingCode = carrier === "UPS" ? `1Z999AA1${digits.slice(0, 10)}` : carrier === "FedEx" ? digits.slice(0, 12) : `9400${digits}`;
    const body = format === "zpl"
      ? `^XA^FO50,50^A0N,40,40^FD${carrier} ${service} TEST^FS^FO50,120^A0N,30,30^FD${trackingCode}^FS^XZ`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="384" height="576" viewBox="0 0 384 576"><rect width="384" height="576" fill="#fff"/><text x="24" y="48" font-family="monospace" font-size="18" font-weight="bold">${carrier} ${service}</text><text x="24" y="80" font-family="monospace" font-size="12">TEST LABEL · not valid for postage</text><rect x="24" y="420" width="336" height="80" fill="#111"/><text x="24" y="540" font-family="monospace" font-size="16">${trackingCode}</text></svg>`;
    const mime = format === "zpl" ? "text/plain" : "image/svg+xml";
    return { trackingCode, labelUrl: `data:${mime};base64,${Buffer.from(body).toString("base64")}` };
  }

  async buy(req: BuyRequest): Promise<LabelResult> {
    const m = /^fake_rate_([A-Za-z]+)_([A-Za-z0-9_]+)_(\d+)$/.exec(req.providerRateId);
    if (!m) throw new Error("Unknown fake rate id");
    const [, carrier, service, price] = m;
    return { providerLabelId: `fake_pl_${req.providerShipmentId}`, providerTrackerId: `fake_trk_${req.providerShipmentId}`, chargedCents: Number(price), feesCents: { postage: Number(price) }, forms: [], ...this.fakeLabel(carrier, service, req.providerShipmentId, req.format) };
  }

  async void(): Promise<"submitted" | "refunded" | "rejected"> { return "refunded"; }

  async convertLabel(providerShipmentId: string, format: LabelFormatCode): Promise<string> {
    return this.fakeLabel("USPS", "GroundAdvantage", providerShipmentId, format).labelUrl;
  }

  async estimateDelivery(req: { fromZip: string; toZip: string; plannedShipDate: string; carriers?: string[] }): Promise<DeliveryEstimate[]> {
    const day = (n: number) => { const d = new Date(req.plannedShipDate + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
    return [
      { carrier: "USPS", serviceCode: "GroundAdvantage", estDeliveryDate: day(3), daysInTransit: { "50": 2, "75": 3, "85": 3, "90": 4, "95": 4, "97": 5, "99": 6 } },
      { carrier: "USPS", serviceCode: "Priority", estDeliveryDate: day(2), daysInTransit: { "50": 1, "75": 2, "85": 2, "90": 2, "95": 3, "97": 3, "99": 4 } },
      { carrier: "UPS", serviceCode: "Ground", estDeliveryDate: day(3), daysInTransit: { "50": 3, "75": 3, "85": 3, "90": 3, "95": 4, "97": 4, "99": 5 } },
    ];
  }

  async rateOrder(req: Omit<RateRequest, "parcel"> & { parcels: ParcelInput[] }) {
    const intl = (req.to.country ?? "US") !== "US";
    const per = req.parcels.map((p) => this.priceList(p, this.extras(req), intl));
    const byService = new Map<string, OrderRateResult>();
    for (const list of per) for (const r of list) {
      const k = `${r.carrier}|${r.serviceCode}`;
      const cur = byService.get(k);
      byService.set(k, cur ? { ...cur, priceCents: cur.priceCents + r.priceCents, retailCents: cur.retailCents !== null && r.retailCents !== null ? cur.retailCents + r.retailCents : null } : { carrier: r.carrier, serviceCode: r.serviceCode, serviceName: r.serviceName, priceCents: r.priceCents, retailCents: r.retailCents, estDays: r.estDays, estDeliveryDate: null });
    }
    // Only services every parcel could get
    const rates = [...byService.values()].filter((r) => per.every((l) => l.some((x) => x.carrier === r.carrier && x.serviceCode === r.serviceCode))).sort((a, b) => a.priceCents - b.priceCents);
    return { providerOrderId: `fake_order_${randomUUID().slice(0, 8)}:${req.parcels.length}`, rates, messages: [] };
  }

  async buyOrder(providerOrderId: string, carrier: string, serviceCode: string, format: LabelFormatCode) {
    const n = Number(providerOrderId.split(":")[1] ?? 1);
    return Array.from({ length: n }, (_, i) => ({ providerShipmentId: `${providerOrderId}_s${i}`, parcelIndex: i, providerLabelId: `fake_pl_${providerOrderId}_${i}`, providerTrackerId: `fake_trk_${providerOrderId}_${i}`, chargedCents: 0, feesCents: {}, forms: [], ...this.fakeLabel(carrier, serviceCode, `${providerOrderId}_${i}`, format) }));
  }

  async track(): Promise<TrackingEvent[]> { return []; }

  async trackerDetails(providerTrackerId: string): Promise<TrackerDetails> {
    return { providerTrackerId, trackingCode: "9400000000000000000000", carrier: "USPS", status: "in_transit", rawStatus: "in_transit", statusDetail: "in_transit", estDeliveryDate: null, signedBy: null, carrierWeightOz: null, serviceName: "Ground Advantage", publicUrl: null, events: [] };
  }

  async createTracker(trackingCode: string, carrier?: string | null): Promise<TrackerDetails> {
    const now = Date.now();
    const ev = (status: TrackingEvent["status"], raw: string, msg: string, hoursAgo: number, city: string): TrackingEvent => ({ dedupeKey: createHash("sha1").update(`${trackingCode}|${raw}|${hoursAgo}`).digest("hex"), status, rawStatus: raw, statusDetail: raw, description: msg, location: { city, state: "NY", zip: "11201" }, occurredAt: new Date(now - hoursAgo * 3600_000).toISOString() });
    return { providerTrackerId: `fake_trk_${trackingCode}`, trackingCode, carrier: carrier ?? "USPS", status: "in_transit", rawStatus: "in_transit", statusDetail: "departed_facility", estDeliveryDate: new Date(now + 2 * 86400_000).toISOString().slice(0, 10), signedBy: null, carrierWeightOz: 29, serviceName: "Ground Advantage", publicUrl: null, events: [ev("in_transit", "in_transit", "Departed USPS regional facility", 5, "Brooklyn"), ev("accepted", "pre_transit", "Accepted at USPS origin facility", 20, "Brooklyn"), ev("label_created", "pre_transit", "Shipping label created", 26, "Brooklyn")] };
  }

  async createPickup(req: PickupRequest): Promise<PickupResult> {
    const id = `fake_pickup_${randomUUID().slice(0, 8)}`;
    const r: PickupResult = { providerPickupId: id, status: "unknown", confirmation: null, rates: [{ carrier: "USPS", serviceCode: "NextDay", priceCents: 0 }, { carrier: "UPS", serviceCode: "Same-day Pickup", priceCents: 700 }, { carrier: "FedEx", serviceCode: "Same Day", priceCents: 500 }], messages: req.instructions ? [] : [] };
    this.pickups.set(id, r);
    return r;
  }
  async buyPickup(id: string): Promise<PickupResult> {
    const p = { ...(this.pickups.get(id) ?? { providerPickupId: id, status: "unknown" as const, confirmation: null, rates: [], messages: [] }), status: "scheduled" as const, confirmation: `WTC${Date.now().toString().slice(-8)}` };
    this.pickups.set(id, p);
    return p;
  }
  async cancelPickup(id: string): Promise<PickupResult> {
    const p = { ...(this.pickups.get(id) ?? { providerPickupId: id, status: "unknown" as const, confirmation: null, rates: [], messages: [] }), status: "canceled" as const };
    this.pickups.set(id, p);
    return p;
  }

  async createScanForm(providerShipmentIds: string[]): Promise<ScanFormResult> {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="612" height="792"><rect width="612" height="792" fill="#fff"/><text x="40" y="60" font-family="monospace" font-size="20" font-weight="bold">USPS SCAN FORM (TEST)</text><text x="40" y="100" font-family="monospace" font-size="14">${providerShipmentIds.length} packages</text><rect x="40" y="140" width="300" height="100" fill="#111"/></svg>`;
    return { providerScanFormId: `fake_sf_${randomUUID().slice(0, 8)}`, status: "created", formUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`, trackingCodes: providerShipmentIds.map((s) => `9400${createHash("sha1").update(s).digest("hex").replace(/\D/g, "").padEnd(18, "0").slice(0, 18)}`), message: null };
  }
  async getScanForm(id: string): Promise<ScanFormResult> { return this.createScanForm([id]); }

  async createClaim(req: ClaimRequest): Promise<ClaimResult> {
    const c: ClaimResult = { providerClaimId: `fake_clm_${randomUUID().slice(0, 8)}`, status: "submitted", statusDetail: null, requestedCents: req.amountCents, approvedCents: null, insuredCents: 10_000, history: [{ status: "submitted", at: new Date().toISOString() }] };
    this.claims.set(c.providerClaimId, c);
    return c;
  }
  async getClaim(id: string): Promise<ClaimResult> { return this.claims.get(id) ?? { providerClaimId: id, status: "in_review", statusDetail: null, requestedCents: 0, approvedCents: null, insuredCents: null, history: [] }; }
  async cancelClaim(id: string): Promise<ClaimResult> { const c = { ...(await this.getClaim(id)), status: "cancelled" }; this.claims.set(id, c); return c; }

  async listCarrierTypes(): Promise<CarrierTypeInfo[]> {
    return [
      { type: "UpsAccount", readable: "UPS", customWorkflow: true, credentials: [{ name: "account_number", label: "UPS account number", secret: false }] },
      { type: "FedexAccount", readable: "FedEx", customWorkflow: true, credentials: [{ name: "account_number", label: "FedEx account number", secret: false }] },
      { type: "DhlExpressAccount", readable: "DHL Express", customWorkflow: false, credentials: [{ name: "site_id", label: "Site ID", secret: false }, { name: "password", label: "Password", secret: true }, { name: "account_number", label: "Account number", secret: false }] },
    ];
  }
  async listCarrierAccounts(): Promise<CarrierAccountInfo[]> { return this.accounts; }
  async createCarrierAccount(req: { type: string; description?: string | null; credentials: Record<string, string> }): Promise<CarrierAccountInfo> {
    const a: CarrierAccountInfo = { providerCarrierAccountId: `fake_ca_${randomUUID().slice(0, 8)}`, type: req.type, readable: req.type.replace(/Account$/, ""), description: req.description ?? null, createdAt: new Date().toISOString() };
    this.accounts.push(a);
    return a;
  }
  async deleteCarrierAccount(id: string): Promise<void> { this.accounts = this.accounts.filter((a) => a.providerCarrierAccountId !== id); }

  async carrierMetadata(carriers?: string[]): Promise<CarrierMetadataInfo[]> {
    const all: CarrierMetadataInfo[] = [
      { carrier: "USPS", services: [{ code: "GroundAdvantage", name: "Ground Advantage", description: "2–5 business days", maxWeightLb: 70 }, { code: "Priority", name: "Priority Mail", description: "1–3 business days", maxWeightLb: 70 }, { code: "Express", name: "Priority Mail Express", description: "Overnight to 2 days", maxWeightLb: 70 }, { code: "MediaMail", name: "Media Mail", description: "2–8 business days", maxWeightLb: 70 }], predefinedPackages: PREDEFINED_PACKAGES.USPS.map((p) => ({ code: p.code, dimensions: p.hint ? [p.hint] : [], maxWeightLb: 70 })) },
      { carrier: "UPS", services: [{ code: "GroundSaver", name: "Ground Saver", description: "2–7 business days", maxWeightLb: 150 }, { code: "Ground", name: "Ground", description: "1–5 business days", maxWeightLb: 150 }, { code: "2ndDayAir", name: "2nd Day Air", description: "2 business days", maxWeightLb: 150 }, { code: "NextDayAir", name: "Next Day Air", description: "Next business day", maxWeightLb: 150 }], predefinedPackages: PREDEFINED_PACKAGES.UPS.map((p) => ({ code: p.code, dimensions: [], maxWeightLb: null })) },
      { carrier: "FedEx", services: [{ code: "SMART_POST", name: "Ground Economy", description: "2–7 business days", maxWeightLb: 70 }, { code: "FEDEX_GROUND", name: "Ground", description: "1–5 business days", maxWeightLb: 150 }, { code: "FEDEX_2_DAY", name: "2Day", description: "2 business days", maxWeightLb: 150 }], predefinedPackages: PREDEFINED_PACKAGES.FedEx.map((p) => ({ code: p.code, dimensions: [], maxWeightLb: null })) },
    ];
    return carriers?.length ? all.filter((c) => carriers.map((x) => x.toLowerCase()).includes(c.carrier.toLowerCase())) : all;
  }

  async createEndShipper(): Promise<string> { return `fake_es_${randomUUID().slice(0, 8)}`; }
}
