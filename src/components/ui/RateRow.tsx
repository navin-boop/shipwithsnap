"use client";

import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/money";

// Spec: design/Components.dc.html — "Rate row · the core component" and design/Main.dc.html.
// Unselected: 16px name, 22px price. Selected: inverted to ink, name 22px, price 36px in lime.
// Below the sm breakpoint it collapses to the phone layout from design/MobileShip.dc.html
// (name + eta on the left, price with retail beneath on the right).
export interface RateRowProps {
  carrier: string; // "USPS"
  service: string; // "Ground Advantage"
  /** e.g. "Mon Sep 7" */
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
}

export function RateRow({ carrier, service, eta, days, tag, retailCents, priceCents, selected, onSelect, compact }: RateRowProps) {
  const sub = selected ? "text-muted-on-ink" : "text-muted";
  const wide = !compact;
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
        "flex min-h-[64px] cursor-pointer items-center justify-between gap-4 border-b border-ink px-5 py-3.5 outline-none focus-visible:bg-surface",
        wide && "sm:grid sm:grid-cols-[1.7fr_1fr_0.7fr_0.8fr] sm:px-8",
        selected ? "bg-ink text-paper" : "bg-transparent text-ink",
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className={cn("disp", selected ? "text-[20px] sm:text-[22px]" : "text-base")}>
          {carrier} {service}
        </div>
        <div className={cn("text-[11px] uppercase tracking-[0.8px]", sub)}>
          <span className={cn(wide && "sm:hidden")}>{eta}{days ? ` · ${days} days` : ""}{tag ? ` · ${tag}` : ""}</span>
          {wide && <span className="hidden sm:inline">{tag ?? ""}</span>}
        </div>
      </div>
      {wide && (
        <>
          <div className={cn("hidden text-[13px] uppercase tracking-[0.4px] sm:block", sub)}>
            {eta}{days ? ` · ${days} days` : ""}
          </div>
          <div className={cn("hidden text-sm line-through sm:block", sub)}>{retailCents !== null ? formatCents(retailCents) : ""}</div>
        </>
      )}
      <div className="flex shrink-0 flex-col items-end">
        <div className={cn("disp", selected ? "text-lime" : "text-ink", selected ? "text-[28px] sm:text-4xl" : "text-[22px]")}>{formatCents(priceCents)}</div>
        {retailCents !== null && retailCents > priceCents && (
          <div className={cn("text-[11px] line-through", sub, wide && "sm:hidden")}>{formatCents(retailCents)}</div>
        )}
      </div>
    </div>
  );
}
