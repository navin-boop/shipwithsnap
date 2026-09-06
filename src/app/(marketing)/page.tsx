import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { RateCalculator } from "@/components/marketing/RateCalculator";
import { ArrowIcon } from "@/components/ui";
import { formatCents } from "@/lib/money";
import { getSampleRates } from "@/lib/ship/sample-rates";
import shipScreen from "@/images/ship-screen.png";
import stepAddress from "@/images/step-address.png";
import stepLabel from "@/images/step-label.png";
import stepRates from "@/images/step-rates.png";

// Spec: design/SunnyLanding.dc.html. Product screenshots come from scripts/screenshots.sh.
export const revalidate = 3600;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  description:
    "Compare USPS, UPS, FedEx and DHL rates side by side and print the label in a minute. No monthly fee and no markup on postage, with a written lowest price guarantee.",
};

export default async function HomePage() {
  const { rates, live } = await getSampleRates();
  const hero = rates[0];
  return (
    <main className="relative flex flex-col overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute right-[-120px] top-[140px] hidden h-[520px] w-[520px] rounded-pill bg-yellow/70 lg:block" />
      <div aria-hidden="true" className="pointer-events-none absolute left-[-100px] top-[720px] h-[320px] w-[320px] rounded-pill bg-[#ffb4a2]/60" />

      {/* Hero */}
      <section className="relative grid grid-cols-1 gap-10 px-6 pb-16 pt-10 sm:px-16 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:pb-24 lg:pt-16">
        <div className="flex flex-col gap-6">
          <div className="inline-flex items-center gap-2 self-start rounded-pill border-2 border-ink bg-surface px-3.5 py-2 text-[13px] font-extrabold">USPS · UPS · FedEx — one list, cheapest first</div>
          <h1 className="disp text-[48px] leading-[1] sm:text-[64px] xl:text-[76px]">
            Ship for less.<br /><span className="text-coral">Seriously</span> less.
          </h1>
          <p className="max-w-[540px] text-[18px] font-semibold leading-[1.5] text-ink-2 sm:text-[20px]">
            The discounts the big shippers get, for the rest of us. No monthly fee — you pay postage and nothing else. Paste an address, pick a rate, print.
          </p>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link href="/signup" className="inline-flex h-[58px] items-center gap-2.5 rounded-pill border-2 border-ink bg-coral px-7 font-display text-[16px] font-extrabold text-white offset-shadow hover:text-white">
              Start shipping free <ArrowIcon />
            </Link>
            <div className="text-[14px] font-extrabold text-muted">No card to start ✓</div>
          </div>
        </div>

        <div className="relative flex justify-center lg:justify-end">
          <div className="card w-full max-w-[600px] -rotate-1 overflow-hidden p-2.5 sm:p-3">
            <Image src={shipScreen} alt="The Snap Ship screen: a verified address, every carrier's rate as a card, and the cheapest highlighted" priority sizes="(min-width: 1024px) 48vw, 100vw" className="h-auto w-full rounded-[14px] border-2 border-hairline" />
            {hero && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-3 pb-2 pt-4">
                <div className="flex flex-col">
                  <div className="text-[13px] font-extrabold text-muted">{live ? "Live right now" : "Typical"} · Brooklyn → Austin · 1.8 lb</div>
                  <div className="text-[15px] font-extrabold">{hero.carrier} {hero.serviceName}{hero.estDays !== null ? ` · ${hero.estDays} days` : ""}</div>
                </div>
                <div className="flex items-baseline gap-3">
                  {hero.retailCents !== null && <div className="text-[14px] font-bold text-muted line-through">{formatCents(hero.retailCents)}</div>}
                  <div className="disp text-[34px]">{formatCents(hero.priceCents)}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Live calculator */}
      <section id="calculator" className="relative flex flex-col">
        <div className="flex flex-col gap-2 px-6 sm:px-16">
          <div className="lbl">Try it now — no account needed</div>
          <h2 className="disp text-[36px] leading-[1] sm:text-[48px]">What would your next package cost?</h2>
        </div>
        <RateCalculator />
      </section>

      {/* How it works */}
      <section id="how" className="relative flex flex-col gap-10 px-6 py-16 sm:px-16 lg:py-24">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="disp max-w-[640px] text-[40px] leading-[1] sm:text-[56px]">Three steps.<br />Under a minute.</h2>
          <div className="lbl">How it works</div>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <Step n="1" title="Paste an address" image={stepAddress} alt="An address pasted as one line, verified as residential" color="bg-coral">
            Drop in the whole thing from an email or order — Snap splits, verifies and corrects it, and tells you if it&apos;s residential before a carrier charges you for it.
          </Step>
          <Step n="2" title="Pick a rate" image={stepRates} alt="Five carrier rates sorted by price, cheapest highlighted" color="bg-teal">
            Every USPS, UPS and FedEx service on one list, cheapest first, with the counter price crossed out next to yours. Sort by speed when it matters more than money.
          </Step>
          <Step n="3" title="Print and drop off" image={stepLabel} alt="A bought label ready to print, with tracking number and price" color="bg-ink">
            4×6 thermal or plain paper — your choice, saved once. Tracking emails go to your customer automatically. Void any label within 28 days for a full refund to your card.
          </Step>
        </div>
      </section>

      {/* Questions + pay as you go */}
      <section id="faq" className="relative grid grid-cols-1 gap-8 px-6 py-16 sm:px-16 lg:grid-cols-[1.2fr_1fr] lg:py-24">
        <div className="flex flex-col gap-5">
          <div className="lbl">The questions everyone asks</div>
          <div className="flex flex-col gap-3">
            <Faq q="Is it really free?">The software is, and there is no plan to upgrade to. You pay the carrier&apos;s commercial rate exactly as we receive it — we add no markup, no per-label fee and no monthly fee.</Faq>
            <Faq q="Do I need a label printer?">No. Print on plain paper and tape it on. If you ship every day, a thermal printer pays for itself — we support any 4×6 printer out of the box.</Faq>
            <Faq q="What about my Shopify and Etsy orders?">Upload a CSV today, connect a store soon. Open orders appear in Batch: select them all, buy every label in one click, one charge to your card.</Faq>
            <Faq q="Is the postage the same as at the counter?">Same carriers, same services, same delivery. The only thing that changes is the price.</Faq>
          </div>
          <Link href="/faq" className="inline-flex w-fit items-center gap-2 text-[15px] font-extrabold text-coral">Read all the questions <ArrowIcon size={16} /></Link>
        </div>
        <div className="card flex flex-col justify-between gap-8 self-start bg-yellow p-8">
          <div className="flex flex-col gap-4">
            <div className="lbl text-ink">Pay as you go</div>
            <p className="disp text-[28px] leading-[1.15] sm:text-[32px]">Save a card once. Each label — or each batch — is one charge, with a receipt. Nothing to prepay, nothing to top up.</p>
          </div>
          <Link href="/signup" className="inline-flex h-12 items-center gap-2 self-start rounded-pill border-2 border-ink bg-ink px-5 font-display text-[14px] font-extrabold text-yellow hover:text-yellow">Create a free account <ArrowIcon size={16} /></Link>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative flex flex-col gap-10 px-6 py-16 sm:px-16 lg:py-24">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="disp text-[40px] leading-[1] sm:text-[56px]">One price. Postage.</h2>
          <Link href="/pricing" className="lbl text-coral hover:text-coral">Full pricing detail →</Link>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Price label="Software" big="$0">Unlimited labels, users and API calls. Reports, batch, address book — all of it.</Price>
          <Price label="Postage" big="Commercial rates">USPS Commercial Pricing and UPS discount rates on every label. See the exact price before you buy.</Price>
          <Price label="Payment" big="Pay as you go" dark>One charge per label or batch, receipts by email. Voided labels refund to your card in full.</Price>
        </div>
      </section>

      {/* Lowest price guarantee */}
      <section className="relative px-6 pb-4 sm:px-16">
        <div className="card flex flex-col items-start gap-6 bg-yellow p-8 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3">
            <div className="lbl text-ink">Lowest price guarantee</div>
            <h2 className="disp max-w-[560px] text-[30px] leading-[1.1] sm:text-[38px]">Find the same label cheaper and we refund the difference.</h2>
            <p className="max-w-[520px] text-[16px] font-semibold leading-[1.6] text-ink-2">Same carrier, same service, same package, within 14 days. One email and the money goes back on your card.</p>
          </div>
          <Link href="/lowest-price-guarantee" className="inline-flex h-14 shrink-0 items-center gap-2.5 rounded-pill border-2 border-ink bg-surface px-7 font-display text-[15px] font-extrabold text-ink hover:text-ink">Read the terms <ArrowIcon size={16} /></Link>
        </div>
      </section>

      {/* CTA */}
      <section className="relative px-6 pb-20 sm:px-16">
        <div className="card flex flex-col items-start gap-8 bg-coral p-8 text-white sm:p-12 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="disp text-[44px] leading-[1] sm:text-[64px]">Your next label<br />costs less.</h2>
          <Link href="/signup" className="inline-flex h-16 items-center gap-2.5 rounded-pill border-2 border-ink bg-ink px-9 font-display text-[16px] font-extrabold text-yellow hover:text-yellow">Start shipping free <ArrowIcon /></Link>
        </div>
      </section>
    </main>
  );
}

function Step({ n, title, image, alt, color, children }: { n: string; title: string; image: typeof stepAddress; alt: string; color: string; children: React.ReactNode }) {
  return (
    <div className="card flex flex-col gap-4 overflow-hidden p-3">
      <div className="aspect-[16/9] overflow-hidden rounded-[14px] border-2 border-hairline bg-surface">
        <Image src={image} alt={alt} sizes="(min-width: 768px) 30vw, 100vw" className="h-full w-full object-cover object-left-top" />
      </div>
      <div className="flex flex-col gap-2 px-2 pb-2">
        <div className="flex items-center gap-3">
          <span className={`flex h-8 w-8 items-center justify-center rounded-pill border-2 border-ink font-display text-[14px] font-extrabold text-white ${color}`}>{n}</span>
          <div className="disp text-[22px]">{title}</div>
        </div>
        <p className="text-[15px] font-semibold leading-[1.55] text-ink-2">{children}</p>
      </div>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="card-quiet flex flex-col gap-2 p-5">
      <div className="disp text-[20px]">{q}</div>
      <p className="text-[15px] font-semibold leading-[1.55] text-ink-2">{children}</p>
    </div>
  );
}

function Price({ label, big, dark, children }: { label: string; big: string; dark?: boolean; children: React.ReactNode }) {
  return (
    <div className={`card flex flex-col gap-3 p-7 ${dark ? "bg-ink text-paper" : ""}`}>
      <div className={`lbl ${dark ? "text-muted-on-ink" : ""}`}>{label}</div>
      <div className={`disp text-[40px] ${dark ? "text-yellow" : ""}`}>{big}</div>
      <p className={`text-[15px] font-semibold leading-[1.5] ${dark ? "text-muted-on-ink" : "text-ink-2"}`}>{children}</p>
    </div>
  );
}
