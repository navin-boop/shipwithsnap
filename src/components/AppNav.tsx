"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/ui/Wordmark";
import { cn } from "@/lib/cn";

// Spec: design/SunnyShip.dc.html header — 72px, pill nav, active = ink pill with yellow text.
// The everyday screens sit in the bar; the rest live behind "More" so the bar stays readable.
const items = [
  { href: "/ship", label: "Ship" },
  { href: "/shipments", label: "Shipments" },
  { href: "/batch", label: "Batch" },
  { href: "/pickups", label: "Pickups" },
  { href: "/reports", label: "Reports" },
  { href: "/billing", label: "Billing" },
  { href: "/settings", label: "Settings" },
];

const more = [
  { href: "/track", label: "Track a package", hint: "Any carrier, any number" },
  { href: "/manifests", label: "End-of-day manifest", hint: "One barcode for the driver" },
  { href: "/claims", label: "Insurance claims", hint: "Lost, damaged or stolen" },
  { href: "/addresses", label: "Address book", hint: "Saved recipients" },
];

export interface AppNavProps {
  /** e.g. "Visa ·· 4242"; omitted until a card is saved. */
  cardLabel?: string;
}

export function AppNav({ cardLabel }: AppNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const moreActive = more.some((m) => pathname === m.href || pathname.startsWith(m.href + "/"));

  return (
    <header className="box-border flex h-[72px] items-center justify-between gap-4 px-4 sm:px-10">
      <div className="flex min-w-0 items-center gap-5 sm:gap-9">
        <Wordmark />
        <nav className="flex items-center gap-0.5 overflow-x-auto whitespace-nowrap">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-pill px-3.5 py-2 text-[15px] font-extrabold",
                  active ? "bg-ink text-yellow hover:text-yellow" : "text-muted hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="relative" ref={wrap}>
            <button
              type="button"
              aria-expanded={open}
              aria-haspopup="menu"
              onClick={() => setOpen(!open)}
              className={cn("flex items-center gap-1.5 rounded-pill px-3.5 py-2 text-[15px] font-extrabold", moreActive ? "bg-ink text-yellow" : "text-muted hover:text-ink")}
            >
              More
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </button>
            {open && (
              <div role="menu" className="card absolute right-0 top-[calc(100%+8px)] z-30 flex w-[260px] flex-col gap-1 p-2">
                {more.map((m) => (
                  <Link key={m.href} href={m.href} role="menuitem" onClick={() => setOpen(false)} className={cn("flex flex-col gap-0.5 rounded-[14px] px-3 py-2 hover:bg-paper", pathname.startsWith(m.href) && "bg-paper")}>
                    <span className="text-[15px] font-extrabold text-ink">{m.label}</span>
                    <span className="text-[12px] font-bold text-muted">{m.hint}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        {cardLabel && <div className="hidden text-[14px] font-extrabold text-muted md:block">{cardLabel}</div>}
        <div className="h-9 w-9 rounded-pill border-2 border-ink bg-teal" aria-hidden="true" />
      </div>
    </header>
  );
}
