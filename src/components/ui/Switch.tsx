import { cn } from "@/lib/cn";

// Sunny switch: 54×30 pill, 2px ink outline; on = teal track, white knob right; off = white track, ink knob left.
export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, className, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "box-border flex h-[30px] w-[54px] items-center rounded-pill border-2 border-ink p-0.5 cursor-pointer transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal",
        checked ? "justify-end bg-teal" : "justify-start bg-surface",
        disabled && "opacity-40 cursor-not-allowed",
        className,
      )}
    >
      <span className={cn("block h-5 w-5 rounded-pill", checked ? "bg-white" : "bg-ink")} />
    </button>
  );
}
