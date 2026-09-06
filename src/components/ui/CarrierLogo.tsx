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

const SLUG: Record<string, string> = { USPS: "usps", UPS: "ups", FedEx: "fedex", DHL: "dhl" };

/** Published brand colours. Background, then the text colour that sits on it. */
const BRAND: Record<string, { bg: string; fg: string }> = {
  USPS: { bg: "#004B87", fg: "#FFFFFF" },
  UPS: { bg: "#351C15", fg: "#FFB500" },
  FedEx: { bg: "#4D148C", fg: "#FFFFFF" },
  DHL: { bg: "#FFCC00", fg: "#D40511" },
};

const DEFAULT_BRAND = { bg: "#2b2320", fg: "#fff8ee" };

export function CarrierLogo({ carrier, size = 44, className, inverted }: { carrier: string; size?: number; className?: string; inverted?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  const slug = SLUG[carrier];
  const brand = BRAND[carrier] ?? DEFAULT_BRAND;

  // A cached file can finish loading before hydration, so check once on mount.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);

  const label = carrier.length > 7 ? carrier.slice(0, 7) : carrier;

  return (
    <div
      className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-[12px]", loaded && "bg-surface p-[12%]", inverted && "ring-2 ring-ink", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={carrier}
    >
      {!loaded && (
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
      {slug && (
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={ref} src={`/carriers/${slug}.svg`} alt="" width={size} height={size} onLoad={() => setLoaded(true)} className={cn("h-full w-full object-contain", !loaded && "absolute h-0 w-0 opacity-0")} />
      )}
    </div>
  );
}
