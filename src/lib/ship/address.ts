import { createHash } from "node:crypto";
import type { AddressInput } from "@/lib/shipping";

export { formatAddressLine, parseAddressLine, type AddressParts } from "./address-parse";

/** Dedupe key for the addresses table — normalised, case-insensitive. Server only. */
export function addressHash(a: AddressInput): string {
  const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return createHash("sha1")
    .update([norm(a.name), norm(a.company), norm(a.street1), norm(a.street2), norm(a.city), norm(a.state), (a.zip ?? "").slice(0, 5), norm(a.country ?? "US")].join("|"))
    .digest("hex");
}
