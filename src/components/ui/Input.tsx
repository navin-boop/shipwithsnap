import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

// Spec: design/Components.dc.html — "Inputs · underline only".
// 44px tall, 2px ink underline, 15px Archivo 500; focus → electric; error → danger + 12px message.
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
    <div className={cn("flex flex-col gap-1", className)}>
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
            "w-full bg-transparent border-0 border-b-2 border-ink font-medium text-ink outline-none",
            "placeholder:text-muted focus:border-electric",
            size === "lg" ? "h-14 text-[28px]" : "h-11 text-[15px]",
            unit && "pr-8",
            error && "border-danger focus:border-danger",
          )}
          {...rest}
        />
        {unit && (
          <span className="pointer-events-none absolute right-0 bottom-3 text-[13px] text-muted">
            {unit}
          </span>
        )}
      </div>
      {error && <div className="text-xs text-danger">{error}</div>}
    </div>
  );
});
