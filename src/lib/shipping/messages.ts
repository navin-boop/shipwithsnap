import { carrierName } from "./easypost";

/**
 * Turns a carrier's raw decline into something a customer can read — or into nothing.
 *
 * EasyPost returns one `messages` entry per carrier account that refused to quote, worded by the
 * carrier: "DhlEcs: shipment.options.merchant_id is required". Showing those verbatim is how a
 * missing carrier stopped being invisible — UPS was absent from every quote for hours and the
 * absence looked identical to "we don't offer UPS" — and it is exactly the right thing to put in
 * a log. On a screen it reads as a broken integration, so the two audiences split here:
 *
 *   - our own misconfiguration, and carriers that cannot serve the lane being quoted, tell a
 *     seller nothing they can act on. They return null and live on in the server log.
 *   - anything else becomes one plain sentence naming the carrier — never the carrier's own text,
 *     which is written for an integrator and names fields no seller has heard of.
 *
 * The raw list stays on the quote for the log and for API v1, where the reader *is* an integrator.
 */

/** Where the parcel is going, so a decline can be judged against the lane rather than its wording. */
export type Lane = { fromCountry: string; toCountry: string };

/**
 * Carrier accounts that cannot carry a US → US parcel at all, so on a domestic lane their refusal
 * is a fact about the carrier and not about this package. Listed by EasyPost account code, from
 * the declines production actually returned — a guessed list would silence carriers that do serve
 * the lane and hide a real outage.
 */
const NOT_US_DOMESTIC = new Set(["CanadaPost", "USAExportPBA"]);

/** Declines a seller can do nothing with. Matched against the message, not the carrier code. */
const SILENT = [
  // Our side: an account we have not finished configuring.
  /merchant[_ ]?id/i,
  /credential|unauthorized|not authori[sz]ed|invalid api key|no such carrier/i,
  // The carrier does not fly this lane — true of every such quote, so it is not news.
  /only support(?:s)? shipments? from/i,
  /originating outside of/i,
  /does not (?:service|serve|support) (?:this|the) /i,
];

/**
 * One sentence for the customer, or null to say nothing.
 *
 * Two kinds of message return null beyond the rules above. One with no carrier prefix, because
 * "a carrier didn't quote" tells a reader strictly less than the rates already on screen. And one
 * from an account we have no plain-English name for, because the alternative is printing an
 * internal code like `USAExportPBA` at someone who has never heard of it.
 */
export function publicCarrierNote(raw: string, lane?: Lane): string | null {
  const at = raw.indexOf(": ");
  if (at <= 0) return null;
  const code = raw.slice(0, at);
  const text = raw.slice(at + 2).trim();
  if (!text) return null;
  if (isDomesticUS(lane) && NOT_US_DOMESTIC.has(code)) return null;
  if (SILENT.some((re) => re.test(text))) return null;
  const name = carrierName(code);
  if (name === code) return null;
  return `${name} didn't quote this package.`;
}

/** The notes for a set of raw provider messages, deduped — two UPS accounts, one sentence. */
export function publicCarrierNotes(raw: string[], lane?: Lane): string[] {
  return [...new Set(raw.map((m) => publicCarrierNote(m, lane)).filter((n): n is string => n !== null))];
}

function isDomesticUS(lane?: Lane): boolean {
  return !!lane && lane.fromCountry.toUpperCase() === "US" && lane.toCountry.toUpperCase() === "US";
}
