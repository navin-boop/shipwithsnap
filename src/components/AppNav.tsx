"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type RefObject } from "react";
import { Wordmark } from "@/components/ui/Wordmark";
import { logOut } from "@/lib/auth/actions";
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

const account = [
  { href: "/settings", label: "Account settings" },
  { href: "/settings/team", label: "Team" },
  { href: "/billing", label: "Billing and receipts" },
];

export interface AppNavProps {
  /** e.g. "Visa ·· 4242"; omitted until a card is saved. */
  cardLabel?: string;
  /** Who is signed in — shown in the account menu so a shared machine is obvious. */
  userEmail: string;
  userName?: string | null;
  role?: string;
}

/** Close on a click outside or on Escape. Both menus need it, so it lives in one place. */
function useDismiss(open: boolean, close: () => void, ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open, close, ref]);
}

function initials(name: string | null | undefined, email: string): string {
  const from = (name ?? "").trim();
  if (from) {
    const parts = from.split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "")).toUpperCase();
  }
  return (email[0] ?? "?").toUpperCase();
}

export function AppNav({ cardLabel, userEmail, userName, role }: AppNavProps) {
  const pathname = usePathname();
  const [openMore, setOpenMore] = useState(false);
  const [openAccount, setOpenAccount] = useState(false);
  const [signingOut, startSignOut] = useTransition();
  const moreWrap = useRef<HTMLDivElement>(null);
  const accountWrap = useRef<HTMLDivElement>(null);

  useDismiss(openMore, () => setOpenMore(false), moreWrap);
  useDismiss(openAccount, () => setOpenAccount(false), accountWrap);

  const moreActive = more.some((m) => pathname === m.href || pathname.startsWith(m.href + "/"));

  return (
    <header className="box-border flex h-[72px] items-center justify-between gap-4 px-4 sm:px-10">
      <div className="flex min-w-0 items-center gap-5 sm:gap-9">
        {/* Inside the app the wordmark is the app's home, not the marketing page — clicking it
            while signed in used to land on the landing page, which offers you a login. */}
        <Wordmark href="/ship" />
        {/* The links scroll on a narrow screen; "More" sits outside that scroller, because an
            overflow container clips an absolutely positioned menu — which is why the dropdown
            opened into a 40px-tall box and looked broken. */}
        <nav className="flex min-w-0 items-center gap-0.5">
          <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto whitespace-nowrap">
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
          </div>
          <div className="relative shrink-0" ref={moreWrap}>
            <button
              type="button"
              aria-expanded={openMore}
              aria-haspopup="menu"
              onClick={() => { setOpenMore(!openMore); setOpenAccount(false); }}
              className={cn("flex items-center gap-1.5 rounded-pill px-3.5 py-2 text-[15px] font-extrabold", moreActive ? "bg-ink text-yellow" : "text-muted hover:text-ink")}
            >
              More
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cn("transition-transform", openMore && "rotate-180")}><path d="m6 9 6 6 6-6" /></svg>
            </button>
            {openMore && (
              <div role="menu" className="card absolute left-0 top-[calc(100%+8px)] z-30 flex w-[260px] flex-col gap-1 p-2">
                {more.map((m) => (
                  <Link key={m.href} href={m.href} role="menuitem" onClick={() => setOpenMore(false)} className={cn("flex flex-col gap-0.5 rounded-[14px] px-3 py-2 hover:bg-paper", pathname.startsWith(m.href) && "bg-paper")}>
                    <span className="text-[15px] font-extrabold text-ink">{m.label}</span>
                    <span className="text-[12px] font-bold text-muted">{m.hint}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {cardLabel && <div className="hidden text-[14px] font-extrabold text-muted md:block">{cardLabel}</div>}
        <div className="relative" ref={accountWrap}>
          <button
            type="button"
            aria-expanded={openAccount}
            aria-haspopup="menu"
            aria-label={`Account menu for ${userEmail}`}
            onClick={() => { setOpenAccount(!openAccount); setOpenMore(false); }}
            className="flex h-9 w-9 items-center justify-center rounded-pill border-2 border-ink bg-teal text-[13px] font-extrabold text-white"
          >
            {initials(userName, userEmail)}
          </button>
          {openAccount && (
            <div role="menu" className="card absolute right-0 top-[calc(100%+8px)] z-30 flex w-[268px] flex-col gap-1 p-2">
              <div className="flex flex-col gap-0.5 border-b-2 border-hairline px-3 pb-3 pt-2">
                {userName && <span className="text-[15px] font-extrabold text-ink">{userName}</span>}
                <span className="truncate text-[13px] font-bold text-muted">{userEmail}</span>
                {role && <span className="text-[12px] font-bold capitalize text-muted">{role}</span>}
              </div>
              {account.map((a) => (
                <Link key={a.href} href={a.href} role="menuitem" onClick={() => setOpenAccount(false)} className="rounded-[14px] px-3 py-2 text-[15px] font-extrabold text-ink hover:bg-paper">
                  {a.label}
                </Link>
              ))}
              <button
                type="button"
                role="menuitem"
                disabled={signingOut}
                onClick={() => startSignOut(async () => { await logOut(); })}
                className="mt-1 rounded-[14px] border-t-2 border-hairline px-3 py-2 pt-3 text-left text-[15px] font-extrabold text-danger hover:bg-paper disabled:opacity-60"
              >
                {signingOut ? "Logging out…" : "Log out"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
