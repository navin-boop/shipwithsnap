// Every company fact the site states about itself, in one place.
// Legal and SEO pages read from here, so there is exactly one thing to update.
//
// Fields left as "" are omitted from the rendered pages rather than shown blank —
// fill them in before launch and they appear everywhere at once.

export const company = {
  /** The legal entity behind the service. */
  legalName: "Snap3PL LLC",
  /** The consumer-facing brand. */
  brand: "Ship with Snap",
  shortBrand: "Snap",
  domain: "shipwithsnap.com",
  /**
   * The canonical origin, used for canonical tags, the sitemap, robots.txt and JSON-LD.
   * It follows NEXT_PUBLIC_APP_URL so it always matches whichever hostname Vercel serves as
   * production — canonical tags pointing at a hostname that only redirects are worse than useless.
   */
  url: (process.env.NEXT_PUBLIC_APP_URL ?? "https://shipwithsnap.com").replace(/\/+$/, ""),

  /** Registered mailing address. Leave a line empty to omit it. */
  address: {
    line1: "11034 Shady Trail",
    line2: "",
    city: "Dallas",
    state: "TX",
    zip: "75229",
    country: "United States",
  },

  /** The US state whose law governs the Terms. Empty renders a generic clause. */
  governingState: "",

  /**
   * All four point at the same inbox on purpose: support@ is the only mailbox that exists, and a
   * published address that bounces is worse than one that is shared — a privacy or legal request
   * sent into a black hole is a compliance problem, not a tidiness one. The four keys stay
   * separate so each can be split out later without touching the pages that read them.
   */
  email: {
    support: "support@shipwithsnap.com",
    legal: "support@shipwithsnap.com",
    privacy: "support@shipwithsnap.com",
    billing: "support@shipwithsnap.com",
  },

  /** Shown on Contact. Empty omits the line. */
  phone: "",

  /** Support coverage, plain language. */
  supportHours: "Monday to Friday, 9am to 6pm Eastern",
  responseTime: "one business day",

  /** Last substantive revision of the legal pages. */
  legalUpdated: "September 6, 2026",

  founded: "2026",
} as const;

/** One-line postal address, or "" when the address isn't configured. */
export function addressLine(): string {
  const a = company.address;
  const parts = [a.line1, a.line2, [a.city, a.state].filter(Boolean).join(", "), a.zip].filter(Boolean);
  return parts.length ? parts.join(", ") : "";
}

export function hasAddress(): boolean {
  return !!company.address.line1 && !!company.address.city;
}

/** "the State of X" when configured, otherwise a clause that works without naming one. */
export function governingLawPhrase(): string {
  return company.governingState
    ? `the State of ${company.governingState}`
    : `the state in which ${company.legalName} is organized`;
}
