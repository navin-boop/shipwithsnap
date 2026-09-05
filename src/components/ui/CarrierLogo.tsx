"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Carrier mark. Renders the carrier's official logo from /public/carriers/<slug>.svg when that
 * file exists, otherwise a text badge. The logo files are trademarks and are NOT bundled with
 * the code — download them from each carrier's brand portal (see public/carriers/README.md)
 * and drop them in; nothing else changes.
 *
 * The badge shows until the image has actually loaded, so a missing file never flashes a
 * broken-image glyph (and a load error that fires before hydration is still caught).
 */
const SLUG: Record<string, string> = { USPS: "usps", UPS: "ups", FedEx: "fedex", DHL: "dhl" };
const FALLBACK_BG: Record<string, string> = { USPS: "bg-coral-soft", UPS: "bg-yellow/40", FedEx: "bg-teal-soft", DHL: "bg-yellow/40" };

export function CarrierLogo({ carrier, size = 44, className, inverted }: { carrier: string; size?: number; className?: string; inverted?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  const slug = SLUG[carrier];

  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <div
      className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-[12px]", loaded ? "bg-surface p-[15%]" : inverted ? "border-2 border-ink bg-surface" : FALLBACK_BG[carrier] ?? "bg-paper", className)}
      style={{ width: size, height: size }}
      aria-label={carrier}
    >
      {!loaded && <span className="font-display font-extrabold" style={{ fontSize: Math.max(10, Math.round(size * 0.25)) }}>{carrier}</span>}
      {slug && (
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={ref} src={`/carriers/${slug}.svg`} alt="" width={size} height={size} onLoad={() => setLoaded(true)} className={cn("h-full w-full object-contain", !loaded && "absolute h-0 w-0 opacity-0")} />
      )}
    </div>
  );
}
