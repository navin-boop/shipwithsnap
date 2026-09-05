"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import { formatCents } from "@/lib/money";
import { publicRates, type PublicRatesResult } from "@/lib/ship/public-rates";

export function RateCalculator() {
  const [f, setF] = useState({ fromZip: "11201", toZip: "78704", lengthIn: "12", widthIn: "9", heightIn: "4", weightLb: "1.8" });
  const [res, setRes] = useState<PublicRatesResult | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => setRes(await publicRates(f)));
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[480px_minmax(0,1fr)]">
      <form onSubmit={submit} className="flex flex-col gap-5 px-6 py-10 sm:px-16 lg:border-r-2 lg:border-ink">
        <div className="grid grid-cols-2 gap-4">
          <Input label="From ZIP" inputMode="numeric" value={f.fromZip} onChange={set("fromZip")} />
          <Input label="To ZIP" inputMode="numeric" value={f.toZip} onChange={set("toZip")} />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Input label="Length" unit="in" inputMode="decimal" value={f.lengthIn} onChange={set("lengthIn")} />
          <Input label="Width" unit="in" inputMode="decimal" value={f.widthIn} onChange={set("widthIn")} />
          <Input label="Height" unit="in" inputMode="decimal" value={f.heightIn} onChange={set("heightIn")} />
          <Input label="Weight" unit="lb" inputMode="decimal" value={f.weightLb} onChange={set("weightLb")} className="[&_label]:text-electric [&_input]:border-electric" />
        </div>
        <Button type="submit" size="lg" disabled={pending} className="self-start">
          {pending ? "Checking…" : "Check rates"}
        </Button>
        <p className="text-xs leading-[1.5] text-muted">
          ZIP-to-ZIP estimates. Exact prices — including residential surcharges — show once you enter a full address in the app.
        </p>
      </form>

      <div className="flex min-h-[320px] flex-col">
        {res?.ok && (
          <>
            <div className="flex items-baseline justify-between px-6 pb-2.5 pt-6 sm:px-8">
              <div className="lbl">{res.rates.length} rates · sorted by price</div>
              <div className="lbl text-ink">Retail → You pay</div>
            </div>
            <div className="flex flex-col border-t-2 border-ink">
              {res.rates.map((r, i) => (
                <div key={r.carrier + r.serviceName} className={`flex items-center justify-between gap-4 px-6 py-3.5 sm:px-8 ${i === 0 ? "bg-ink text-paper" : "border-b border-ink"}`}>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className={`disp ${i === 0 ? "text-[20px] sm:text-[22px]" : "text-base"}`}>{r.carrier} {r.serviceName}</div>
                    <div className={`text-[11px] uppercase tracking-[0.8px] ${i === 0 ? "text-muted-on-ink" : "text-muted"}`}>
                      {r.estDays !== null ? `${r.estDays} days` : ""}{i === 0 ? " · cheapest" : ""}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end sm:flex-row sm:items-baseline sm:gap-3">
                    <div className={`disp ${i === 0 ? "text-[28px] text-lime sm:text-4xl" : "text-[22px]"} sm:order-2`}>{formatCents(r.priceCents)}</div>
                    {r.retailCents !== null && <div className={`text-xs line-through sm:order-1 sm:text-sm ${i === 0 ? "text-muted-on-ink" : "text-muted"}`}>{formatCents(r.retailCents)}</div>}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-4 px-6 py-6 sm:px-8">
              <div className="text-sm text-ink-2">Like what you see? Labels take about a minute.</div>
              <Link href="/signup" className="inline-flex h-12 items-center bg-electric px-[22px] text-xs font-semibold uppercase tracking-[1px] text-white hover:text-white">Start free</Link>
            </div>
          </>
        )}
        {res && !res.ok && <div className="px-6 py-10 text-sm text-danger sm:px-8">{res.error}</div>}
        {!res && <div className="px-6 py-10 text-sm text-muted sm:px-8">Enter a package to see every USPS, UPS and FedEx rate side by side.</div>}
      </div>
    </div>
  );
}
