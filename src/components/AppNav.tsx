"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/ui/Wordmark";
import { cn } from "@/lib/cn";

// Spec: design/SunnyShip.dc.html header — 72px, pill nav, active = ink pill with yellow text.
const items = [
  { href: "/ship", label: "Ship" },
  { href: "/shipments", label: "Shipments" },
  { href: "/batch", label: "Batch" },
  { href: "/reports", label: "Reports" },
  { href: "/billing", label: "Billing" },
  { href: "/settings", label: "Settings" },
];

export interface AppNavProps {
  /** e.g. "Visa ·· 4242"; omitted until a card is saved. */
  cardLabel?: string;
}

export function AppNav({ cardLabel }: AppNavProps) {
  const pathname = usePathname();
  return (
    <header className="box-border flex h-[72px] items-center justify-between gap-4 px-4 sm:px-10">
      <div className="flex min-w-0 items-center gap-5 sm:gap-9">
        <Wordmark />
        <nav className="flex gap-0.5 overflow-x-auto whitespace-nowrap">
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
        </nav>
      </div>
      <div className="flex items-center gap-3">
        {cardLabel && <div className="hidden text-[14px] font-extrabold text-muted md:block">{cardLabel}</div>}
        <div className="h-9 w-9 rounded-pill border-2 border-ink bg-teal" aria-hidden="true" />
      </div>
    </header>
  );
}
