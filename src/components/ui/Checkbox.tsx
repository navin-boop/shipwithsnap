import { cn } from "@/lib/cn";

// Sunny checkbox: 22px rounded square, 2px ink outline; checked = teal fill with a white tick.
export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
  /** Renders the outline in paper — for use on ink rows. */
  onInk?: boolean;
}

export function Checkbox({ checked, onChange, label, className, onInk }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] border-2 cursor-pointer",
        checked ? "border-teal bg-teal text-white" : onInk ? "border-paper bg-transparent" : "border-ink bg-surface",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal",
        className,
      )}
    >
      {checked && (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m3 8 3 3 7-7" />
        </svg>
      )}
    </button>
  );
}
