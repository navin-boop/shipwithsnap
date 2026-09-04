import { createHash, randomUUID } from "node:crypto";
import type {
  AddressInput,
  AddressValidation,
  BuyRequest,
  LabelResult,
  RateQuoteResult,
  RateRequest,
  ShippingProvider,
  TrackingEvent,
} from "./provider";

/**
 * Deterministic in-memory provider for local development and tests.
 * Prices follow the same curves as the design prototype (design/Main.dc.html) so the UI
 * behaves the way the canvas does. Label files are generated SVGs.
 */
export class FakeProvider implements ShippingProvider {
  readonly name = "fake" as const;

  async verifyAddress(a: AddressInput): Promise<AddressValidation> {
    const errors: string[] = [];
    if (!a.street1?.trim()) errors.push("Street is missing.");
    if (!a.city?.trim()) errors.push("City is missing.");
    if (!/^[A-Za-z]{2}$/.test(a.state ?? "")) errors.push("State should be two letters.");
    if (!/^\d{5}(-\d{4})?$/.test(a.zip ?? "")) errors.push("ZIP needs 5 digits.");
    if (errors.length) return { ok: false, errors };
    const residential = !/\b(ste|suite|fl|floor|unit|bldg)\b/i.test(`${a.street1} ${a.street2 ?? ""}`);
    return {
      ok: true,
      residential,
      address: {
        ...a,
        street1: a.street1.trim(),
        street2: a.street2?.trim() || null,
        city: a.city.trim(),
        state: a.state.toUpperCase(),
        zip: a.zip.slice(0, 5),
        country: a.country ?? "US",
      },
    };
  }

  async rate(req: RateRequest): Promise<{ providerShipmentId: string; rates: RateQuoteResult[] }> {
    const w = Math.min(70, Math.max(0.1, req.parcel.weightOz / 16));
    // Insurance is ~1% of the insured value (min $1.25); signature is a flat carrier fee.
    const extra = (req.insuranceCents ? Math.max(125, Math.round(req.insuranceCents * 0.01)) : 0) + (req.signature ? 345 : 0);
    const cents = (dollars: number) => Math.round(dollars * 100);
    let list: Array<Omit<RateQuoteResult, "providerRateId">>;
    if (req.parcel.predefinedPackage?.includes("FlatRate")) {
      list = [
        { carrier: "USPS", serviceCode: "Priority", serviceName: "Priority Flat Rate Small", priceCents: cents(8.05), retailCents: cents(10.4), estDays: 2, estDeliveryDate: null },
        { carrier: "USPS", serviceCode: "Priority", serviceName: "Priority Flat Rate Medium", priceCents: cents(14.75), retailCents: cents(18.4), estDays: 2, estDeliveryDate: null },
      ];
    } else {
      const m = req.parcel.heightIn <= 1 ? 0.92 : 1; // mailers rate a little lower
      list = [
        { carrier: "USPS", serviceCode: "GroundAdvantage", serviceName: "Ground Advantage", priceCents: cents((3.95 + w * 1.38) * m), retailCents: cents((4.75 + w * 2.8) * m), estDays: 3, estDeliveryDate: null },
        { carrier: "UPS", serviceCode: "GroundSaver", serviceName: "Ground Saver", priceCents: cents((4.6 + w * 1.42) * m), retailCents: cents((6.1 + w * 2.9) * m), estDays: 4, estDeliveryDate: null },
        { carrier: "USPS", serviceCode: "Priority", serviceName: "Priority Mail", priceCents: cents(6.4 + w * 1.4), retailCents: cents(8.2 + w * 2.3), estDays: 2, estDeliveryDate: null },
        { carrier: "UPS", serviceCode: "Ground", serviceName: "Ground", priceCents: cents(7.2 + w * 1.45), retailCents: cents(9.4 + w * 2.6), estDays: 3, estDeliveryDate: null },
        { carrier: "UPS", serviceCode: "2ndDayAir", serviceName: "2nd Day Air", priceCents: cents(14.2 + w * 2.6), retailCents: cents(18.9 + w * 4.1), estDays: 2, estDeliveryDate: null },
      ];
    }
    const providerShipmentId = `fake_shp_${randomUUID().slice(0, 8)}`;
    const rates = list.map((r) => {
      const priceCents = r.priceCents + extra;
      const retailCents = (r.retailCents ?? 0) + extra;
      // Price rides in the id so buy() can be stateless.
      return { ...r, priceCents, retailCents, providerRateId: `fake_rate_${r.carrier}_${r.serviceCode}_${priceCents}` };
    });
    return { providerShipmentId, rates };
  }

  async buy(req: BuyRequest): Promise<LabelResult> {
    const m = /^fake_rate_([A-Z]+)_([A-Za-z0-9]+)_(\d+)$/.exec(req.providerRateId);
    if (!m) throw new Error("Unknown fake rate id");
    const [, carrier, service, price] = m;
    const digits = createHash("sha1").update(req.providerShipmentId).digest("hex").replace(/\D/g, "").padEnd(18, "0").slice(0, 18);
    const trackingCode = carrier === "UPS" ? `1Z999AA1${digits.slice(0, 10)}` : `9400${digits}`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="384" height="576" viewBox="0 0 384 576"><rect width="384" height="576" fill="#fff"/><text x="24" y="48" font-family="monospace" font-size="18" font-weight="bold">${carrier} ${service}</text><text x="24" y="80" font-family="monospace" font-size="12">TEST LABEL · not valid for postage</text><text x="24" y="140" font-family="monospace" font-size="12">${req.providerShipmentId}</text><rect x="24" y="420" width="336" height="80" fill="#111"/><text x="24" y="540" font-family="monospace" font-size="16">${trackingCode}</text></svg>`;
    return {
      providerLabelId: `fake_pl_${req.providerShipmentId}`,
      providerTrackerId: `fake_trk_${req.providerShipmentId}`,
      trackingCode,
      labelUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
      chargedCents: Number(price),
    };
  }

  async void(): Promise<"submitted" | "refunded" | "rejected"> {
    return "refunded";
  }

  async track(): Promise<TrackingEvent[]> {
    return [];
  }
}
