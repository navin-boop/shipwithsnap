// Spec: design/CarrierAdapter.dc.html — the ShippingProvider seam.
// Product code only ever imports from "@/lib/shipping"; nothing else knows about EasyPost.
// This covers the EasyPost surface a Pirate-Ship-style product uses: addresses, rates, labels,
// options, customs, returns, multi-parcel orders, insurance + claims, trackers, pickups,
// scan forms (manifests), SmartRate delivery estimates, carrier accounts, metadata, end shippers.

import type { ClaimType, SignatureLevel } from "./options";

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
  residential?: boolean | null;
};

export type AddressValidation = {
  ok: boolean;
  address?: AddressInput;
  residential?: boolean | null;
  /** From delivery verification details when available. */
  latitude?: number | null;
  longitude?: number | null;
  timeZone?: string | null;
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

/** Every shipment option we expose. Names are ours; easypost.ts maps them to EasyPost's. */
export type ShipmentOptions = {
  signature?: SignatureLevel;
  saturdayDelivery?: boolean;
  holdForPickup?: boolean;
  machinable?: boolean;
  additionalHandling?: boolean;
  /** YYYY-MM-DD — the date printed on the label / when it enters the mailstream. */
  labelDate?: string;
  /** Printed on the label — order number, SKU, anything. */
  printCustom1?: string;
  printCustom2?: string;
  invoiceNumber?: string;
  handlingInstructions?: string;
  contentDescription?: string;
  endorsement?: string;
  hazmat?: string;
  dryIce?: boolean;
  dryIceWeightOz?: number;
  alcohol?: boolean;
  perishable?: boolean;
  certifiedMail?: boolean;
  registeredMail?: boolean;
  returnReceipt?: boolean;
  specialRatesEligibility?: string;
  carbonNeutral?: boolean;
  deliveryMaxDatetime?: string;
  /** Carrier email/SMS notifications to the recipient. */
  carrierNotificationEmail?: string;
  carrierNotificationSms?: string;
};

export type CustomsItemInput = {
  description: string;
  quantity: number;
  valueCents: number;
  weightOz: number;
  hsTariffNumber?: string | null;
  originCountry: string;
  code?: string | null;
};

export type CustomsInput = {
  contentsType: string;
  contentsExplanation?: string | null;
  customsCertify: boolean;
  customsSigner: string;
  eelPfc: string;
  nonDeliveryOption: "return" | "abandon";
  restrictionType: string;
  restrictionComments?: string | null;
  declaration?: string | null;
  incoterm?: string | null;
  items: CustomsItemInput[];
};

export type RateRequest = {
  /** Our shipment id, stored on the provider shipment as `reference`. */
  reference: string;
  to: AddressInput;
  from: AddressInput;
  parcel: ParcelInput;
  format: LabelFormatCode;
  /** Declared value to insure, in cents (0 / undefined = none). */
  insuranceCents?: number;
  options?: ShipmentOptions;
  customs?: CustomsInput | null;
  /** Return label: the parcel travels from `to` back to `from`. */
  isReturn?: boolean;
  /** Customer-owned carrier account ids, when any. */
  carrierAccountIds?: string[];
  /** @deprecated use options.signature */
  signature?: boolean;
};

export type RateQuoteResult = {
  providerRateId: string;
  carrier: string;
  serviceCode: string;
  serviceName: string;
  priceCents: number;
  retailCents: number | null;
  estDays: number | null;
  estDeliveryDate: string | null;
  deliveryDateGuaranteed?: boolean;
  carrierAccountId?: string | null;
};

export type BuyRequest = {
  providerShipmentId: string;
  providerRateId: string;
  insuranceCents?: number;
  format: LabelFormatCode;
  endShipperId?: string | null;
};

export type LabelResult = {
  providerLabelId: string;
  providerTrackerId: string | null;
  trackingCode: string;
  labelUrl: string;
  chargedCents: number;
  /** Fees EasyPost attached (postage, insurance, label…). */
  feesCents?: Record<string, number>;
  /** Customs / commercial invoice forms when generated. */
  forms?: Array<{ type: string; url: string }>;
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
  dedupeKey: string;
  status: CanonicalStatus;
  rawStatus: string;
  statusDetail?: string | null;
  description: string;
  location?: { city?: string; state?: string; zip?: string; country?: string };
  occurredAt: string;
};

export type TrackerDetails = {
  providerTrackerId: string;
  trackingCode: string;
  carrier: string;
  status: CanonicalStatus;
  rawStatus: string;
  statusDetail: string | null;
  estDeliveryDate: string | null;
  signedBy: string | null;
  carrierWeightOz: number | null;
  serviceName: string | null;
  publicUrl: string | null;
  events: TrackingEvent[];
};

/** Multi-parcel (EasyPost Order): one rate per carrier+service covering every box. */
export type OrderRateResult = {
  carrier: string;
  serviceCode: string;
  serviceName: string;
  priceCents: number;
  retailCents: number | null;
  estDays: number | null;
  estDeliveryDate: string | null;
};

export type DeliveryEstimate = {
  carrier: string;
  serviceCode: string;
  estDeliveryDate: string | null;
  /** Days in transit at each confidence percentile (50…99). */
  daysInTransit: Partial<Record<"50" | "75" | "85" | "90" | "95" | "97" | "99", number>>;
};

export type PickupRequest = {
  address: AddressInput;
  providerShipmentId?: string;
  providerBatchId?: string;
  minDatetime: string; // ISO
  maxDatetime: string; // ISO
  instructions?: string | null;
  reference?: string | null;
  carrierAccountIds?: string[];
};

export type PickupResult = {
  providerPickupId: string;
  status: "unknown" | "scheduled" | "canceled";
  confirmation: string | null;
  rates: Array<{ carrier: string; serviceCode: string; priceCents: number }>;
  messages: string[];
};

export type ScanFormResult = {
  providerScanFormId: string;
  status: "creating" | "created" | "failed";
  formUrl: string | null;
  trackingCodes: string[];
  message: string | null;
};

export type ClaimRequest = {
  trackingCode: string;
  type: ClaimType;
  amountCents: number;
  description: string;
  contactEmail: string;
  recipientName?: string | null;
  reference?: string | null;
  /** Base64 file contents. Supporting docs are required for damage/theft. */
  attachments?: { evidence?: string[]; invoices?: string[]; supporting?: string[] };
};

export type ClaimResult = {
  providerClaimId: string;
  status: string;
  statusDetail: string | null;
  requestedCents: number;
  approvedCents: number | null;
  insuredCents: number | null;
  history: Array<{ status: string; statusDetail?: string | null; at: string }>;
};

export type CarrierTypeInfo = {
  type: string;
  readable: string;
  customWorkflow: boolean;
  /** Credential field names and labels, in order. */
  credentials: Array<{ name: string; label: string; secret: boolean }>;
};

export type CarrierAccountInfo = {
  providerCarrierAccountId: string;
  type: string;
  readable: string;
  description: string | null;
  createdAt: string | null;
};

export type CarrierMetadataInfo = {
  carrier: string;
  services: Array<{ code: string; name: string; description: string | null; maxWeightLb: number | null }>;
  predefinedPackages: Array<{ code: string; dimensions: string[]; maxWeightLb: number | null }>;
};

export interface ShippingProvider {
  readonly name: "easypost" | "fake";

  verifyAddress(a: AddressInput): Promise<AddressValidation>;

  /** Creates the provider shipment and returns every rate on it. */
  rate(req: RateRequest): Promise<{ providerShipmentId: string; rates: RateQuoteResult[]; messages?: string[] }>;

  /** Buys one rate. Idempotent per provider shipment. */
  buy(req: BuyRequest): Promise<LabelResult>;

  /** Requests a refund; resolves with the provider's refund status. */
  void(providerShipmentId: string): Promise<"submitted" | "refunded" | "rejected">;

  /** Re-render an existing label in another format. */
  convertLabel(providerShipmentId: string, format: LabelFormatCode): Promise<string>;

  /** SmartRate: expected delivery per carrier/service for a ZIP pair on a ship date (US only). */
  estimateDelivery(req: { fromZip: string; toZip: string; plannedShipDate: string; carriers?: string[] }): Promise<DeliveryEstimate[]>;

  /** Multi-parcel: one order, one buy, N labels. */
  rateOrder(req: Omit<RateRequest, "parcel"> & { parcels: ParcelInput[] }): Promise<{ providerOrderId: string; rates: OrderRateResult[]; messages?: string[] }>;
  buyOrder(providerOrderId: string, carrier: string, serviceCode: string, format: LabelFormatCode): Promise<Array<LabelResult & { providerShipmentId: string; parcelIndex: number }>>;

  /** Pull path for stale trackers (events only). */
  track(providerTrackerId: string): Promise<TrackingEvent[]>;
  /** Full tracker read, also used for standalone tracking. */
  trackerDetails(providerTrackerId: string): Promise<TrackerDetails>;
  /** Track any package, ours or not. */
  createTracker(trackingCode: string, carrier?: string | null): Promise<TrackerDetails>;

  createPickup(req: PickupRequest): Promise<PickupResult>;
  buyPickup(providerPickupId: string, carrier: string, serviceCode: string): Promise<PickupResult>;
  cancelPickup(providerPickupId: string): Promise<PickupResult>;

  createScanForm(providerShipmentIds: string[]): Promise<ScanFormResult>;
  getScanForm(providerScanFormId: string): Promise<ScanFormResult>;

  createClaim(req: ClaimRequest): Promise<ClaimResult>;
  getClaim(providerClaimId: string): Promise<ClaimResult>;
  cancelClaim(providerClaimId: string): Promise<ClaimResult>;

  listCarrierTypes(): Promise<CarrierTypeInfo[]>;
  listCarrierAccounts(): Promise<CarrierAccountInfo[]>;
  createCarrierAccount(req: { type: string; description?: string | null; credentials: Record<string, string>; reference?: string | null }): Promise<CarrierAccountInfo>;
  deleteCarrierAccount(providerCarrierAccountId: string): Promise<void>;

  carrierMetadata(carriers?: string[]): Promise<CarrierMetadataInfo[]>;

  /** EndShipper for platforms buying on behalf of users; returns the provider id to pass on buy. */
  createEndShipper(a: AddressInput): Promise<string>;
}

export class ProviderError extends Error {
  constructor(
    public readonly code:
      | "address_invalid"
      | "rate_expired"
      | "provider_unavailable"
      | "already_labeled"
      | "not_supported"
      | "unknown",
    message: string,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
