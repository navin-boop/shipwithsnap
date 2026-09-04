import { cn } from "@/lib/cn";

// Spec: design/Components.dc.html — 16px box, 1.5px ink border, checked = 8px ink square inside.
export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
  /** Renders the inner mark in paper — for use on ink rows. */
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
        "flex h-4 w-4 shrink-0 items-center justify-center border-[1.5px] cursor-pointer",
        onInk ? "border-paper" : "border-ink",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric",
        className,
      )}
    >
      {checked && <span className={cn("block h-2 w-2", onInk ? "bg-paper" : "bg-ink")} />}
    </button>
  );
}
