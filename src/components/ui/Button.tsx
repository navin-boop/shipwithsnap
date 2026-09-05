import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

// Spec: design/SunnyShip.dc.html — pills, 2px ink outline, coral primary with an offset hard shadow.
export type ButtonVariant =
  | "primary" // coral pill, ink outline, offset shadow — the one action per screen
  | "secondary" // ink pill, yellow text
  | "outline" // white pill, ink outline
  | "onInk" // yellow pill on dark panels
  | "onInkOutline" // cream outline on dark panels
  | "text"; // underlined coral text

export type ButtonSize = "sm" | "md" | "lg";

const sizes: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-[13px]",
  md: "h-12 px-[22px] text-[14px]",
  lg: "h-[58px] px-7 text-[16px]",
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-coral text-white border-2 border-ink offset-shadow hover:translate-x-[1px] hover:translate-y-[1px] hover:[box-shadow:4px_4px_0_var(--color-ink)]",
  secondary: "bg-ink text-yellow border-2 border-ink",
  outline: "bg-surface text-ink border-2 border-ink hover:bg-paper",
  onInk: "bg-yellow text-ink border-2 border-yellow",
  onInkOutline: "bg-transparent text-paper border-2 border-paper/70 hover:border-paper",
  text: "h-auto px-0 text-coral underline underline-offset-4 decoration-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Trailing icon, e.g. the arrow on "Buy label". */
  icon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2.5 rounded-pill font-display font-extrabold cursor-pointer select-none transition-transform",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal",
        sizes[size],
        disabled
          ? "border-2 border-hairline bg-surface text-hairline cursor-not-allowed shadow-none"
          : variants[variant],
        className,
      )}
      {...rest}
    >
      <span>{children}</span>
      {icon}
    </button>
  );
}

/** The 18px arrow used on primary actions ("Buy label →"). */
export function ArrowIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}
