import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

// Same shell as Input: 50px, 2px ink outline, 14px radius, bold 16px text, coral on focus.
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ label, error, options, className, id, ...rest }, ref) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={selectId} className={cn("lbl", error && "text-danger")}>
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          className={cn(
            "box-border h-[50px] w-full appearance-none rounded-field border-2 border-ink bg-surface pl-4 pr-10 text-base font-bold text-ink outline-none",
            "focus:border-coral focus:bg-coral-soft disabled:border-hairline disabled:bg-paper disabled:text-muted",
            error && "border-danger focus:border-danger focus:bg-surface",
          )}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink"><path d="m6 9 6 6 6-6" /></svg>
      </div>
      {error && <div className="text-[13px] font-bold text-danger">{error}</div>}
    </div>
  );
});
