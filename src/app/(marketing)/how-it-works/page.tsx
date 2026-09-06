import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowIcon } from "@/components/ui";
import { JsonLd, breadcrumbSchema } from "@/components/marketing/JsonLd";
import stepAddress from "@/images/step-address.png";
import stepLabel from "@/images/step-label.png";
import stepRates from "@/images/step-rates.png";

export const metadata: Metadata = {
  title: "How it works",
  description: "From a pasted address to a printed label in under a minute: address verification, every carrier rate on one list, and a label that prints on plain paper.",
  alternates: { canonical: "/how-it-works" },
};

const AFTER = [
  ["Tracking, without asking", "The carrier's scans arrive by webhook. Your customer gets a branded tracking page and, if you want, an email when the package ships, goes out for delivery and arrives."],
  ["Batch when the orders pile up", "Import a CSV of orders, rate all of them at once, buy every label in a single charge, and print them as one merged PDF."],
  ["Manifests and pickups", "Hand the driver one scan sheet instead of waiting for each parcel, or book a collection so you never queue at the counter."],
  ["Voids and claims", "Void an unused label for a full refund. File an insurance claim on an insured one without leaving the app."],
];

export default function HowItWorksPage() {
  return (
    <main className="relative flex flex-col overflow-hidden">
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "How it works", path: "/how-it-works" }])} />
      <div aria-hidden="true" className="pointer-events-none absolute right-[-140px] top-[90px] hidden h-[400px] w-[400px] rounded-pill bg-yellow/70 lg:block" />

      <section className="relative flex flex-col gap-5 px-6 pb-12 pt-12 sm:px-16 lg:pt-16">
        <div className="lbl">How it works</div>
        <h1 className="disp max-w-[860px] text-[44px] leading-[1] sm:text-[60px] xl:text-[68px]">
          Paste. Pick. Print.
        </h1>
        <p className="max-w-[640px] text-[18px] font-semibold leading-[1.55] text-ink-2 sm:text-[20px]">
          There are three steps and none of them involve a rate table, an account number or a spreadsheet. Here is exactly what happens at each one.
        </p>
      </section>

      <section className="relative flex flex-col gap-12 px-6 pb-16 sm:px-16">
        <Step
          n="1"
          title="Paste the address"
          image={stepAddress}
          alt="A whole address pasted on one line and verified as residential"
          points={[
            "Drop in the whole address from an email or an order, on one line. We split it into street, city, state and ZIP.",
            "It gets verified against the carrier's own database, corrected where it is wrong, and flagged as residential or commercial before that difference costs you a surcharge.",
            "Shipping abroad? Pick the country and a customs declaration opens with the fields the destination actually requires.",
          ]}
        />
        <Step
          n="2"
          title="Pick a rate"
          image={stepRates}
          alt="Carrier rates sorted by price with the cheapest highlighted"
          reverse
          points={[
            "Every USPS, UPS, FedEx and DHL service for your package appears on one list, cheapest first, with the retail counter price crossed out beside ours.",
            "Each rate shows when it should arrive and how confident that estimate is, based on how that service has actually performed between those two ZIP codes.",
            "Add signature, insurance or Saturday delivery and the whole list reprices, so you never discover an extra after you have committed.",
          ]}
        />
        <Step
          n="3"
          title="Print and hand it over"
          image={stepLabel}
          alt="A purchased label ready to print with its tracking number"
          points={[
            "The label opens the moment you buy it, as a 4 by 6 thermal label or on plain letter paper, whichever you set as your default.",
            "Your card is charged once for that label, or once for a whole batch, and a receipt lands in your inbox.",
            "Drop it off, or book a pickup and let the driver come to you.",
          ]}
        />
      </section>

      <section className="relative flex flex-col gap-8 bg-surface px-6 py-16 sm:px-16 lg:py-20">
        <div className="flex flex-col gap-3">
          <div className="lbl">After the label</div>
          <h2 className="disp text-[34px] leading-[1.05] sm:text-[44px]">The part most tools leave to you.</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {AFTER.map(([t, d]) => (
            <div key={t} className="card-quiet flex flex-col gap-2 p-6">
              <div className="disp text-[22px]">{t}</div>
              <p className="text-[16px] font-semibold leading-[1.6] text-ink-2">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative px-6 py-16 sm:px-16">
        <div className="card flex flex-col items-start gap-8 bg-coral p-8 text-white sm:p-12 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="disp text-[36px] leading-[1] sm:text-[52px]">Try it on a real<br />package right now.</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/signup" className="inline-flex h-16 items-center gap-2.5 rounded-pill border-2 border-ink bg-ink px-8 font-display text-[16px] font-extrabold text-yellow hover:text-yellow">Start free <ArrowIcon /></Link>
            <Link href="/rates" className="inline-flex h-16 items-center rounded-pill border-2 border-ink bg-surface px-8 font-display text-[16px] font-extrabold text-ink hover:text-ink">See a price</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Step({ n, title, image, alt, points, reverse }: { n: string; title: string; image: typeof stepAddress; alt: string; points: string[]; reverse?: boolean }) {
  return (
    <div className={`grid grid-cols-1 items-center gap-8 lg:grid-cols-2 ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
      <div className="card overflow-hidden p-2.5">
        <Image src={image} alt={alt} sizes="(min-width: 1024px) 46vw, 100vw" className="h-auto w-full rounded-[14px] border-2 border-hairline" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-pill border-2 border-ink bg-coral font-display text-[16px] font-extrabold text-white">{n}</span>
          <h2 className="disp text-[30px] leading-[1.05] sm:text-[38px]">{title}</h2>
        </div>
        <ul className="flex flex-col gap-3">
          {points.map((p) => (
            <li key={p} className="flex gap-3 text-[16px] font-semibold leading-[1.6] text-ink-2">
              <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-pill bg-coral" />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
