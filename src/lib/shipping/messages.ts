import { carrierName } from "./easypost";

/**
 * Turns a carrier's raw decline into something a customer can read — or into nothing.
 *
 * EasyPost returns one `messages` entry per carrier account that refused to quote, worded by the
 * carrier: "DhlEcs: shipment.options.merchant_id is required". Showing those verbatim is how a
 * missing carrier stopped being invisible — UPS was absent from every quote for hours and the
 * absence looked identical to "we don't offer UPS" — and it is exactly the right thing to put in
 * a log. On a public page it reads as a broken integration, so the two audiences split here:
 *
 *   - our own misconfiguration, and lanes a carrier structurally does not serve, tell a visitor
 *     nothing they can act on. They return null and live on in the server log.
 *   - anything else becomes one plain sentence naming the carrier — never the carrier's own text,
 *     which is written for an integrator and mentions fields no seller has heard of.
 */

/** Declines a visitor can do nothing with. Matched against the message, not the carrier code. */
const SILENT = [
  // Our side: an account we have not finished configuring.
  /merchant[_ ]?id/i,
  /credential|unauthorized|not authori[sz]ed|invalid api key|no such carrier/i,
  // The carrier does not fly this lane at all — true of every quote, so it is not news.
  /only support(?:s)? shipments? from/i,
  /originating outside of/i,
  /does not (?:service|serve|support) (?:this|the) /i,
];

/**
 * One sentence for the customer, or null to say nothing.
 *
 * A message with no carrier prefix returns null too: without a name the sentence would be
 * "a carrier didn't quote", which tells a visitor strictly less than the rates already on screen.
 */
export function publicCarrierNote(raw: string): string | null {
  const at = raw.indexOf(": ");
  if (at <= 0) return null;
  const text = raw.slice(at + 2).trim();
  if (!text || SILENT.some((re) => re.test(text))) return null;
  return `${carrierName(raw.slice(0, at))} didn't quote this package.`;
}

/** The public notes for a set of raw provider messages, deduped — two UPS accounts, one sentence. */
export function publicCarrierNotes(raw: string[]): string[] {
  return [...new Set(raw.map(publicCarrierNote).filter((n): n is string => n !== null))];
}
