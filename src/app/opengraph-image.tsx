import { ImageResponse } from "next/og";

export const alt = "Ship with Snap — the cheapest USPS & UPS rates. No monthly fee.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Syne 800 as TTF/WOFF (Google's CSS serves those for a legacy user agent; next/og reads both). */
const SYNE_FALLBACK = "https://fonts.gstatic.com/s/syne/v24/8vIS7w4qzmVxsWxjBZRjr0FKM_24vj6n.woff";

async function syne(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch("https://fonts.googleapis.com/css2?family=Syne:wght@800", { headers: { "user-agent": "Mozilla/5.0 (Windows NT 6.1; rv:6.0) Gecko/20110814 Firefox/6.0" } }).then((r) => r.text());
    const url = /url\(([^)]+)\)\s*format\('(?:truetype|woff|opentype)'\)/.exec(css)?.[1] ?? SYNE_FALLBACK;
    const res = await fetch(url);
    return res.ok ? res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function OpenGraphImage() {
  const font = await syne();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#f2efe6", color: "#111111", padding: 64, fontFamily: "Syne", fontWeight: 800 }}>
        <div style={{ display: "flex", fontSize: 40, textTransform: "uppercase", letterSpacing: -1 }}>
          Snap<span style={{ color: "#2d5bff" }}>.</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 68, lineHeight: 1.02, letterSpacing: -2, maxWidth: 1000 }}>
          <span>The cheapest USPS &amp; UPS rates.</span>
          <span style={{ color: "#2d5bff" }}>No monthly fee.</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "4px solid #111111", paddingTop: 24, fontSize: 18, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2 }}>
          <span>Paste · pick a rate · print</span>
          <span style={{ background: "#111111", color: "#c8ff3d", padding: "12px 20px" }}>shipwithsnap.com</span>
        </div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: "Syne", data: font, weight: 800 as const, style: "normal" as const }] : undefined },
  );
}
