// Catalogue of EasyPost shipment options, package types and customs enums, in our own vocabulary.
// Source: docs.easypost.com — shipments/options, parcels, customs-infos. Used by the UI and validation.

export const SIGNATURE_LEVELS = [
  { value: "none", label: "No signature", hint: "Leave it at the door" },
  { value: "signature", label: "Signature", hint: "Someone must sign" },
  { value: "adult", label: "Adult signature", hint: "21+ with ID — alcohol, restricted goods" },
  { value: "indirect", label: "Indirect signature", hint: "A neighbour or building manager may sign (FedEx/UPS)" },
] as const;
export type SignatureLevel = (typeof SIGNATURE_LEVELS)[number]["value"];

export const ENDORSEMENTS = [
  { value: "ADDRESS_SERVICE_REQUESTED", label: "Address service requested" },
  { value: "FORWARDING_SERVICE_REQUESTED", label: "Forwarding service requested" },
  { value: "CHANGE_SERVICE_REQUESTED", label: "Change service requested" },
  { value: "RETURN_SERVICE_REQUESTED", label: "Return service requested" },
  { value: "LEAVE_IF_NO_RESPONSE", label: "Leave if no response" },
] as const;

export const SPECIAL_RATES = [
  { value: "USPS.MEDIAMAIL", label: "USPS Media Mail", hint: "Books, media only — USPS may inspect" },
  { value: "USPS.LIBRARYMAIL", label: "USPS Library Mail", hint: "Between libraries and schools only" },
] as const;

/** USPS hazmat classes — the ones small sellers actually hit; the full list is passed through as-is. */
export const HAZMAT = [
  { value: "", label: "No hazardous materials" },
  { value: "CLASS_9_NEW_LITHIUM_DEVICE", label: "Lithium batteries installed in a device" },
  { value: "CLASS_9_NEW_LITHIUM_INDIVIDUAL", label: "Lithium batteries packed with equipment" },
  { value: "CLASS_9_USED_LITHIUM", label: "Used or damaged lithium batteries" },
  { value: "LIMITED_QUANTITY", label: "Limited quantity (ORM-D) — aerosols, nail polish, perfume" },
  { value: "CLASS_3", label: "Class 3 flammable liquid" },
  { value: "CLASS_9_DRY_ICE", label: "Dry ice" },
  { value: "GROUND_ONLY", label: "Ground transport only" },
] as const;

export const PREDEFINED_PACKAGES: Record<string, Array<{ code: string; label: string; hint?: string }>> = {
  USPS: [
    { code: "FlatRateEnvelope", label: "Flat Rate Envelope" },
    { code: "FlatRatePaddedEnvelope", label: "Flat Rate Padded Envelope" },
    { code: "FlatRateLegalEnvelope", label: "Flat Rate Legal Envelope" },
    { code: "SmallFlatRateBox", label: "Small Flat Rate Box", hint: "8⅝ × 5⅜ × 1⅝ in" },
    { code: "MediumFlatRateBox", label: "Medium Flat Rate Box", hint: "11 × 8½ × 5½ in" },
    { code: "LargeFlatRateBox", label: "Large Flat Rate Box", hint: "12 × 12 × 5½ in" },
    { code: "SoftPack", label: "Soft pack / poly mailer" },
    { code: "Parcel", label: "Your own box" },
  ],
  UPS: [
    { code: "UPSLetter", label: "UPS Letter" },
    { code: "Pak", label: "UPS Pak" },
    { code: "Tube", label: "UPS Tube" },
    { code: "SmallExpressBox", label: "Small Express Box" },
    { code: "MediumExpressBox", label: "Medium Express Box" },
    { code: "LargeExpressBox", label: "Large Express Box" },
    { code: "UPS10kgBox", label: "10 kg Box" },
    { code: "UPS25kgBox", label: "25 kg Box" },
  ],
  FedEx: [
    { code: "FedExEnvelope", label: "FedEx Envelope" },
    { code: "FedExPak", label: "FedEx Pak" },
    { code: "FedExTube", label: "FedEx Tube" },
    { code: "FedExExtraSmallBox", label: "Extra Small Box" },
    { code: "FedExSmallBox", label: "Small Box" },
    { code: "FedExMediumBox", label: "Medium Box" },
    { code: "FedExLargeBox", label: "Large Box" },
    { code: "FedExExtraLargeBox", label: "Extra Large Box" },
    { code: "FedEx10kgBox", label: "10 kg Box" },
    { code: "FedEx25kgBox", label: "25 kg Box" },
  ],
  DHL: [
    { code: "DHLExpressEnvelope", label: "DHL Express Envelope" },
    { code: "DHLFlyer", label: "DHL Flyer" },
    { code: "JumboBox", label: "Jumbo Box" },
    { code: "YourPackaging", label: "Your own packaging" },
  ],
};

export const CONTENTS_TYPES = [
  { value: "merchandise", label: "Merchandise" },
  { value: "gift", label: "Gift" },
  { value: "documents", label: "Documents" },
  { value: "returned_goods", label: "Returned goods" },
  { value: "sample", label: "Sample" },
  { value: "humanitarian_donation", label: "Humanitarian donation" },
  { value: "dangerous_goods", label: "Dangerous goods" },
  { value: "other", label: "Other (explain)" },
] as const;
export type ContentsType = (typeof CONTENTS_TYPES)[number]["value"];

export const NON_DELIVERY = [
  { value: "return", label: "Return to me" },
  { value: "abandon", label: "Abandon" },
] as const;

export const RESTRICTION_TYPES = [
  { value: "none", label: "None" },
  { value: "quarantine", label: "Quarantine" },
  { value: "sanitary_phytosanitary_inspection", label: "Sanitary / phytosanitary inspection" },
  { value: "other", label: "Other" },
] as const;

/** EEL/PFC: "NOEEI 30.37(a)" covers goods under $2,500 per Schedule B — the default for small sellers. */
export const EEL_PFC_DEFAULT = "NOEEI 30.37(a)";

export const INCOTERMS = ["DAP", "DDP", "EXW", "FCA", "CPT", "CIP", "DAT", "FAS", "FOB", "CFR", "CIF"] as const;

export const CLAIM_TYPES = [
  { value: "damage", label: "Damaged" },
  { value: "loss", label: "Lost" },
  { value: "theft", label: "Stolen" },
] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number]["value"];

export const TRACKER_STATUS_DETAIL_LABELS: Record<string, string> = {
  address_correction: "Address corrected by the carrier",
  arrived_at_destination: "Arrived at destination",
  arrived_at_facility: "Arrived at facility",
  arrived_at_pickup_location: "Arrived at pickup location",
  awaiting_information: "Carrier is awaiting information",
  cancelled: "Cancelled",
  damaged: "Reported damaged",
  delayed: "Delayed",
  delivery_exception: "Delivery exception",
  departed_facility: "Departed facility",
  departed_origin_facility: "Departed origin facility",
  expired: "Tracking expired",
  failure: "Delivery failed",
  held: "Held at carrier facility",
  in_transit: "In transit",
  label_created: "Label created",
  lost: "Reported lost",
  missorted: "Missorted",
  out_for_delivery: "Out for delivery",
  received_at_destination_facility: "Received at destination facility",
  received_at_origin_facility: "Received at origin facility",
  refused: "Refused by recipient",
  return: "Returning to sender",
  status_update: "Status update",
  transferred_to_destination_carrier: "Handed to local carrier",
  transit_exception: "Transit exception",
  unknown: "Unknown",
  weather_delay: "Weather delay",
};

export const COUNTRIES = [
  ["US", "United States"], ["CA", "Canada"], ["MX", "Mexico"], ["GB", "United Kingdom"], ["AU", "Australia"], ["DE", "Germany"], ["FR", "France"], ["NL", "Netherlands"], ["ES", "Spain"], ["IT", "Italy"], ["IE", "Ireland"], ["SE", "Sweden"], ["NO", "Norway"], ["DK", "Denmark"], ["FI", "Finland"], ["BE", "Belgium"], ["CH", "Switzerland"], ["AT", "Austria"], ["PT", "Portugal"], ["PL", "Poland"], ["JP", "Japan"], ["KR", "South Korea"], ["SG", "Singapore"], ["HK", "Hong Kong"], ["TW", "Taiwan"], ["NZ", "New Zealand"], ["BR", "Brazil"], ["AR", "Argentina"], ["CL", "Chile"], ["CO", "Colombia"], ["IN", "India"], ["AE", "United Arab Emirates"], ["IL", "Israel"], ["ZA", "South Africa"], ["PH", "Philippines"], ["TH", "Thailand"], ["VN", "Vietnam"], ["MY", "Malaysia"], ["ID", "Indonesia"], ["PR", "Puerto Rico"],
] as const;
