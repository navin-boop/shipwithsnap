import Link from "next/link";
import { Wordmark } from "@/components/ui";

// Spec: design/Landing.dc.html header — 64px, 2px rule, 64px gutters.
export function MarketingNav() {
  return (
    <header className="box-border flex h-16 items-center justify-between border-b-2 border-ink px-6 sm:px-16">
      <Wordmark className="text-2xl" />
      <nav className="hidden gap-7 text-xs font-semibold uppercase tracking-[0.8px] md:flex">
        <Link href="/rates" className="hover:text-electric">Rates</Link>
        <Link href="/#how" className="hover:text-electric">How it works</Link>
        <Link href="/#faq" className="hover:text-electric">Questions</Link>
        <Link href="/#pricing" className="hover:text-electric">Pricing</Link>
      </nav>
      <div className="flex items-center gap-6 text-xs font-semibold uppercase tracking-[0.8px]">
        <Link href="/login" className="hover:text-electric">Log in</Link>
        <Link href="/signup" className="flex h-10 items-center bg-ink px-[18px] text-paper hover:text-paper">Start free</Link>
      </div>
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
        <Link href="/help">Help</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
      </nav>
      <div>© {new Date().getFullYear()} Ship with Snap</div>
    </footer>
  );
}
