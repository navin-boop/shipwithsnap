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
  url: "https://shipwithsnap.com",

  /** Registered mailing address. Leave a line empty to omit it. */
  address: {
    line1: "",
    line2: "",
    city: "",
    state: "",
    zip: "",
    country: "United States",
  },

  /** The US state whose law governs the Terms. Empty renders a generic clause. */
  governingState: "",

  email: {
    support: "support@shipwithsnap.com",
    legal: "legal@shipwithsnap.com",
    privacy: "privacy@shipwithsnap.com",
    billing: "billing@shipwithsnap.com",
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
