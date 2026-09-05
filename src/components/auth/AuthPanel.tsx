import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/ui";
import { cn } from "@/lib/cn";

// Sunny sign-in: cream page with blobs, the promise on the left, a card on the right.
export function AuthPanel({ mode, children }: { mode: "signup" | "login"; children: ReactNode }) {
  return (
    <div className="relative grid min-h-screen grid-cols-1 overflow-hidden bg-paper lg:grid-cols-2">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-[60%] h-[380px] w-[380px] rounded-pill bg-yellow/60" />
      <div aria-hidden="true" className="pointer-events-none absolute right-[-120px] top-[-140px] h-[420px] w-[420px] rounded-pill bg-[#ffb4a2]/60" />

      <aside className="relative hidden flex-col justify-between p-12 lg:flex">
        <Wordmark className="text-[30px]" />
        <div className="flex flex-col gap-5">
          <h1 className="disp text-[56px] leading-[0.98]">
            Your first label is about <span className="text-coral">90 seconds</span> away.
          </h1>
          <p className="max-w-[420px] text-[17px] font-semibold leading-[1.55] text-ink-2">No plan, nothing to prepay. Add a card only when you buy your first label.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {["USPS", "UPS", "FedEx", "Shopify", "Etsy"].map((s) => (
            <span key={s} className="rounded-pill border-2 border-ink bg-surface px-3 py-1 text-[13px] font-extrabold">{s}</span>
          ))}
        </div>
      </aside>

      <main className="relative flex flex-col justify-center gap-6 px-5 py-10 sm:px-12 lg:px-16">
        <div className="flex items-center justify-between lg:hidden">
          <Wordmark />
        </div>
        <div className="card flex w-full max-w-[520px] flex-col gap-6 p-6 sm:p-8">
          <nav className="flex gap-2">
            <Tab href="/signup" active={mode === "signup"}>Create account</Tab>
            <Tab href="/login" active={mode === "login"}>Log in</Tab>
          </nav>
          {children}
        </div>
      </main>
    </div>
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn("rounded-pill px-4 py-2 text-[15px] font-extrabold", active ? "bg-ink text-yellow hover:text-yellow" : "text-muted hover:text-ink")}
    >
      {children}
    </Link>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 border-t-2 border-hairline" />
      <div className="lbl">or</div>
      <div className="flex-1 border-t-2 border-hairline" />
    </div>
  );
}

export function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}
