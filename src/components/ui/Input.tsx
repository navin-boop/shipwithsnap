import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

// Spec: design/SunnyShip.dc.html — 50px, 2px ink outline, 14px radius, bold 16px text.
// Focus → coral outline + soft coral fill; error → danger outline + message.
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  /** Right-aligned unit hint, e.g. "in" or "lb". */
  unit?: string;
  /** Larger variant used for the phone weight field. */
  size?: "md" | "lg";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, unit, size = "md", className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={inputId} className={cn("lbl", error && "text-danger")}>
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          className={cn(
            "box-border w-full rounded-field border-2 border-ink bg-surface px-4 font-bold text-ink outline-none",
            "placeholder:font-semibold placeholder:text-muted/70 focus:border-coral focus:bg-coral-soft",
            "disabled:border-hairline disabled:bg-paper disabled:text-muted",
            size === "lg" ? "h-16 text-[28px]" : "h-[50px] text-base",
            unit && "pr-10",
            error && "border-danger focus:border-danger focus:bg-surface",
          )}
          {...rest}
        />
        {unit && (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-bold text-muted">
            {unit}
          </span>
        )}
      </div>
      {error && <div className="text-[13px] font-bold text-danger">{error}</div>}
    </div>
  );
});
