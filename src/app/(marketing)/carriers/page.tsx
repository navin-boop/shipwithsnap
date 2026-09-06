import type { Metadata } from "next";
import Link from "next/link";
import { ArrowIcon, CarrierLogo } from "@/components/ui";
import { JsonLd, breadcrumbSchema } from "@/components/marketing/JsonLd";
import { CARRIERS } from "@/lib/carriers-content";

export const metadata: Metadata = {
  title: "Carriers: USPS, UPS, FedEx and DHL",
  description: "Compare USPS, UPS, FedEx and DHL on one list. Which carrier is cheapest by weight, which delivers to PO boxes, and which surcharges to watch for.",
  alternates: { canonical: "/carriers" },
};

const RULES = [
  ["Under 1 lb", "USPS Ground Advantage almost always wins, and FedEx Ground Economy is worth checking for residential addresses."],
  ["1 to 5 lb", "The genuinely competitive range. USPS Priority, UPS Ground and FedEx Ground trade places by zone — always compare."],
  ["5 to 70 lb", "UPS Ground and FedEx Ground usually beat USPS as weight climbs, especially over longer distances."],
  ["Over 70 lb", "UPS and FedEx only. USPS will not carry a parcel above 70 pounds."],
  ["To a PO box", "USPS only. No other carrier can deliver to one."],
  ["International", "DHL Express for speed, USPS International for price. Both need a customs declaration."],
];

export default function CarriersPage() {
  return (
    <main className="relative flex flex-col overflow-hidden">
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Carriers", path: "/carriers" }])} />
      <div aria-hidden="true" className="pointer-events-none absolute right-[-140px] top-[90px] hidden h-[380px] w-[380px] rounded-pill bg-yellow/70 lg:block" />

      <section className="relative flex flex-col gap-5 px-6 pb-12 pt-12 sm:px-16 lg:pt-16">
        <div className="lbl">Carriers</div>
        <h1 className="disp max-w-[860px] text-[44px] leading-[1] sm:text-[60px] xl:text-[68px]">
          Four carriers.<br />One list. Cheapest first.
        </h1>
        <p className="max-w-[640px] text-[18px] font-semibold leading-[1.55] text-ink-2 sm:text-[20px]">
          You do not have to guess which carrier is cheapest for a package — enter it once and every service from all four prices itself in front of you. This page is for when you want to know why.
        </p>
      </section>

      <section className="relative grid grid-cols-1 gap-6 px-6 pb-16 sm:px-16 md:grid-cols-2">
        {CARRIERS.map((c) => (
          <Link key={c.slug} href={`/carriers/${c.slug}`} className="card flex flex-col gap-4 p-6 hover:text-ink sm:p-7">
            <div className="flex items-center gap-4">
              <CarrierLogo carrier={c.name} size={48} />
              <div className="disp text-[26px]">{c.name}</div>
            </div>
            <p className="text-[16px] font-semibold leading-[1.6] text-ink-2">{c.blurb}</p>
            <div className="flex flex-wrap gap-2">
              {c.services.slice(0, 3).map((s) => (
                <span key={s.name} className="rounded-pill border-2 border-hairline px-3 py-1 text-[12px] font-extrabold text-muted">{s.name}</span>
              ))}
            </div>
            <span className="mt-auto inline-flex items-center gap-2 pt-1 text-[14px] font-extrabold text-coral">{c.name} services and rates <ArrowIcon size={15} /></span>
          </Link>
        ))}
      </section>

      <section className="relative flex flex-col gap-8 bg-surface px-6 py-16 sm:px-16 lg:py-20">
        <div className="flex flex-col gap-3">
          <div className="lbl">Rules of thumb</div>
          <h2 className="disp text-[34px] leading-[1.05] sm:text-[44px]">Which carrier usually wins.</h2>
          <p className="max-w-[620px] text-[16px] font-semibold leading-[1.6] text-ink-2">
            Useful for planning. Never a substitute for an actual quote, because zone, dimensions and surcharges move the answer.
          </p>
        </div>
        <div className="flex flex-col">
          {RULES.map(([when, who]) => (
            <div key={when} className="grid grid-cols-1 gap-1 border-b border-hairline py-4 sm:grid-cols-[200px_1fr] sm:gap-6">
              <div className="text-[16px] font-extrabold">{when}</div>
              <div className="text-[16px] font-semibold leading-[1.6] text-ink-2">{who}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative px-6 py-16 sm:px-16">
        <div className="card flex flex-col items-start gap-8 bg-coral p-8 text-white sm:p-12 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="disp text-[36px] leading-[1] sm:text-[52px]">Stop guessing.<br />Price the actual package.</h2>
          <Link href="/rates" className="inline-flex h-16 shrink-0 items-center gap-2.5 rounded-pill border-2 border-ink bg-ink px-9 font-display text-[16px] font-extrabold text-yellow hover:text-yellow">Compare all four <ArrowIcon /></Link>
        </div>
      </section>
    </main>
  );
}
