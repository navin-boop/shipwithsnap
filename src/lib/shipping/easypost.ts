import { createHash } from "node:crypto";
import EasyPostClient, { type IRate, type ITrackingDetail } from "@easypost/api";
import {
  ProviderError,
  type AddressInput,
  type AddressValidation,
  type BuyRequest,
  type CanonicalStatus,
  type LabelFormatCode,
  type LabelResult,
  type RateQuoteResult,
  type RateRequest,
  type ShippingProvider,
  type TrackingEvent,
} from "./provider";

// Spec: design/CarrierAdapter.dc.html ("EasyPost integration").
// Uses the SDK's static resource methods on a client instance: client.Shipment.create / buy / refund,
// client.Address.create with verify, client.Tracker.retrieve.

// EasyPost reports the carrier *account* type ("USPS", "UPSDAP", "FedExDefault"); show the carrier.
const CARRIER_NAMES: Record<string, string> = {
  USPS: "USPS",
  UPS: "UPS",
  UPSDAP: "UPS",
  UPSSurePost: "UPS",
  FedEx: "FedEx",
  FedExDefault: "FedEx",
  FedExSmartPost: "FedEx",
  DHLExpress: "DHL",
};

function carrierName(account: string): string {
  return CARRIER_NAMES[account] ?? account.replace(/(Default|DAP)$/i, "");
}

const SERVICE_NAMES: Record<string, string> = {
  // FedEx
  FEDEX_GROUND: "Ground",
  GROUND_HOME_DELIVERY: "Home Delivery",
  SMART_POST: "Ground Economy",
  FEDEX_EXPRESS_SAVER: "Express Saver",
  FEDEX_2_DAY: "2Day",
  FEDEX_2_DAY_AM: "2Day A.M.",
  STANDARD_OVERNIGHT: "Standard Overnight",
  PRIORITY_OVERNIGHT: "Priority Overnight",
  FIRST_OVERNIGHT: "First Overnight",
  // USPS / UPS
  GroundAdvantage: "Ground Advantage",
  Priority: "Priority Mail",
  Express: "Priority Mail Express",
  First: "First-Class",
  ParcelSelect: "Parcel Select",
  MediaMail: "Media Mail",
  Ground: "Ground",
  GroundSaver: "Ground Saver",
  "3DaySelect": "3 Day Select",
  "2ndDayAir": "2nd Day Air",
  "2ndDayAirAM": "2nd Day Air A.M.",
  NextDayAir: "Next Day Air",
  NextDayAirSaver: "Next Day Air Saver",
  NextDayAirEarlyAM: "Next Day Air Early",
};

function serviceName(code: string): string {
  if (SERVICE_NAMES[code]) return SERVICE_NAMES[code];
  if (code.includes("_")) {
    return code
      .toLowerCase()
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return code.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function toCents(amount: string | number | null | undefined): number | null {
  if (amount === null || amount === undefined || amount === "") return null;
  return Math.round(Number(amount) * 100);
}

function labelOptions(format: LabelFormatCode): Record<string, string> {
  // EasyPost renders 4x6 by default. Letter-size PDFs are carrier-dependent; we request
  // 8.5x11 where supported and fall back to 4x6 otherwise.
  switch (format) {
    case "zpl":
      return { label_format: "ZPL", label_size: "4x6" };
    case "pdf_letter":
      return { label_format: "PDF", label_size: "8.5x11" };
    default:
      return { label_format: "PDF", label_size: "4x6" };
  }
}

function toEpAddress(a: AddressInput) {
  return {
    name: a.name ?? undefined,
    company: a.company ?? undefined,
    phone: a.phone ?? undefined,
    email: a.email ?? undefined,
    street1: a.street1,
    street2: a.street2 ?? undefined,
    city: a.city,
    state: a.state,
    zip: a.zip,
    country: a.country ?? "US",
  };
}

const STATUS_MAP: Record<string, CanonicalStatus> = {
  pre_transit: "label_created",
  in_transit: "in_transit",
  out_for_delivery: "out_for_delivery",
  delivered: "delivered",
  available_for_pickup: "out_for_delivery",
  return_to_sender: "returned",
  failure: "exception",
  cancelled: "exception",
  error: "exception",
  unknown: "label_created",
};

function mapEasyPostError(err: unknown): ProviderError {
  const e = err as { statusCode?: number; status?: number; message?: string; code?: string };
  const status = e.statusCode ?? e.status ?? 0;
  const message = e.message ?? "EasyPost request failed";
  if (status === 422 && /address/i.test(message)) return new ProviderError("address_invalid", message);
  if (status >= 500 || status === 0) return new ProviderError("provider_unavailable", message, true);
  if (status === 429) return new ProviderError("provider_unavailable", "Rate limited by EasyPost", true);
  return new ProviderError("unknown", message);
}

export class EasyPostProvider implements ShippingProvider {
  readonly name = "easypost" as const;
  private client: InstanceType<typeof EasyPostClient>;

  constructor(apiKey: string) {
    this.client = new EasyPostClient(apiKey, { timeout: 10_000 });
  }

  async verifyAddress(a: AddressInput): Promise<AddressValidation> {
    try {
      const res = await this.client.Address.create({ ...toEpAddress(a), verify: ["delivery"] });
      const v = res.verifications?.delivery;
      if (v && !v.success) {
        return { ok: false, errors: v.errors.map((e: { message: string }) => e.message) };
      }
      return {
        ok: true,
        residential: res.residential ?? null,
        address: {
          name: res.name ?? a.name ?? null,
          company: res.company ?? a.company ?? null,
          phone: res.phone ?? a.phone ?? null,
          email: res.email ?? a.email ?? null,
          street1: res.street1 ?? a.street1,
          street2: res.street2 ?? null,
          city: res.city ?? a.city,
          state: res.state ?? a.state,
          zip: res.zip ?? a.zip,
          country: res.country ?? "US",
        },
      };
    } catch (err) {
      throw mapEasyPostError(err);
    }
  }

  async rate(req: RateRequest): Promise<{ providerShipmentId: string; rates: RateQuoteResult[] }> {
    try {
      const shipment = await this.client.Shipment.create({
        reference: req.reference,
        to_address: toEpAddress(req.to),
        from_address: toEpAddress(req.from),
        parcel: {
          length: req.parcel.lengthIn,
          width: req.parcel.widthIn,
          height: req.parcel.heightIn,
          weight: req.parcel.weightOz,
          predefined_package: req.parcel.predefinedPackage,
        },
        options: {
          ...labelOptions(req.format),
          ...(req.signature ? { delivery_confirmation: "SIGNATURE" } : {}),
        },
        ...(req.carrierAccountIds?.length ? { carrier_accounts: req.carrierAccountIds } : {}),
      });
      const rates: RateQuoteResult[] = ((shipment.rates ?? []) as IRate[]).map((r) => ({
        providerRateId: r.id,
        carrier: carrierName(r.carrier),
        serviceCode: r.service,
        serviceName: serviceName(r.service),
        priceCents: toCents(r.rate) ?? 0,
        retailCents: toCents(r.retail_rate),
        estDays: r.delivery_days ?? null,
        estDeliveryDate: r.delivery_date ? r.delivery_date.slice(0, 10) : null,
      }));
      return { providerShipmentId: shipment.id, rates };
    } catch (err) {
      throw mapEasyPostError(err);
    }
  }

  async buy(req: BuyRequest): Promise<LabelResult> {
    try {
      // Idempotency: EasyPost has no key header on buy, so check for an existing label first.
      const existing = await this.client.Shipment.retrieve(req.providerShipmentId);
      const bought = existing.postage_label
        ? existing
        : await this.client.Shipment.buy(
            req.providerShipmentId,
            req.providerRateId,
            req.insuranceCents ? req.insuranceCents / 100 : undefined,
          );
      const label = bought.postage_label;
      const url =
        req.format === "zpl"
          ? label.label_zpl_url || label.label_url
          : label.label_pdf_url || label.label_url;
      const rate = bought.selected_rate as IRate | undefined;
      return {
        providerLabelId: label.id,
        providerTrackerId: bought.tracker?.id ?? null,
        trackingCode: bought.tracking_code,
        labelUrl: url,
        chargedCents: toCents(rate?.rate) ?? 0,
      };
    } catch (err) {
      throw mapEasyPostError(err);
    }
  }

  async void(providerShipmentId: string): Promise<"submitted" | "refunded" | "rejected"> {
    try {
      const s = await this.client.Shipment.refund(providerShipmentId);
      return s.refund_status ?? "submitted";
    } catch (err) {
      throw mapEasyPostError(err);
    }
  }

  async track(providerTrackerId: string): Promise<TrackingEvent[]> {
    try {
      const t = await this.client.Tracker.retrieve(providerTrackerId);
      return ((t.tracking_details ?? []) as ITrackingDetail[]).map(normalizeDetail);
    } catch (err) {
      throw mapEasyPostError(err);
    }
  }
}

/** Shared by the pull path and the webhook path (design/TrackingFlow.dc.html). */
export function normalizeDetail(d: ITrackingDetail): TrackingEvent {
  const loc = d.tracking_location;
  const dedupeKey = createHash("sha1")
    .update([d.status, d.datetime, d.message, loc?.city ?? ""].join("|"))
    .digest("hex");
  return {
    dedupeKey,
    status: STATUS_MAP[d.status] ?? "in_transit",
    rawStatus: d.status,
    description: d.message,
    location: loc ? { city: loc.city, state: loc.state, zip: loc.zip } : undefined,
    occurredAt: new Date(d.datetime).toISOString(),
  };
}
