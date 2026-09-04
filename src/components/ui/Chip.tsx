import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

// Spec: design/Components.dc.html — "Chips · toggles · 36–44 tall".
// Used for package type, extras, status filters, date ranges.
export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  /** Optional trailing count, rendered at 60% opacity (filter tabs). */
  count?: number | string;
  size?: "sm" | "md"; // 36 | 44
}

export function Chip({ selected, count, size = "sm", className, children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-2 whitespace-nowrap border-[1.5px] border-ink px-3.5 text-[11px] font-semibold uppercase tracking-[0.8px] cursor-pointer select-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric",
        size === "md" ? "h-11" : "h-9",
        selected ? "bg-ink text-paper" : "bg-transparent text-ink",
        className,
      )}
      {...rest}
    >
      <span>{children}</span>
      {count !== undefined && <span className="opacity-60">{count}</span>}
    </button>
  );
}
