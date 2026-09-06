import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Outbound webhook targets are supplied by customers, which makes delivery a server-side request
 * forgery primitive: a URL like https://169.254.169.254/ or https://10.0.0.5/ would have our
 * server reach into networks the customer cannot.
 *
 * Every destination is checked twice — once when the endpoint is saved, and again immediately
 * before each delivery, because DNS can be repointed at a private address after registration
 * (DNS rebinding).
 */

/** RFC1918, loopback, link-local, CGNAT, and the cloud metadata address. */
function isPrivateIPv4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true; // link-local, includes 169.254.169.254
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast and reserved
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const s = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (s === "::1" || s === "::") return true;
  if (s.startsWith("fc") || s.startsWith("fd")) return true; // unique local
  if (s.startsWith("fe80")) return true; // link-local
  if (s.startsWith("::ffff:")) return isPrivateIPv4(s.slice(7)); // IPv4-mapped
  return false;
}

export function isPrivateAddress(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) return isPrivateIPv4(ip);
  if (v === 6) return isPrivateIPv6(ip);
  return true; // not an address we understand — refuse
}

const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal", "metadata"]);
const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".home.arpa"];

export type UrlCheck = { ok: true; url: URL } | { ok: false; reason: string };

/** Shape checks that need no network: scheme, port and obviously internal names. */
export function checkWebhookUrl(raw: string): UrlCheck {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "That is not a valid URL." };
  }
  if (url.protocol !== "https:") return { ok: false, reason: "Webhooks must use https." };
  if (url.username || url.password) return { ok: false, reason: "Credentials in the URL are not allowed." };

  // Node keeps the brackets on an IPv6 literal hostname; isIP() will not match them.
  const host = url.hostname.toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTS.has(host) || BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) {
    return { ok: false, reason: "That host is not reachable from our servers." };
  }
  if (isIP(host) && isPrivateAddress(host)) {
    return { ok: false, reason: "Webhooks cannot point at a private or internal address." };
  }
  // Only the standard TLS port; other ports are how internal services get probed.
  if (url.port && url.port !== "443") return { ok: false, reason: "Webhooks must use the default https port." };
  return { ok: true, url };
}

/** The full check, including what the hostname actually resolves to right now. */
export async function assertSafeWebhookTarget(raw: string): Promise<UrlCheck> {
  const shape = checkWebhookUrl(raw);
  if (!shape.ok) return shape;
  const host = shape.url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) return shape; // already validated above

  try {
    const records = await lookup(host, { all: true });
    if (!records.length) return { ok: false, reason: "That hostname does not resolve." };
    for (const r of records) {
      if (isPrivateAddress(r.address)) return { ok: false, reason: "That hostname resolves to a private address." };
    }
  } catch {
    return { ok: false, reason: "That hostname does not resolve." };
  }
  return shape;
}
