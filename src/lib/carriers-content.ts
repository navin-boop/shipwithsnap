// Copy for the public carrier pages. Facts here are carrier-published service
// characteristics, not prices — prices always come from a live rate request.

export type CarrierService = { name: string; speed: string; best: string; maxWeight: string };

export type CarrierContent = {
  slug: string;
  name: string;
  title: string;
  blurb: string;
  /** Search-result description, kept under 160 characters. */
  metaDescription: string;
  intro: string;
  services: CarrierService[];
  strengths: string[];
  watchOut: string[];
  packaging: string;
  faqs: Array<{ q: string; a: string }>;
};

export const CARRIERS: CarrierContent[] = [
  {
    slug: "usps",
    name: "USPS",
    title: "USPS shipping labels at commercial rates",
    blurb: "The cheapest option for most parcels under about five pounds, and the only carrier that delivers to every US address including PO boxes.",
    metaDescription:
      "Compare USPS Ground Advantage, Priority Mail and Express at commercial rates. Cheapest for light parcels, and the only carrier that delivers to PO boxes.",
    intro:
      "USPS Commercial Pricing is the discounted tier the Postal Service gives high-volume shippers. Buying through Ship with Snap puts you on that tier from your first label, which is typically well below the price printed at the counter for the same service.",
    services: [
      { name: "Ground Advantage", speed: "2 to 5 business days", best: "The default for most parcels. Includes tracking and $100 of insurance.", maxWeight: "70 lb" },
      { name: "Priority Mail", speed: "1 to 3 business days", best: "Faster, and flat-rate boxes ignore weight entirely if your item is dense.", maxWeight: "70 lb" },
      { name: "Priority Mail Express", speed: "Overnight to 2 days", best: "Guaranteed delivery, including weekends and holidays in most areas.", maxWeight: "70 lb" },
      { name: "Media Mail", speed: "2 to 8 business days", best: "Books, films and printed music only. Very cheap, and USPS may open a package to check.", maxWeight: "70 lb" },
    ],
    strengths: [
      "Delivers to every US address, including PO boxes and APO/FPO military addresses, which UPS and FedEx cannot do.",
      "Cheapest for lightweight parcels, especially under two pounds.",
      "No residential surcharge, so a home delivery costs the same as a commercial one.",
      "Saturday delivery is included at no extra cost.",
    ],
    watchOut: [
      "Flat-rate boxes only save money when your item is heavy for its size — check the weight-based rate first.",
      "Media Mail is inspected and misusing it can mean the package is returned or charged at full postage.",
      "Delivery estimates are not guaranteed on Ground Advantage or Priority Mail.",
    ],
    packaging: "Priority Mail and Priority Mail Express boxes and envelopes are free from USPS and can be ordered to your door. Ground Advantage uses your own packaging.",
    faqs: [
      { q: "What is USPS Commercial Pricing?", a: "It is the discounted rate tier USPS gives high-volume shippers, below the retail price at a post office counter. Shipping through a platform like Ship with Snap qualifies you for it from your first label, with no volume minimum." },
      { q: "Is USPS Ground Advantage the same as First Class Package?", a: "Ground Advantage replaced First Class Package Service and Retail Ground in 2023. It covers parcels up to 70 pounds, includes tracking and $100 of insurance, and delivers in two to five business days." },
      { q: "Can I ship to a PO box?", a: "Yes, with USPS only. UPS and FedEx cannot deliver to PO boxes, so if the address you were given is a PO box, USPS is your only option." },
    ],
  },
  {
    slug: "ups",
    name: "UPS",
    title: "UPS shipping labels at discounted rates",
    blurb: "Strong on heavier parcels and guaranteed delivery dates, with the most reliable tracking detail of any carrier.",
    metaDescription:
      "Compare UPS Ground, 2nd Day Air and Next Day Air at discounted rates. Strong on heavier parcels, with guaranteed delivery dates and detailed tracking.",
    intro:
      "UPS prices by zone and by weight, and it becomes competitive as parcels get heavier — usually somewhere above three to five pounds, depending on distance. Rates through Ship with Snap are volume-discounted below what a walk-in UPS Store charges for the same service.",
    services: [
      { name: "Ground", speed: "1 to 5 business days", best: "The workhorse. Day-definite delivery within the US at ground prices.", maxWeight: "150 lb" },
      { name: "Ground Saver", speed: "2 to 7 business days", best: "Economy service for lightweight, non-urgent parcels. UPS carries it, USPS may make the final delivery.", maxWeight: "70 lb" },
      { name: "3 Day Select", speed: "3 business days", best: "Guaranteed three-day delivery, cheaper than air service.", maxWeight: "150 lb" },
      { name: "2nd Day Air", speed: "2 business days", best: "Guaranteed, with a money-back commitment if UPS misses it.", maxWeight: "150 lb" },
      { name: "Next Day Air", speed: "Next business day", best: "Guaranteed overnight, with morning options available.", maxWeight: "150 lb" },
    ],
    strengths: [
      "Handles parcels up to 150 pounds, more than double the USPS limit.",
      "Delivery dates are guaranteed on most services, with a money-back commitment.",
      "Detailed tracking with more scan events than other carriers, which makes exceptions easier to diagnose.",
      "Good international coverage with fast Worldwide Express options.",
    ],
    watchOut: [
      "Residential deliveries carry a surcharge, so verify the address type before you quote a customer.",
      "Additional handling and large-package surcharges apply to bulky or oddly shaped items.",
      "Delivery-area surcharges apply to rural ZIP codes.",
    ],
    packaging: "UPS supplies letters, paks, tubes and express boxes free for air services. Ground shipments use your own packaging, priced by dimensions and weight.",
    faqs: [
      { q: "Is UPS cheaper than USPS?", a: "It depends on weight. USPS is usually cheaper below roughly three pounds; UPS often wins above five, and always above 70 pounds because USPS will not carry those. Comparing both on one list is the point of the rate calculator." },
      { q: "What is a UPS residential surcharge?", a: "An extra fee UPS adds when delivering to a home rather than a business. Address verification tells you which one you are shipping to before you buy, so the price you see already accounts for it." },
      { q: "Can I use my own negotiated UPS rates?", a: "Yes. Connect your UPS account under Settings, Carriers and rates, and your negotiated pricing appears in the same rate list alongside ours." },
    ],
  },
  {
    slug: "fedex",
    name: "FedEx",
    title: "FedEx shipping labels at discounted rates",
    blurb: "The strongest choice for time-definite air freight, with sharp economy pricing on lightweight residential parcels.",
    metaDescription:
      "Compare FedEx Ground, Home Delivery, Ground Economy and overnight services at discounted rates. Best for time-definite air and light residential parcels.",
    intro:
      "FedEx runs two distinct networks: Express for air and Ground for road. That split is why its overnight products are excellent and its economy service is priced aggressively. Rates through Ship with Snap are discounted below FedEx retail counter pricing.",
    services: [
      { name: "Ground", speed: "1 to 5 business days", best: "Business-to-business ground shipping across the US.", maxWeight: "150 lb" },
      { name: "Home Delivery", speed: "1 to 5 business days", best: "Residential ground, with Saturday delivery included in most areas.", maxWeight: "70 lb" },
      { name: "Ground Economy", speed: "2 to 7 business days", best: "Lightweight, non-urgent residential parcels. Cheapest FedEx option.", maxWeight: "70 lb" },
      { name: "Express Saver", speed: "3 business days", best: "Guaranteed three-day air at the lowest air price.", maxWeight: "150 lb" },
      { name: "2Day", speed: "2 business days", best: "Guaranteed by end of the second business day.", maxWeight: "150 lb" },
      { name: "Priority Overnight", speed: "Next business morning", best: "Guaranteed next-day delivery, typically by 10:30am.", maxWeight: "150 lb" },
    ],
    strengths: [
      "Best-in-class overnight and time-definite air services with firm delivery commitments.",
      "Home Delivery includes Saturday at no extra charge in most of the country.",
      "Ground Economy is often the cheapest way to move a light parcel that is not urgent.",
      "Extensive international network with customs handling built in.",
    ],
    watchOut: [
      "FedEx requires a phone number on both the sender and recipient address, or it will refuse the label.",
      "Ground Economy hands the final mile to USPS in some areas, so the last scan can lag.",
      "Residential, delivery-area and additional-handling surcharges apply as they do at UPS.",
    ],
    packaging: "FedEx envelopes, paks, tubes and boxes are free for Express services. Ground uses your own packaging.",
    faqs: [
      { q: "Why does FedEx need a phone number?", a: "FedEx rejects label requests without a phone number on the sender and recipient records, because its drivers use it to resolve delivery problems. Add one to your ship-from address under Settings and we will fall back to it when a recipient has not given theirs." },
      { q: "What is FedEx Ground Economy?", a: "It was called SmartPost. FedEx carries the parcel most of the way and USPS often makes the final delivery, which makes it cheap for lightweight residential shipments that are not time-sensitive." },
      { q: "Does FedEx deliver on Saturday?", a: "Home Delivery includes Saturday in most of the country at no extra cost. On Express services, Saturday delivery is a paid option you can select when buying the label." },
    ],
  },
  {
    slug: "dhl",
    name: "DHL",
    title: "DHL Express international shipping labels",
    blurb: "The fastest option out of the United States, with customs clearance handled end to end.",
    metaDescription:
      "Compare DHL Express international rates from the US. Usually the fastest way to reach Europe and Asia, with customs clearance handled door to door.",
    intro:
      "DHL Express is built for international air freight and is routinely the quickest way to get a parcel from the US to Europe, the UK or Asia. It is rarely the cheapest choice for domestic US shipping, where USPS, UPS and FedEx are stronger.",
    services: [
      { name: "Express Worldwide", speed: "1 to 3 business days", best: "Door-to-door international with customs clearance included.", maxWeight: "150 lb" },
      { name: "Express 12:00", speed: "1 to 2 business days", best: "Guaranteed delivery by midday in major destinations.", maxWeight: "150 lb" },
    ],
    strengths: [
      "Usually the fastest transit time from the US to Europe and Asia.",
      "Customs brokerage is part of the service rather than an add-on.",
      "Strong tracking through the destination country's own network.",
    ],
    watchOut: [
      "Priced for speed, so compare against USPS International options when the parcel is not urgent.",
      "Some destinations require a commercial invoice with more detail than a CN22 carries.",
    ],
    packaging: "DHL Express envelopes and boxes are available free for account holders; otherwise use your own.",
    faqs: [
      { q: "Is DHL good for domestic US shipping?", a: "Rarely. DHL Express is priced for international speed. For US-to-US parcels, USPS, UPS and FedEx will almost always be cheaper, which the rate list will show you immediately." },
      { q: "Does DHL handle customs?", a: "Yes, customs clearance is part of DHL Express. You still need to complete an accurate customs declaration when you buy the label, which we generate as the CN22 or commercial invoice." },
    ],
  },
];

export function getCarrier(slug: string): CarrierContent | undefined {
  return CARRIERS.find((c) => c.slug === slug);
}
