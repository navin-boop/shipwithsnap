import Link from "next/link";
import { cn } from "@/lib/cn";

/** "SNAP." — Syne 800 uppercase with an electric full stop. */
export function Wordmark({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("disp uppercase text-[22px] hover:text-ink", className)}>
      Snap<span className="text-electric">.</span>
    </Link>
  );
}
