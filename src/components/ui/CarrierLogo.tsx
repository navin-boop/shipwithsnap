"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Carrier mark.
 *
 * Two modes, in this order:
 *  1. If `/public/carriers/<slug>.svg` exists, that file is shown. Drop the carrier's official
 *     logo there and it appears everywhere with no code change (see public/carriers/README.md).
 *     Those files are trademarks and are deliberately NOT bundled — USPS and UPS both require
 *     written permission before their eagle and shield may be reproduced.
 *  2. Otherwise we draw our own mark: the carrier's name set in our typeface on the carrier's
 *     published brand colour. That identifies the service without reproducing protected artwork,
 *     which is the same nominative use the footer disclaimer describes.
 *
 * Drawn as an SVG with a viewBox so it stays sharp at every size, and `textLength` forces the
 * name to fit the tile exactly whether it is three characters or six.
 */

const SLUG: Record<string, string> = { USPS: "usps", UPS: "ups", FedEx: "fedex", DHL: "dhl", "Canada Post": "canadapost" };

/** Published brand colours. Background, then the text colour that sits on it. */
const BRAND: Record<string, { bg: string; fg: string }> = {
  USPS: { bg: "#004B87", fg: "#FFFFFF" },
  UPS: { bg: "#351C15", fg: "#FFB500" },
  FedEx: { bg: "#4D148C", fg: "#FFFFFF" },
  DHL: { bg: "#FFCC00", fg: "#D40511" },
  "Canada Post": { bg: "#DA291C", fg: "#FFFFFF" },
};

const DEFAULT_BRAND = { bg: "#2b2320", fg: "#fff8ee" };

export function CarrierLogo({ carrier, size = 44, className, inverted }: { carrier: string; size?: number; className?: string; inverted?: boolean }) {
  // Optimistic: assume the file is there and show it, and fall back only when it actually fails.
  // The reverse — hide it until onLoad fires — loses the race on a prerendered page, where the
  // image is usually already complete before React hydrates and the event never reaches it.
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  const slug = SLUG[carrier];
  const brand = BRAND[carrier] ?? DEFAULT_BRAND;
  const showFile = Boolean(slug) && !failed;

  // An image that finished before hydration never fires onError either, so check it once.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  // A long name would be cut mid-word ("Canada " ), so multi-word carriers use their initials.
  const label = carrier.length > 7 ? (carrier.includes(" ") ? carrier.split(/\s+/).map((w) => w[0]).join("") : carrier.slice(0, 7)) : carrier;

  return (
    <div
      className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-[12px]", showFile && "bg-surface", inverted && "ring-2 ring-ink", className)}
      // Padding has to come from the tile's own size. A percentage would resolve against the
      // containing block instead — 12% of a 704px card is 84px of padding on a 48px tile, which
      // with border-box collapses the content box to nothing and hides the logo entirely.
      style={{ width: size, height: size, padding: showFile ? Math.max(2, Math.round(size * 0.12)) : 0 }}
      role="img"
      aria-label={carrier}
    >
      {!showFile && (
        <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" className="h-full w-full">
          <rect width="100" height="100" rx="22" fill={brand.bg} />
          <text
            x="50"
            y="53"
            textAnchor="middle"
            dominantBaseline="middle"
            textLength="74"
            lengthAdjust="spacingAndGlyphs"
            fill={brand.fg}
            fontSize="27"
            fontWeight="800"
            fontFamily="var(--font-display), system-ui, sans-serif"
            letterSpacing="-0.5"
          >
            {label}
          </text>
        </svg>
      )}
      {showFile && (
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={ref} src={`/carriers/${slug}.svg`} alt="" width={size} height={size} onError={() => setFailed(true)} className="h-full w-full object-contain" />
      )}
    </div>
  );
}
