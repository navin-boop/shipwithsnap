import type { Metadata } from "next";
import Link from "next/link";
import { ArrowIcon } from "@/components/ui";
import { RateCalculator } from "@/components/marketing/RateCalculator";
import { company } from "@/lib/company";

export const metadata: Metadata = {
  title: "Pricing — free software, postage at cost",
  description: "No monthly fee, no per-label fee, no minimum. Pay carrier postage at commercial rates and nothing else — here is every line that can appear on your bill.",
  alternates: { canonical: "/pricing" },
};

const INCLUDED = [
  ["Unlimited labels", "USPS, UPS, FedEx and DHL, domestic and international."],
  ["Unlimited users", "Invite your whole team with owner, shipper or viewer roles."],
  ["Batch shipping", "Import a CSV, rate every order, buy them all in one charge."],
  ["Address verification", "Every address checked and corrected before a carrier can fine you for it."],
  ["Tracking and customer emails", "Branded tracking page and automatic shipped, out-for-delivery and delivered emails."],
  ["End-of-day manifests", "One scan sheet for the driver instead of scanning each package."],
  ["Carrier pickups", "Schedule a collection instead of walking to the post office."],
  ["Insurance claims", "File and track claims on insured labels from inside the app."],
  ["Reports", "Spend by carrier and service, exportable to CSV."],
  ["Full REST API", "Every endpoint the app itself uses, with webhooks. No developer plan."],
];

const CHARGES = [
  {
    title: "Postage",
    detail:
      "The rate you picked, at commercial pricing. Charged when you buy the label, or once per batch. Always shown before you commit, with the retail counter price beside it.",
  },
  {
    title: "Extras you choose",
    detail:
      "Signature confirmation, declared-value insurance, Saturday delivery and similar carrier options. Each one is priced into the rate you see before you buy — never added afterwards.",
  },
  {
    title: "Carrier adjustments",
    detail:
      "If the carrier weighs your package and finds it heavier or larger than declared, it bills the difference and we pass that through at cost. You see the carrier's own measurement and reason.",
  },
];

export default function PricingPage() {
  return (
    <main className="relative flex flex-col overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute left-[-120px] top-[420px] h-[320px] w-[320px] rounded-pill bg-[#ffb4a2]/60" />

      <section className="relative flex flex-col gap-6 px-6 pb-12 pt-12 sm:px-16 lg:pt-16">
        <div className="lbl">Pricing</div>
        <h1 className="disp max-w-[820px] text-[44px] leading-[1] sm:text-[64px] xl:text-[72px]">
          The software is free.<br />You pay <span className="text-coral">postage</span>.
        </h1>
        <p className="max-w-[620px] text-[18px] font-semibold leading-[1.55] text-ink-2 sm:text-[20px]">
          There is no plan to choose because there is only one, and it costs nothing. Every feature is on for every account from the first label.
        </p>
      </section>

      <section className="relative grid grid-cols-1 gap-6 px-6 pb-16 sm:px-16 md:grid-cols-3">
        <div className="card flex flex-col gap-3 p-7">
          <div className="lbl">Monthly fee</div>
          <div className="disp text-[52px]">$0</div>
          <p className="text-[15px] font-semibold leading-[1.55] text-ink-2">No subscription, no tier, no annual contract, nothing to cancel.</p>
        </div>
        <div className="card flex flex-col gap-3 p-7">
          <div className="lbl">Per label</div>
          <div className="disp text-[52px]">$0</div>
          <p className="text-[15px] font-semibold leading-[1.55] text-ink-2">No markup on postage and no per-label surcharge. Print one label a month or ten thousand.</p>
        </div>
        <div className="card flex flex-col gap-3 bg-ink p-7 text-paper">
          <div className="lbl text-muted-on-ink">You pay</div>
          <div className="disp text-[40px] leading-[1.05] text-yellow">Carrier<br />postage</div>
          <p className="text-[15px] font-semibold leading-[1.55] text-muted-on-ink">At commercial rates, charged to your card per label or per batch, with a receipt every time.</p>
        </div>
      </section>

      <section className="relative flex flex-col gap-8 bg-surface px-6 py-16 sm:px-16 lg:py-20">
        <div className="flex flex-col gap-3">
          <div className="lbl">The complete list</div>
          <h2 className="disp text-[34px] leading-[1.05] sm:text-[44px]">Everything that can appear on your bill.</h2>
          <p className="max-w-[620px] text-[16px] font-semibold leading-[1.6] text-ink-2">Three lines. That is the entire set — there is no fourth thing we can charge you for.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {CHARGES.map((c, i) => (
            <div key={c.title} className="card-quiet flex flex-col gap-2.5 p-6">
              <span className="flex h-8 w-8 items-center justify-center rounded-pill border-2 border-ink font-display text-[14px] font-extrabold">{i + 1}</span>
              <div className="disp text-[22px]">{c.title}</div>
              <p className="text-[15px] font-semibold leading-[1.55] text-ink-2">{c.detail}</p>
            </div>
          ))}
        </div>
        <p className="text-[15px] font-semibold text-ink-2">
          Voided labels refund in full — see <Link href="/legal/refunds" className="font-extrabold text-coral">Refunds &amp; voided labels</Link>.
        </p>
      </section>

      <section className="relative flex flex-col gap-8 px-6 py-16 sm:px-16 lg:py-20">
        <div className="flex flex-col gap-3">
          <div className="lbl">Included at $0</div>
          <h2 className="disp text-[34px] leading-[1.05] sm:text-[44px]">No feature is behind a plan.</h2>
        </div>
        <div className="grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2">
          {INCLUDED.map(([title, detail]) => (
            <div key={title} className="flex gap-3.5">
              <span aria-hidden="true" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-pill border-2 border-teal bg-teal text-white">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m3 8 3 3 7-7" /></svg>
              </span>
              <div className="flex flex-col gap-0.5">
                <div className="text-[16px] font-extrabold">{title}</div>
                <div className="text-[14px] font-semibold leading-[1.5] text-muted">{detail}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative flex flex-col">
        <div className="flex flex-col gap-2 px-6 sm:px-16">
          <div className="lbl">See a real number</div>
          <h2 className="disp text-[34px] leading-[1] sm:text-[44px]">Price your next package.</h2>
        </div>
        <RateCalculator />
      </section>

      <section className="relative px-6 py-16 sm:px-16">
        <div className="card flex flex-col items-start gap-8 bg-coral p-8 text-white sm:p-12 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3">
            <h2 className="disp text-[36px] leading-[1] sm:text-[52px]">And if you find it cheaper?</h2>
            <p className="max-w-[520px] text-[17px] font-semibold leading-[1.5]">We refund the difference. {company.brand} has a written lowest price guarantee, with the terms in plain English.</p>
          </div>
          <Link href="/lowest-price-guarantee" className="inline-flex h-16 shrink-0 items-center gap-2.5 rounded-pill border-2 border-ink bg-ink px-9 font-display text-[16px] font-extrabold text-yellow hover:text-yellow">Read the guarantee <ArrowIcon /></Link>
        </div>
      </section>
    </main>
  );
}
