"use client";

import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/money";
import { CarrierLogo } from "./CarrierLogo";

// Spec: design/SunnyShip.dc.html — rates are rounded cards. Selected = yellow card with a 2px ink
// outline, offset shadow and a rotated sticker badge; others are quiet white cards.
export interface RateRowProps {
  carrier: string; // "USPS"
  service: string; // "Ground Advantage"
  /** e.g. "Mon, Sep 7" */
  eta: string;
  days: number;
  /** "Cheapest" | "Fastest" | undefined */
  tag?: string;
  retailCents: number | null;
  priceCents: number;
  selected?: boolean;
  onSelect?: () => void;
  /** Force the phone layout at every width. */
  compact?: boolean;
  /** Extra line under the service — SmartRate confidence, guaranteed delivery. */
  note?: string;
}

export function RateRow({ carrier, service, eta, days, tag, retailCents, priceCents, selected, onSelect, compact, note }: RateRowProps) {
  const saves = retailCents !== null && retailCents > priceCents ? retailCents - priceCents : null;
  return (
    <div
      role="option"
      aria-selected={selected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.();
        }
      }}
      className={cn(
        "relative grid cursor-pointer items-center gap-3.5 rounded-row border-2 px-4 py-3.5 outline-none transition-transform sm:px-[18px]",
        compact ? "grid-cols-[40px_minmax(0,1fr)_auto]" : "grid-cols-[44px_minmax(0,1fr)_auto]",
        selected ? "border-ink bg-yellow offset-shadow" : "border-hairline bg-surface hover:border-ink",
        "focus-visible:border-teal",
      )}
    >
      {tag && (
        <div
          className={cn(
            "absolute -top-3.5 rounded-pill border-2 border-ink px-3 py-1 text-[12px] font-extrabold text-white",
            tag === "Cheapest" ? "left-4 -rotate-3 bg-coral" : "right-4 rotate-2 bg-teal",
          )}
        >
          {tag}!
        </div>
      )}
      <CarrierLogo carrier={carrier} size={compact ? 40 : 44} inverted={selected} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className={cn("disp", selected ? "text-[20px] sm:text-[22px]" : "text-base font-extrabold")}>{service}</div>
        <div className={cn("text-[13px] font-bold", selected ? "text-ink" : "text-muted")}>
          {eta}{days ? ` · ${days} day${days === 1 ? "" : "s"}` : ""}
          {retailCents !== null && !compact && <span className="hidden sm:inline"> · <span className="line-through">{formatCents(retailCents)}</span> at the counter</span>}
        </div>
        {note && <div className={cn("text-[12px] font-extrabold", selected ? "text-ink/70" : "text-teal")}>{note}</div>}
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <div className={cn("disp", selected ? "text-[34px] sm:text-[40px]" : "text-[24px]")}>{formatCents(priceCents)}</div>
        {saves !== null && selected && <div className="text-[13px] font-extrabold text-teal">You save {formatCents(saves)}</div>}
        {retailCents !== null && !selected && <div className="text-[12px] font-bold text-muted line-through sm:hidden">{formatCents(retailCents)}</div>}
      </div>
    </div>
  );
}
