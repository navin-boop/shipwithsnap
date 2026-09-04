import { cn } from "@/lib/cn";

// Spec: design/Components.dc.html — switch 52×28, 2px ink border; on = ink fill with lime knob (right),
// off = transparent with ink knob (left).
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
        "box-border flex h-7 w-[52px] items-center border-2 border-ink p-0.5 cursor-pointer",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric",
        checked ? "justify-end bg-ink" : "justify-start bg-transparent",
        disabled && "opacity-40 cursor-not-allowed",
        className,
      )}
    >
      <span className={cn("block h-5 w-5", checked ? "bg-lime" : "bg-ink")} />
    </button>
  );
}
