import Link from "next/link";
import { RateCalculator } from "@/components/marketing/RateCalculator";
import { ArrowIcon } from "@/components/ui";
import { formatCents } from "@/lib/money";
import { getSampleRates } from "@/lib/ship/sample-rates";

// Spec: design/Landing.dc.html. The stats strip and testimonial from the design are held back
// until there are real numbers and a real quote to put in them.
export const revalidate = 3600;

export default async function HomePage() {
  const { rates, live } = await getSampleRates();
  const [hero, ...rest] = rates;
  return (
    <main className="flex flex-col">
      {/* Hero */}
      <section className="grid grid-cols-1 border-b-2 border-ink lg:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col gap-8 px-6 py-16 sm:px-16 lg:border-r-2 lg:border-ink lg:py-24">
          <h1 className="disp break-words text-[44px] leading-[0.9] sm:text-[64px] lg:text-[72px] xl:text-[88px]">
            The cheapest USPS &amp; UPS rates.
            <br />
            <span className="text-electric">No monthly fee.</span>
          </h1>
          <p className="max-w-[560px] text-lg leading-[1.45] text-ink-2 sm:text-xl">
            Snap gives every seller the commercial discounts big shippers negotiate, and charges nothing on top. Paste an
            address, pick a rate, print. That&apos;s the whole product.
          </p>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
            <Link href="/signup" className="inline-flex h-14 items-center gap-3.5 bg-electric px-[30px] text-sm font-semibold uppercase tracking-[1px] text-white hover:text-white">
              <span>Start shipping free</span>
              <ArrowIcon />
            </Link>
            <div className="text-[13px] text-muted">No card to start. You only ever pay postage.</div>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-[11px] font-semibold uppercase tracking-[1.2px] text-muted">
            <span>Labels for</span>
            <span className="text-ink">USPS</span>
            <span className="text-ink">UPS</span>
            <span className="text-ink">FedEx</span>
            <span>· verified addresses · tracking emails · batch from CSV</span>
          </div>
        </div>

        <div className="flex flex-col bg-ink p-8 text-paper sm:p-12">
          <div className="lbl text-muted-on-ink">Brooklyn → Austin · 12×9×4 in · 1.8 lb</div>
          <div className="mt-6 flex flex-col border-t border-ink-2">
            {hero && (
              <div className="flex items-center justify-between gap-4 border-b border-ink-2 py-[18px]">
                <div className="flex flex-col gap-0.5">
                  <div className="disp text-xl">{hero.carrier} {hero.serviceName}</div>
                  <div className="text-xs uppercase tracking-[0.8px] text-muted-on-ink">{hero.estDays !== null ? `${hero.estDays} days · ` : ""}cheapest</div>
                </div>
                <div className="flex items-baseline gap-3">
                  {hero.retailCents !== null && <div className="text-sm text-muted-on-ink line-through">{formatCents(hero.retailCents)}</div>}
                  <div className="disp text-[40px] text-lime">{formatCents(hero.priceCents)}</div>
                </div>
              </div>
            )}
            {rest.map((r) => (
              <div key={r.carrier + r.serviceName} className="flex items-center justify-between gap-4 border-b border-ink-2 py-[18px]">
                <div className="flex flex-col gap-0.5">
                  <div className="text-base font-semibold">{r.carrier} {r.serviceName}</div>
                  <div className="text-xs uppercase tracking-[0.8px] text-muted-on-ink">{r.estDays !== null ? `${r.estDays} days` : ""}</div>
                </div>
                <div className="flex items-baseline gap-3">
                  {r.retailCents !== null && <div className="text-sm text-muted-on-ink line-through">{formatCents(r.retailCents)}</div>}
                  <div className="disp text-2xl">{formatCents(r.priceCents)}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-auto pt-8 text-[13px] leading-[1.5] text-muted-on-ink">
            {live ? "Live rates, refreshed hourly." : "Representative rates."}{" "}
            <Link href="#calculator" className="text-paper underline hover:text-lime">Try your own package below</Link> — no account needed.
          </p>
        </div>
      </section>

      {/* Live calculator */}
      <section id="calculator" className="flex flex-col border-b-2 border-ink">
        <div className="flex flex-col gap-2 px-6 pt-12 sm:px-16">
          <div className="lbl">Try it now — no account needed</div>
          <h2 className="disp text-[36px] leading-[0.95] sm:text-[48px]">What would your next package cost?</h2>
        </div>
        <RateCalculator />
      </section>

      {/* How it works */}
      <section id="how" className="flex flex-col gap-10 border-b-2 border-ink px-6 py-16 sm:px-16 lg:py-[88px]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="disp max-w-[640px] text-[40px] leading-[0.95] sm:text-[56px]">Three steps.<br />Under a minute.</h2>
          <div className="lbl">How it works</div>
        </div>
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <Step n="01" title="Paste an address">
            Drop in the whole thing from an email or order — Snap splits, verifies and corrects it, and tells you if it&apos;s
            residential before a carrier charges you for it.
          </Step>
          <Step n="02" title="Pick a rate">
            Every USPS and UPS service on one list, cheapest first, with the retail price crossed out next to yours. Sort by
            speed when it matters more than money.
          </Step>
          <Step n="03" title="Print and drop off">
            4×6 thermal or plain paper — your choice, saved once. Tracking emails go to your customer automatically. Void any
            label within 28 days for a full refund to your card.
          </Step>
        </div>
      </section>

      {/* Questions */}
      <section id="faq" className="grid grid-cols-1 border-b-2 border-ink lg:grid-cols-2">
        <div className="flex flex-col gap-7 px-6 py-16 sm:px-16 lg:border-r-2 lg:border-ink lg:py-[88px]">
          <div className="lbl">The questions everyone asks</div>
          <div className="flex flex-col">
            <Faq q="Is it really free?">
              Yes. Carriers pay us a small share of postage for bringing them volume. You pay exactly the discounted rate you
              see — never a fee, never a plan.
            </Faq>
            <Faq q="Do I need a label printer?">
              No. Print on plain paper and tape it on. If you ship every day, a thermal printer pays for itself — we support
              any 4×6 printer out of the box.
            </Faq>
            <Faq q="What about my Shopify and Etsy orders?">
              Upload a CSV today, connect a store soon. Open orders appear in Batch: select them all, buy every label in one
              click, one charge to your card.
            </Faq>
            <Faq q="Is the postage the same as at the counter?" last>
              Same carriers, same services, same delivery. The only thing that changes is the price.
            </Faq>
          </div>
        </div>
        <div className="flex flex-col justify-between gap-10 bg-surface px-6 py-16 sm:px-16 lg:py-[88px]">
          <div className="flex flex-col gap-5">
            <div className="lbl">Pay as you go</div>
            <p className="disp text-[28px] leading-[1.15] sm:text-[34px]">
              Save a card once. Each label — or each batch — is one charge, with a receipt. Nothing to prepay, nothing to top
              up.
            </p>
          </div>
          <Link href="/signup" className="inline-flex self-start border-b-2 border-ink pb-0.5 text-xs font-semibold uppercase tracking-[1px]">
            Create a free account
          </Link>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="flex flex-col gap-10 border-b-2 border-ink px-6 py-16 sm:px-16 lg:py-[88px]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="disp text-[40px] leading-[0.95] sm:text-[56px]">One price. Postage.</h2>
          <div className="lbl">Pricing</div>
        </div>
        <div className="grid grid-cols-1 border-2 border-ink md:grid-cols-3">
          <div className="flex flex-col gap-3 border-b-2 border-ink p-8 md:border-b-0 md:border-r-2">
            <div className="lbl">Software</div>
            <div className="disp text-[48px]">$0</div>
            <p className="text-sm leading-[1.5] text-ink-2">Unlimited labels, users and API calls. Reports, batch, address book — all of it.</p>
          </div>
          <div className="flex flex-col gap-3 border-b-2 border-ink p-8 md:border-b-0 md:border-r-2">
            <div className="lbl">Postage</div>
            <div className="disp text-[48px]">Commercial rates</div>
            <p className="text-sm leading-[1.5] text-ink-2">USPS Commercial Pricing and UPS discount rates on every label. See the exact price before you buy.</p>
          </div>
          <div className="flex flex-col gap-3 bg-ink p-8 text-paper">
            <div className="lbl text-muted-on-ink">Payment</div>
            <div className="disp text-[48px] text-lime">Pay as you go</div>
            <p className="text-sm leading-[1.5] text-muted-on-ink">One charge per label or batch, receipts by email. Voided labels refund to your card in full.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="flex flex-col items-start gap-8 bg-electric px-6 py-16 text-white sm:px-16 lg:flex-row lg:items-center lg:justify-between lg:py-24">
        <h2 className="disp text-[48px] leading-[0.92] sm:text-[72px]">Your next label<br />costs less.</h2>
        <Link href="/signup" className="inline-flex h-16 items-center gap-3.5 bg-ink px-9 text-sm font-semibold uppercase tracking-[1px] text-paper hover:text-paper">
          <span>Start shipping free</span>
          <ArrowIcon />
        </Link>
      </section>
    </main>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3.5 border-t-2 border-ink pt-[18px]">
      <div className="disp text-xl text-electric">{n}</div>
      <div className="disp text-2xl">{title}</div>
      <p className="text-[15px] leading-[1.55] text-ink-2">{children}</p>
    </div>
  );
}

function Faq({ q, children, last }: { q: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`flex flex-col gap-2 border-t-[1.5px] border-ink py-[22px] ${last ? "border-b-[1.5px]" : ""}`}>
      <div className="disp text-[22px]">{q}</div>
      <p className="text-[15px] leading-[1.55] text-ink-2">{children}</p>
    </div>
  );
}
