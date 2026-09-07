/**
 * Regenerates the brand images that emails use. Emails cannot load webfonts, so the wordmark
 * has to ship as a raster: this renders it with Sora 800 (the display face) and writes PNGs.
 *
 *   npx tsx scripts/make-brand-images.tsx
 */
import { writeFileSync } from "node:fs";
import { ImageResponse } from "next/og";

const SORA_800 = "https://fonts.gstatic.com/s/sora/v17/xMQOuFFYT72X5wkB_18qmnndmSfSmX-K.ttf";

/** 2x so the mark stays crisp on retina; emails display it at half these numbers. */
const W = 360;
const H = 128;

async function wordmark(font: ArrayBuffer, ink: string, coral: string) {
  const res = new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent" }}>
        <div style={{ display: "flex", alignItems: "center", fontFamily: "Sora", fontWeight: 800, fontSize: 92, color: ink, letterSpacing: -2 }}>
          snap
          <div style={{ width: 24, height: 24, borderRadius: 999, background: coral, marginLeft: 10, marginTop: 26 }} />
        </div>
      </div>
    ),
    { width: W, height: H, fonts: [{ name: "Sora", data: font, weight: 800, style: "normal" }] },
  );
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const font = await fetch(SORA_800).then((r) => r.arrayBuffer());
  writeFileSync("public/email/logo.png", await wordmark(font, "#2b2320", "#ff5c39"));
  writeFileSync("public/email/logo-dark.png", await wordmark(font, "#fff8ee", "#ff5c39"));
  console.log("wrote public/email/logo.png and logo-dark.png");
}

main();
