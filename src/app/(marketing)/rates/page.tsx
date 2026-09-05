import type { Metadata } from "next";
import { RateCalculator } from "@/components/marketing/RateCalculator";

export const metadata: Metadata = { title: "Rate calculator · Ship with Snap", description: "Compare USPS, UPS and FedEx rates for any package. No account needed." };

export default function RatesPage() {
  return (
    <main className="flex flex-col">
      <section className="flex flex-col gap-4 px-6 pt-10 sm:px-16 lg:pt-16">
        <h1 className="disp text-[44px] leading-[1] sm:text-[64px]">What would this cost to ship?</h1>
        <p className="max-w-[560px] text-[18px] font-semibold leading-[1.45] text-ink-2">Every carrier, cheapest first, with the counter price crossed out. No account, no card.</p>
      </section>
      <RateCalculator />
    </main>
  );
}
