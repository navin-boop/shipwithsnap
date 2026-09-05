import Link from "next/link";
import { cn } from "@/lib/cn";

/** "snap" + coral dot — Sora 800 lowercase. */
export function Wordmark({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("disp inline-flex items-center gap-1 text-[26px] hover:text-ink", className)}>
      snap
      <span className="inline-block h-3 w-3 rounded-pill bg-coral" aria-hidden="true" />
    </Link>
  );
}
