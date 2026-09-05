"use client";

import Link from "next/link";
import { useState } from "react";
import { Wordmark } from "@/components/ui";
import { cn } from "@/lib/cn";

// Spec: design/SunnyLanding.dc.html header — 76px, bold nav, "Start free" ink pill with yellow text.
const LINKS = [
  ["/rates", "Rates"],
  ["/#how", "How it works"],
  ["/#faq", "Questions"],
  ["/#pricing", "Pricing"],
] as const;

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="relative z-10">
      <div className="box-border flex h-[76px] items-center justify-between px-6 sm:px-16">
        <Wordmark className="text-[28px]" />
        <nav className="hidden gap-7 text-[15px] font-extrabold text-muted md:flex">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} className="hover:text-ink">{label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-[15px] font-extrabold sm:gap-5">
          <Link href="/login" className="hidden text-muted hover:text-ink sm:block">Log in</Link>
          <Link href="/signup" className="flex h-11 items-center rounded-pill bg-ink px-5 text-yellow hover:text-yellow">Start free</Link>
          <button type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)} className="flex h-11 w-11 items-center justify-center rounded-pill border-2 border-ink bg-surface md:hidden">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>
      <nav className={cn("mx-4 flex-col gap-1 rounded-card border-2 border-ink bg-surface p-3 text-[16px] font-extrabold offset-shadow md:hidden", open ? "flex" : "hidden")}>
        {LINKS.map(([href, label]) => (
          <Link key={href} href={href} onClick={() => setOpen(false)} className="rounded-pill px-4 py-3 hover:bg-paper">{label}</Link>
        ))}
        <Link href="/login" onClick={() => setOpen(false)} className="rounded-pill px-4 py-3 sm:hidden">Log in</Link>
      </nav>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="flex flex-col gap-4 px-6 py-10 text-[14px] font-bold text-muted sm:flex-row sm:items-center sm:justify-between sm:px-16">
      <Wordmark className="text-[22px]" />
      <nav className="flex flex-wrap gap-6">
        <Link href="/rates">Rates</Link>
        <Link href="/docs">API docs</Link>
        <Link href="/signup">Sign up</Link>
        <Link href="/login">Log in</Link>
      </nav>
      <div>© {new Date().getFullYear()} Ship with Snap · USPS, UPS and FedEx labels</div>
    </footer>
  );
}
