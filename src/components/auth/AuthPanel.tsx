import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/ui";
import { cn } from "@/lib/cn";

// Spec: design/Auth.dc.html — ink panel left with the promise, form right with Create account / Log in tabs.
export function AuthPanel({ mode, children }: { mode: "signup" | "login"; children: ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-paper lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-ink p-10 text-paper lg:flex">
        <Wordmark className="text-2xl text-paper hover:text-paper" />
        <div className="flex flex-col gap-5">
          <h1 className="disp text-[52px] leading-[0.92]">
            Your first label is about <span className="text-lime">90 seconds</span> away.
          </h1>
          <p className="max-w-[380px] text-[15px] leading-[1.55] text-muted-on-ink">
            No plan, nothing to prepay. Add a card only when you buy your first label.
          </p>
        </div>
        <div className="lbl">USPS · UPS · Shopify · Etsy</div>
      </aside>

      <main className="flex flex-col justify-center gap-7 px-6 py-10 sm:px-16">
        <div className="flex items-center justify-between lg:hidden">
          <Wordmark />
        </div>
        <nav className="flex gap-6">
          <Tab href="/signup" active={mode === "signup"}>
            Create account
          </Tab>
          <Tab href="/login" active={mode === "login"}>
            Log in
          </Tab>
        </nav>
        {children}
      </main>
    </div>
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "border-b-2 py-1.5 text-xs font-semibold uppercase tracking-[1px]",
        active ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 border-t border-ink" />
      <div className="lbl">or</div>
      <div className="flex-1 border-t border-ink" />
    </div>
  );
}

export function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}
