// Pure address helpers, safe to import from client components.
// (address.ts also holds addressHash, which needs node:crypto and must stay server-only.)

export type AddressParts = {
  street1: string;
  street2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
};

/**
 * Splits a pasted one-line US address into parts.
 * Accepts "418 Bergen St, Brooklyn, NY 11217", "418 Bergen St, Brooklyn NY 11217",
 * "418 Bergen St Apt 2, Brooklyn, NY, 11217". Returns null when it can't find city/state/zip.
 */
export function parseAddressLine(line: string): AddressParts | null {
  const cleaned = line.replace(/\s+/g, " ").trim();
  const m = /^(.*?),\s*([^,]+?),?\s+([A-Za-z]{2}),?\s+(\d{5})(?:-\d{4})?$/.exec(cleaned);
  if (!m) return null;
  const [, streetPart, city, state, zip] = m;
  const [street1, ...rest] = streetPart.split(",").map((s) => s.trim());
  return {
    street1,
    street2: rest.length ? rest.join(", ") : null,
    city: city.trim(),
    state: state.toUpperCase(),
    zip,
    country: "US",
  };
}

export function formatAddressLine(a: { street1: string; street2?: string | null; city: string; state: string; zip: string }): string {
  return [a.street1, a.street2, `${a.city}, ${a.state} ${a.zip}`].filter(Boolean).join(", ");
}
