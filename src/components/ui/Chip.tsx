import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

// Spec: design/SunnyShip.dc.html — pills, 2px ink outline; selected = teal fill, white text.
export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  /** Optional trailing count, rendered at 70% opacity (filter tabs). */
  count?: number | string;
  size?: "sm" | "md"; // 38 | 44
}

export function Chip({ selected, count, size = "sm", className, children, disabled, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2 rounded-pill border-2 px-4 text-[14px] font-extrabold cursor-pointer select-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal",
        size === "md" ? "h-11" : "h-[38px]",
        selected ? "border-ink bg-teal text-white" : "border-ink bg-surface text-ink hover:bg-paper",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
      {...rest}
    >
      <span>{children}</span>
      {count !== undefined && <span className="opacity-70">{count}</span>}
    </button>
  );
}
