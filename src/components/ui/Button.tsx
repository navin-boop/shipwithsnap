import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

// Spec: design/Components.dc.html — "Buttons · 40 / 48 / 56 tall · square · uppercase 600".
export type ButtonVariant =
  | "primary" // electric bg, white text — the one action per screen
  | "secondary" // ink bg, paper text
  | "outline" // 1.5px ink border
  | "onInk" // lime bg, ink text — only on ink panels
  | "onInkOutline" // paper border, paper text — secondary action on ink panels
  | "text"; // underlined text link

export type ButtonSize = "sm" | "md" | "lg";

const sizes: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-[11px] tracking-[0.8px]",
  md: "h-12 px-[22px] text-xs tracking-[1px]",
  lg: "h-14 px-8 text-sm tracking-[1px]",
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-electric text-white",
  secondary: "bg-ink text-paper",
  outline: "border-[1.5px] border-ink text-ink",
  onInk: "bg-lime text-ink",
  onInkOutline: "border-[1.5px] border-paper text-paper",
  text: "h-auto px-0 pb-0.5 border-b-2 border-current",
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
        "inline-flex items-center justify-center gap-3 font-semibold uppercase cursor-pointer select-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric",
        sizes[size],
        disabled
          ? "border-[1.5px] border-hairline text-hairline bg-transparent cursor-not-allowed"
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
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}
