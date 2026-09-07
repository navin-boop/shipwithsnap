/**
 * The Sunny design system, rebuilt inside the constraints of email HTML.
 *
 * Email clients are not browsers: there is no external CSS, no flexbox worth trusting, no
 * transforms, and Outlook's Word renderer ignores border-radius and box-shadow outright. So the
 * artboards are matched where they can be and degraded deliberately where they cannot:
 *
 *   - the offset hard shadow is drawn as an ink panel sized 6px larger on the right and bottom,
 *     which needs nothing but padding — negative margins collapse against the parent and Outlook
 *     drops transforms — and which Outlook flattens into a plain outlined card;
 *   - Sora and Nunito are linked for the clients that load webfonts (Apple Mail) and fall back to
 *     a heavy system stack everywhere else — the layout is sized so both look right;
 *   - every colour is written literally, because CSS custom properties do not survive Gmail.
 *
 * Anything user-supplied must go through `esc` before it reaches a template.
 */
import { company } from "@/lib/company";

export const palette = {
  paper: "#fff8ee",
  surface: "#ffffff",
  ink: "#2b2320",
  ink2: "#5c524b",
  muted: "#7a6f68",
  mutedOnInk: "#d9cfc4",
  line: "#e9dfd4",
  coral: "#ff5c39",
  coralSoft: "#fff0ec",
  teal: "#0fa3a3",
  tealSoft: "#e6f6f6",
  yellow: "#ffd23f",
  danger: "#d93a2b",
  dangerSoft: "#fdecea",
} as const;

const DISPLAY = "'Sora','Helvetica Neue',Helvetica,Arial,sans-serif";
const BODY = "'Nunito','Helvetica Neue',Helvetica,Arial,sans-serif";

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? company.url ?? "https://shipwithsnap.com").replace(/\/+$/, "");
}

/** HTML-escape. Every interpolated value in a template goes through this. */
export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Integer cents to "$12.34". Money is cents everywhere else in the app; keep it that way here. */
export function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export type Brand = {
  /** Display name in the header and footer — the seller's store for customer mail, us for ours. */
  name: string;
  /** Absolute URL to a logo image, or null to render the name as text. */
  logoUrl?: string | null;
  /** Light-on-dark variant, used by clients that honour prefers-color-scheme. */
  logoDarkUrl?: string | null;
};

/** Our own brand: the generated "snap" wordmark from public/email. */
export function snapBrand(): Brand {
  const base = appUrl();
  return { name: company.brand, logoUrl: `${base}/email/logo.png`, logoDarkUrl: `${base}/email/logo-dark.png` };
}

export type Cta = { label: string; url: string; variant?: "primary" | "outline" };

/** A label/value line — tracking number, service, amount. Values are escaped by the caller. */
export type Row = { label: string; value: string; strong?: boolean };

export type EmailLayout = {
  /** The grey line after the subject in the inbox. Worth writing; it is read before anything else. */
  preheader: string;
  brand: Brand;
  eyebrow?: string;
  heading: string;
  /** Already-escaped HTML for the body copy. */
  bodyHtml: string;
  cta?: Cta | null;
  secondaryCta?: Cta | null;
  rows?: Row[];
  /** A tinted callout under the rows — status, warning, receipt total. */
  callout?: { tone: "teal" | "coral" | "danger" | "yellow"; title: string; body?: string } | null;
  /** Small print above the legal footer, e.g. why this email was sent. */
  note?: string | null;
  /** Set for mail we send on a seller's behalf, so the footer says so. */
  onBehalfOf?: string | null;
};

const CALLOUT_TONES = {
  teal: { bg: palette.tealSoft, border: palette.teal, text: "#0b5f5f" },
  coral: { bg: palette.coralSoft, border: palette.coral, text: "#8f2d18" },
  danger: { bg: palette.dangerSoft, border: palette.danger, text: "#8f2018" },
  yellow: { bg: "#fff6d6", border: palette.yellow, text: palette.ink },
} as const;

function button(cta: Cta): string {
  const primary = (cta.variant ?? "primary") === "primary";
  const bg = primary ? palette.coral : palette.surface;
  const fg = primary ? "#ffffff" : palette.ink;
  // The pill sits on an ink panel offset by 5px — the artboards' hard shadow, minus the blur that
  // email cannot do. Outlook drops the negative margin and radius and renders a solid rectangle.
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td>
    <div style="background:${palette.ink};border-radius:999px;padding:0 5px 5px 0">
      <div style="background:${bg};border:2px solid ${palette.ink};border-radius:999px">
        <a href="${esc(cta.url)}" style="display:block;padding:15px 28px;font-family:${DISPLAY};font-weight:800;font-size:16px;line-height:1;color:${fg};text-decoration:none;white-space:nowrap">${esc(cta.label)}</a>
      </div>
    </div>
  </td></tr></table>`;
}

function rowsTable(rows: Row[]): string {
  const cells = rows
    .map(
      (r, i) => `<tr>
        <td style="padding:${i === 0 ? "0" : "10px"} 0 10px 0;border-top:${i === 0 ? "none" : `1px solid ${palette.line}`};font-family:${BODY};font-weight:800;font-size:13px;color:${palette.muted}">${esc(r.label)}</td>
        <td align="right" style="padding:${i === 0 ? "0" : "10px"} 0 10px 0;border-top:${i === 0 ? "none" : `1px solid ${palette.line}`};font-family:${r.strong ? DISPLAY : BODY};font-weight:${r.strong ? 800 : 700};font-size:${r.strong ? "20px" : "15px"};color:${palette.ink}">${r.value}</td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0 0;border:2px solid ${palette.line};border-radius:18px;padding:18px 20px">${cells}</table>`;
}

function calloutBlock(c: NonNullable<EmailLayout["callout"]>): string {
  const t = CALLOUT_TONES[c.tone];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 0 0"><tr><td style="background:${t.bg};border:2px solid ${t.border};border-radius:18px;padding:16px 18px">
    <div style="font-family:${DISPLAY};font-weight:800;font-size:16px;color:${t.text}">${esc(c.title)}</div>
    ${c.body ? `<div style="margin-top:6px;font-family:${BODY};font-weight:600;font-size:14px;line-height:1.5;color:${t.text}">${esc(c.body)}</div>` : ""}
  </td></tr></table>`;
}

function header(brand: Brand): string {
  if (!brand.logoUrl) {
    return `<div style="font-family:${DISPLAY};font-weight:800;font-size:24px;color:${palette.ink}">${esc(brand.name)}</div>`;
  }
  const dark = brand.logoDarkUrl
    ? `<!--[if !mso]><! --><img src="${esc(brand.logoDarkUrl)}" width="180" height="64" alt="${esc(brand.name)}" class="logo-dark" style="display:none;width:180px;height:64px;border:0;max-height:0;overflow:hidden;mso-hide:all"><!--<![endif]-->`
    : "";
  return `<img src="${esc(brand.logoUrl)}" width="180" height="64" alt="${esc(brand.name)}" class="logo-light" style="display:block;width:180px;height:64px;border:0">${dark}`;
}

function footer(l: EmailLayout): string {
  const base = appUrl();
  const behalf = l.onBehalfOf
    ? `Sent by ${esc(company.brand)} on behalf of ${esc(l.onBehalfOf)}.`
    : `${esc(company.legalName)} · ${esc(company.brand)}`;
  return `<div style="padding:22px 4px 0 4px;font-family:${BODY};font-weight:700;font-size:12px;line-height:1.6;color:${palette.muted}">
    ${l.note ? `<div style="margin-bottom:10px">${esc(l.note)}</div>` : ""}
    <div>${behalf}</div>
    <div style="margin-top:4px">
      <a href="${base}" style="color:${palette.muted};text-decoration:underline">${esc(company.domain)}</a>
      &nbsp;·&nbsp;
      <a href="mailto:${esc(company.email.support)}" style="color:${palette.muted};text-decoration:underline">${esc(company.email.support)}</a>
    </div>
    <div style="margin-top:8px;color:#a2978f">Carrier names and logos are trademarks of their respective owners.</div>
  </div>`;
}

/** The one wrapper every template renders through. */
export function renderEmail(l: EmailLayout): string {
  const ctas = [l.cta, l.secondaryCta].filter(Boolean) as Cta[];
  const ctaHtml = ctas.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0 0"><tr>${ctas
        .map((c, i) => `<td style="padding-right:${i < ctas.length - 1 ? "12px" : "0"}">${button(c)}</td>`)
        .join("")}</tr></table>`
    : "";

  return `<!doctype html>
<html lang="en" style="color-scheme:light dark;supported-color-schemes:light dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(l.heading)}</title>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@800&family=Nunito:wght@600;700;800&display=swap" rel="stylesheet">
<style>
  /* Clients that support media queries get the dark-ground logo; the rest keep the ink one. */
  @media (prefers-color-scheme: dark) {
    .logo-light { display:none !important; }
    .logo-dark { display:block !important; width:180px !important; height:64px !important; max-height:none !important; overflow:visible !important; }
  }
  [data-ogsc] .logo-light { display:none !important; }
  [data-ogsc] .logo-dark { display:block !important; width:180px !important; height:64px !important; max-height:none !important; overflow:visible !important; }
  @media only screen and (max-width:620px) {
    .shell { width:100% !important; }
    .pad { padding-left:22px !important; padding-right:22px !important; }
    .h1 { font-size:30px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${palette.paper};-webkit-font-smoothing:antialiased">
<div style="display:none;font-size:1px;color:${palette.paper};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${esc(l.preheader)}&#8203;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${palette.paper}">
  <tr><td align="center" style="padding:40px 16px 48px 16px">
    <table role="presentation" class="shell" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:560px">
      <tr><td style="padding:0 4px 22px 4px">${header(l.brand)}</td></tr>
      <tr><td>
        <div style="background:${palette.ink};border-radius:22px;padding:0 6px 6px 0">
          <div class="pad" style="background:${palette.surface};border:2px solid ${palette.ink};border-radius:22px;padding:30px 30px 34px 30px">
            ${l.eyebrow ? `<div style="font-family:${BODY};font-weight:800;font-size:13px;color:${palette.muted}">${esc(l.eyebrow)}</div>` : ""}
            <h1 class="h1" style="margin:${l.eyebrow ? "8px" : "0"} 0 0 0;font-family:${DISPLAY};font-weight:800;font-size:36px;line-height:1.04;letter-spacing:-0.7px;color:${palette.ink}">${esc(l.heading)}</h1>
            <div style="margin-top:16px;font-family:${BODY};font-weight:600;font-size:16px;line-height:1.55;color:${palette.ink2}">${l.bodyHtml}</div>
            ${l.rows?.length ? rowsTable(l.rows) : ""}
            ${l.callout ? calloutBlock(l.callout) : ""}
            ${ctaHtml}
          </div>
        </div>
      </td></tr>
      <tr><td>${footer(l)}</td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/** Paragraph helper so templates never hand-write escaping. */
export function p(text: string): string {
  return `<p style="margin:0 0 12px 0">${esc(text)}</p>`;
}

/** Paragraph with pre-escaped inline HTML (links, bold) already applied by the caller. */
export function raw(html: string): string {
  return `<p style="margin:0 0 12px 0">${html}</p>`;
}

export function strong(text: string): string {
  return `<strong style="font-weight:800;color:${palette.ink}">${esc(text)}</strong>`;
}

export function link(text: string, url: string): string {
  return `<a href="${esc(url)}" style="color:${palette.coral};font-weight:800;text-decoration:underline">${esc(text)}</a>`;
}
