import Link from "next/link";
import { company } from "@/lib/company";

// A quiet strip inside the app: the legal routes a customer or a payment
// processor expects to reach from any page, without competing with the product.
const LINKS: Array<[string, string]> = [
  ["/legal/terms", "Terms"],
  ["/legal/privacy", "Privacy"],
  ["/legal/refunds", "Refunds"],
  ["/legal/acceptable-use", "Acceptable use"],
  ["/lowest-price-guarantee", "Price guarantee"],
  ["/contact", "Contact"],
  ["/faq", "Help"],
];

export function AppFooter() {
  return (
    <footer className="mt-auto flex flex-col gap-2 border-t-2 border-hairline px-6 py-5 text-[13px] font-bold text-muted sm:flex-row sm:items-center sm:justify-between sm:px-10">
      <div>© {new Date().getFullYear()} {company.legalName} · {company.brand} is a shipping platform, not a carrier</div>
      <nav aria-label="Legal and help" className="flex flex-wrap gap-x-5 gap-y-1">
        {LINKS.map(([href, label]) => (
          <Link key={href} href={href} className="hover:text-ink">{label}</Link>
        ))}
      </nav>
    </footer>
  );
}
