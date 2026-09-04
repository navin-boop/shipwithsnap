// Spec: design/CarrierAdapter.dc.html — the ShippingProvider seam.
// Product code only ever imports from "@/lib/shipping"; nothing else knows about EasyPost.

export type AddressInput = {
  name?: string | null;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  street1: string;
  street2?: string | null;
  city: string;
  state: string;
  zip: string;
  country?: string;
};

export type AddressValidation = {
  ok: boolean;
  /** Corrected / normalised address when ok. */
  address?: AddressInput;
  residential?: boolean | null;
  /** Human-readable reasons when not ok. */
  errors?: string[];
};

export type ParcelInput = {
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  weightOz: number;
  predefinedPackage?: string;
};

export type LabelFormatCode = "pdf_4x6" | "pdf_letter" | "zpl";

export type RateRequest = {
  /** Our shipment id, stored on the provider shipment as `reference`. */
  reference: string;
  to: AddressInput;
  from: AddressInput;
  parcel: ParcelInput;
  format: LabelFormatCode;
  insuranceCents?: number;
  signature?: boolean;
  /** Customer-owned carrier account ids, when any. */
  carrierAccountIds?: string[];
};

export type RateQuoteResult = {
  providerRateId: string;
  carrier: string; // "USPS" | "UPS" | …
  serviceCode: string; // provider service code, e.g. "GroundAdvantage"
  serviceName: string; // display name, e.g. "Ground Advantage"
  priceCents: number; // what we are billed
  retailCents: number | null; // the strike-through
  estDays: number | null;
  estDeliveryDate: string | null; // ISO date
};

export type BuyRequest = {
  providerShipmentId: string;
  providerRateId: string;
  insuranceCents?: number;
  format: LabelFormatCode;
};

export type LabelResult = {
  providerLabelId: string;
  providerTrackerId: string | null;
  trackingCode: string;
  /** Provider-hosted file; fetched once and stored in our bucket. */
  labelUrl: string;
  chargedCents: number;
};

export type CanonicalStatus =
  | "label_created"
  | "accepted"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "exception"
  | "returned";

export type TrackingEvent = {
  /** Stable key for idempotent upserts — provider details carry no id, so we hash them. */
  dedupeKey: string;
  status: CanonicalStatus;
  rawStatus: string;
  description: string;
  location?: { city?: string; state?: string; zip?: string };
  occurredAt: string; // ISO 8601 UTC
};

export interface ShippingProvider {
  readonly name: "easypost" | "fake";

  verifyAddress(a: AddressInput): Promise<AddressValidation>;

  /** Creates the provider shipment and returns every rate on it. */
  rate(req: RateRequest): Promise<{ providerShipmentId: string; rates: RateQuoteResult[] }>;

  /**
   * Buys one rate. Idempotent: if the provider shipment already has a label,
   * returns it instead of buying twice.
   */
  buy(req: BuyRequest): Promise<LabelResult>;

  /** Requests a refund; resolves with the provider's refund status. */
  void(providerShipmentId: string): Promise<"submitted" | "refunded" | "rejected">;

  /** Pull path for stale trackers. */
  track(providerTrackerId: string): Promise<TrackingEvent[]>;
}

export class ProviderError extends Error {
  constructor(
    public readonly code:
      | "address_invalid"
      | "rate_expired"
      | "provider_unavailable"
      | "already_labeled"
      | "unknown",
    message: string,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
