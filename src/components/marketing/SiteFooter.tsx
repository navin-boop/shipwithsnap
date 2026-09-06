import Link from "next/link";
import { Wordmark } from "@/components/ui";
import { addressLine, company, hasAddress } from "@/lib/company";

// The site's main footer: real internal linking for search engines, and the
// company identity a payment processor and a buyer both expect to find.

const COLUMNS: Array<{ title: string; links: Array<[string, string]> }> = [
  {
    title: "Product",
    links: [
      ["/how-it-works", "How it works"],
      ["/pricing", "Pricing"],
      ["/rates", "Rate calculator"],
      ["/lowest-price-guarantee", "Lowest price guarantee"],
      ["/docs", "API documentation"],
    ],
  },
  {
    title: "Carriers",
    links: [
      ["/carriers", "Compare carriers"],
      ["/carriers/usps", "USPS shipping"],
      ["/carriers/ups", "UPS shipping"],
      ["/carriers/fedex", "FedEx shipping"],
      ["/carriers/dhl", "DHL Express"],
    ],
  },
  {
    title: "Company",
    links: [
      ["/about", "About us"],
      ["/contact", "Contact"],
      ["/faq", "Questions"],
      ["/signup", "Create an account"],
      ["/login", "Log in"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["/legal/terms", "Terms of Service"],
      ["/legal/privacy", "Privacy Policy"],
      ["/legal/refunds", "Refunds & voided labels"],
      ["/legal/acceptable-use", "Acceptable use"],
      ["/legal/cookies", "Cookies"],
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t-2 border-hairline bg-surface">
      <div className="flex flex-col gap-10 px-6 py-12 sm:px-16 lg:py-14">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.3fr_2.7fr]">
          <div className="flex flex-col gap-4">
            <Wordmark className="text-[26px]" />
            <p className="max-w-[300px] text-[15px] font-semibold leading-[1.55] text-ink-2">
              Commercial USPS, UPS, FedEx and DHL rates for small sellers. No monthly fee — you pay postage and nothing else.
            </p>
            <Link href="/lowest-price-guarantee" className="inline-flex w-fit items-center gap-2 rounded-pill border-2 border-ink bg-yellow px-3.5 py-2 text-[13px] font-extrabold text-ink hover:text-ink">
              <span aria-hidden="true">★</span> Lowest price guaranteed
            </Link>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.title} className="flex flex-col gap-3">
                <div className="lbl">{col.title}</div>
                <ul className="flex flex-col gap-2.5">
                  {col.links.map(([href, label]) => (
                    <li key={href}>
                      <Link href={href} className="text-[14px] font-bold text-ink-2 hover:text-coral">{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-3 border-t-2 border-hairline pt-6 text-[13px] font-bold text-muted lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-1">
            <div>© {new Date().getFullYear()} {company.legalName}. All rights reserved.</div>
            {hasAddress() && <div>{addressLine()}</div>}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <a href={`mailto:${company.email.support}`} className="hover:text-ink">{company.email.support}</a>
            <span className="hidden lg:inline" aria-hidden="true">·</span>
            <span>{company.brand} is a shipping software platform, not a carrier.</span>
          </div>
        </div>

        <p className="text-[12px] font-semibold leading-[1.6] text-muted">
          USPS® is a registered trademark of the United States Postal Service. UPS® is a registered trademark of United Parcel Service of America, Inc. FedEx® is a registered trademark of Federal Express Corporation. DHL® is a registered trademark of Deutsche Post AG. {company.legalName} is not affiliated with, endorsed by, or sponsored by any of these carriers. Carrier names and marks are used only to identify the services available through {company.brand}.
        </p>
      </div>
    </footer>
  );
}
