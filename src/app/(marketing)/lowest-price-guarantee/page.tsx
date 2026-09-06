import type { Metadata } from "next";
import Link from "next/link";
import { ArrowIcon } from "@/components/ui";
import { company } from "@/lib/company";

export const metadata: Metadata = {
  title: "Lowest Price Guarantee",
  description: "We never mark up postage, we charge no fees, and if you find the same label cheaper anywhere else we refund the difference. Here are the exact terms.",
  alternates: { canonical: "/lowest-price-guarantee" },
};

const STEPS = [
  {
    n: "1",
    title: "Find a lower price",
    body: "Same carrier, same service, same package, same ship date. A published rate you could actually buy — a screenshot or a receipt from the other platform is enough.",
  },
  {
    n: "2",
    title: "Send it within 14 days",
    body: `Email ${company.email.billing} with your tracking number and the evidence. One message; we do not make you fill in a form.`,
  },
  {
    n: "3",
    title: "We refund the difference",
    body: `We check it and put the difference back on your card within ${company.responseTime === "one business day" ? "two business days" : company.responseTime}. If we cannot match it, we tell you plainly why.`,
  },
];

export default function LowestPricePage() {
  return (
    <main className="relative flex flex-col overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute right-[-140px] top-[80px] hidden h-[420px] w-[420px] rounded-pill bg-yellow/70 lg:block" />

      <section className="relative flex flex-col gap-6 px-6 pb-14 pt-12 sm:px-16 lg:pb-20 lg:pt-16">
        <div className="inline-flex items-center gap-2 self-start rounded-pill border-2 border-ink bg-surface px-3.5 py-2 text-[13px] font-extrabold">Our promise</div>
        <h1 className="disp max-w-[900px] text-[44px] leading-[1] sm:text-[64px] xl:text-[76px]">
          The lowest price,<br />or we pay the <span className="text-coral">difference</span>.
        </h1>
        <p className="max-w-[640px] text-[18px] font-semibold leading-[1.55] text-ink-2 sm:text-[20px]">
          {company.brand} does not mark up postage. You pay the carrier&apos;s commercial rate exactly as we receive it. If you ever find the same label cheaper somewhere else, we refund you the difference.
        </p>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Link href="/signup" className="inline-flex h-[58px] items-center gap-2.5 rounded-pill border-2 border-ink bg-coral px-7 font-display text-[16px] font-extrabold text-white offset-shadow hover:text-white">
            Start shipping free <ArrowIcon />
          </Link>
          <Link href="/rates" className="text-[15px] font-extrabold text-muted hover:text-ink">Check a price first →</Link>
        </div>
      </section>

      <section className="relative grid grid-cols-1 gap-6 px-6 pb-16 sm:px-16 md:grid-cols-3">
        <Promise label="No markup" big="$0 added">
          The price you see is the price the carrier gives us. We do not add a margin to postage, and the rate list shows the retail counter price beside it so you can check.
        </Promise>
        <Promise label="No fees" big="$0 forever">
          No monthly subscription, no per-label fee, no minimum volume, no charge for users, batches or API calls. Postage is the only line on your receipt.
        </Promise>
        <Promise label="If we are beaten" big="We refund it" dark>
          Find the same label cheaper on any other platform and we put the difference back on your card. The terms below are the whole of it.
        </Promise>
      </section>

      <section className="relative flex flex-col gap-10 bg-surface px-6 py-16 sm:px-16 lg:py-20">
        <div className="flex flex-col gap-3">
          <div className="lbl">Claiming it</div>
          <h2 className="disp text-[36px] leading-[1.02] sm:text-[48px]">Three steps, one email.</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="card flex flex-col gap-3 p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-pill border-2 border-ink bg-coral font-display text-[15px] font-extrabold text-white">{s.n}</span>
              <div className="disp text-[22px]">{s.title}</div>
              <p className="text-[15px] font-semibold leading-[1.55] text-ink-2">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative grid grid-cols-1 gap-8 px-6 py-16 sm:px-16 lg:grid-cols-2 lg:py-20">
        <div className="flex flex-col gap-4">
          <h2 className="disp text-[30px] leading-[1.1] sm:text-[36px]">What the guarantee covers</h2>
          <ul className="flex flex-col gap-3">
            {[
              "The same carrier and the same service level — USPS Ground Advantage against USPS Ground Advantage, not against a slower service.",
              "The same package: same weight, same dimensions, same origin and destination ZIP codes.",
              "The same ship date, because carrier rates move.",
              "A rate that was publicly available to a US business account at the time you bought from us.",
              "Any extras you selected, such as signature or declared value, compared against the same extras.",
            ].map((t) => (
              <li key={t} className="flex gap-3 text-[16px] font-semibold leading-[1.6] text-ink-2">
                <span aria-hidden="true" className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-pill border-2 border-teal bg-teal text-white">
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m3 8 3 3 7-7" /></svg>
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-4">
          <h2 className="disp text-[30px] leading-[1.1] sm:text-[36px]">What it does not cover</h2>
          <ul className="flex flex-col gap-3">
            {[
              "Rates from an account with a carrier contract you negotiated yourself. If you have your own UPS or FedEx pricing, connect that account and use it — we will show those rates too.",
              "Introductory offers, coupons, credits, referral bonuses or trial pricing on another platform.",
              "Prices from a platform charging a monthly fee, unless you include that fee in the comparison.",
              "Rates in another currency, or from a non-US origin.",
              "Carrier adjustments made after a package is weighed, which every platform passes on the same way.",
            ].map((t) => (
              <li key={t} className="flex gap-3 text-[16px] font-semibold leading-[1.6] text-ink-2">
                <span aria-hidden="true" className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-pill border-2 border-hairline text-muted">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M3 3l10 10M13 3 3 13" /></svg>
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="relative flex flex-col gap-6 px-6 pb-16 sm:px-16">
        <div className="card flex flex-col gap-4 bg-yellow p-8 sm:p-10">
          <div className="lbl text-ink">Why we can promise this</div>
          <p className="disp max-w-[820px] text-[24px] leading-[1.25] sm:text-[30px]">
            Carriers price by volume. Thousands of small sellers shipping through one platform get the rate a single large shipper gets — and we hand it over untouched instead of keeping a cut.
          </p>
          <p className="max-w-[720px] text-[16px] font-semibold leading-[1.6] text-ink-2">
            That is the whole mechanism. There is no tier that unlocks a better price, no volume you have to reach, and no negotiation. The seller printing their first label pays the same rate as the one printing their ten-thousandth.
          </p>
        </div>
      </section>

      <section className="relative px-6 pb-20 sm:px-16">
        <div className="card flex flex-col items-start gap-8 bg-coral p-8 text-white sm:p-12 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="disp text-[36px] leading-[1] sm:text-[52px]">Check us against<br />whatever you use now.</h2>
          <Link href="/rates" className="inline-flex h-16 shrink-0 items-center gap-2.5 rounded-pill border-2 border-ink bg-ink px-9 font-display text-[16px] font-extrabold text-yellow hover:text-yellow">Price a package <ArrowIcon /></Link>
        </div>
      </section>
    </main>
  );
}

function Promise({ label, big, dark, children }: { label: string; big: string; dark?: boolean; children: React.ReactNode }) {
  return (
    <div className={`card flex flex-col gap-3 p-7 ${dark ? "bg-ink text-paper" : ""}`}>
      <div className={`lbl ${dark ? "text-muted-on-ink" : ""}`}>{label}</div>
      <div className={`disp text-[36px] ${dark ? "text-yellow" : ""}`}>{big}</div>
      <p className={`text-[15px] font-semibold leading-[1.55] ${dark ? "text-muted-on-ink" : "text-ink-2"}`}>{children}</p>
    </div>
  );
}
