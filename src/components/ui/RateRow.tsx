import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/money";

// Spec: design/Components.dc.html — "Rate row · the core component" and design/Main.dc.html.
// Unselected: 16px name, 22px price. Selected: inverted to ink, name 22px, price 36px in lime.
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
  /** Compact variant for the phone layout (two columns instead of four). */
  compact?: boolean;
}

export function RateRow({
  carrier,
  service,
  eta,
  days,
  tag,
  retailCents,
  priceCents,
  selected,
  onSelect,
  compact,
}: RateRowProps) {
  const sub = selected ? "text-muted-on-ink" : "text-muted";
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
        "items-center border-b border-ink cursor-pointer outline-none focus-visible:bg-surface",
        compact
          ? "flex justify-between px-5 py-4"
          : "grid grid-cols-[1.7fr_1fr_0.7fr_0.8fr] px-8 py-3.5",
        selected ? "bg-ink text-paper" : "bg-transparent text-ink",
      )}
    >
      <div className="flex flex-col gap-0.5">
        <div className={cn("disp", selected ? "text-[22px]" : "text-base")}>
          {carrier} {service}
        </div>
        <div className={cn("text-[11px] uppercase tracking-[0.8px]", sub)}>
          {compact ? `${eta} · ${tag ?? `${days} days`}` : tag}
        </div>
      </div>
      {!compact && (
        <>
          <div className={cn("text-[13px] uppercase tracking-[0.4px]", sub)}>
            {eta} · {days} days
          </div>
          <div className={cn("text-sm line-through", sub)}>
            {retailCents !== null ? formatCents(retailCents) : ""}
          </div>
        </>
      )}
      <div className={cn("flex flex-col items-end", !compact && "text-right")}>
        <div
          className={cn(
            "disp",
            selected ? "text-lime" : "text-ink",
            compact ? "text-[22px]" : selected ? "text-4xl" : "text-[22px]",
          )}
        >
          {formatCents(priceCents)}
        </div>
        {compact && retailCents !== null && (
          <div className={cn("text-[11px] line-through", sub)}>{formatCents(retailCents)}</div>
        )}
      </div>
    </div>
  );
}
