import { createHash } from "node:crypto";
import type { AddressInput } from "@/lib/shipping";

/**
 * Splits a pasted one-line US address into parts.
 * Accepts "418 Bergen St, Brooklyn, NY 11217", "418 Bergen St, Brooklyn NY 11217",
 * "418 Bergen St Apt 2, Brooklyn, NY, 11217". Returns null when it can't find city/state/zip.
 */
export function parseAddressLine(line: string): Omit<AddressInput, "name"> | null {
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

export function formatAddressLine(a: Pick<AddressInput, "street1" | "street2" | "city" | "state" | "zip">): string {
  return [a.street1, a.street2, `${a.city}, ${a.state} ${a.zip}`].filter(Boolean).join(", ");
}

/** Dedupe key for the addresses table — normalised, case-insensitive. */
export function addressHash(a: AddressInput): string {
  const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return createHash("sha1")
    .update([norm(a.name), norm(a.company), norm(a.street1), norm(a.street2), norm(a.city), norm(a.state), (a.zip ?? "").slice(0, 5), norm(a.country ?? "US")].join("|"))
    .digest("hex");
}
