"use client";

import Link from "next/link";
import { useState } from "react";
import { Wordmark } from "@/components/ui";
import { cn } from "@/lib/cn";

// Spec: design/Landing.dc.html header — 64px, 2px rule, 64px gutters. Collapses to a menu on phones.
const LINKS = [
  ["/rates", "Rates"],
  ["/#how", "How it works"],
  ["/#faq", "Questions"],
  ["/#pricing", "Pricing"],
] as const;

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="border-b-2 border-ink">
      <div className="box-border flex h-16 items-center justify-between px-6 sm:px-16">
        <Wordmark className="text-2xl" />
        <nav className="hidden gap-7 text-xs font-semibold uppercase tracking-[0.8px] md:flex">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} className="hover:text-electric">{label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.8px] sm:gap-6">
          <Link href="/login" className="hidden hover:text-electric sm:block">Log in</Link>
          <Link href="/signup" className="flex h-10 items-center bg-ink px-[18px] text-paper hover:text-paper">Start free</Link>
          <button type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)} className="flex h-10 w-10 items-center justify-center border-[1.5px] border-ink md:hidden">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>
      <nav className={cn("flex-col border-t-2 border-ink px-6 py-3 text-sm font-semibold uppercase tracking-[0.8px] md:hidden", open ? "flex" : "hidden")}>
        {LINKS.map(([href, label]) => (
          <Link key={href} href={href} onClick={() => setOpen(false)} className="border-b border-hairline py-3 last:border-b-0">{label}</Link>
        ))}
        <Link href="/login" onClick={() => setOpen(false)} className="py-3 sm:hidden">Log in</Link>
      </nav>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="flex flex-col gap-4 px-6 py-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-16">
      <Wordmark className="text-lg" />
      <nav className="flex flex-wrap gap-6 font-semibold uppercase tracking-[0.8px]">
        <Link href="/rates">Rates</Link>
        <Link href="/docs">API docs</Link>
        <Link href="/signup">Sign up</Link>
        <Link href="/login">Log in</Link>
      </nav>
      <div>© {new Date().getFullYear()} Ship with Snap · USPS, UPS and FedEx labels</div>
    </footer>
  );
}
