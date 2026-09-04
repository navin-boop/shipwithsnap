"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const SECTIONS = [
  ["/settings/store", "Store"],
  ["/settings/printing", "Printing"],
  ["/settings/ship-from", "Ship-from addresses"],
  ["/settings/team", "Team"],
  ["/settings/customer-emails", "Customer emails"],
  ["/settings/api", "API & webhooks"],
] as const;

export function SettingsNav() {
  const path = usePathname();
  return (
    <nav className="flex flex-row flex-wrap gap-x-5 lg:flex-col lg:gap-0">
      {SECTIONS.map(([href, label]) => {
        const active = path.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("py-3 text-[13px] font-semibold uppercase tracking-[0.8px] lg:border-b lg:border-hairline", active ? "text-ink" : "text-muted hover:text-ink")}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
