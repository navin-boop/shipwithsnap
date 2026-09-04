"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/ui/Wordmark";
import { cn } from "@/lib/cn";

// Spec: the header on every app artboard (design/Main.dc.html etc.):
// 56px tall, 2px ink rule, 40px gutters, 12px uppercase items, active item underlined 2px.
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
    <header className="box-border flex h-14 items-center justify-between border-b-2 border-ink px-10">
      <div className="flex items-center gap-9">
        <Wordmark />
        <nav className="flex gap-[22px]">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "pt-1 pb-0.5 text-xs font-semibold uppercase tracking-[0.8px] border-b-2",
                  active ? "text-ink border-ink" : "text-muted border-transparent hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        {cardLabel && (
          <div className="text-xs font-semibold uppercase tracking-[0.8px]">
            <span className="text-muted">Card </span>
            {cardLabel}
          </div>
        )}
        <div className="h-7 w-7 bg-ink" aria-hidden="true" />
      </div>
    </header>
  );
}
