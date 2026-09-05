"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowIcon, Button, Input, RateRow } from "@/components/ui";
import { publicRates, type PublicRatesResult } from "@/lib/ship/public-rates";

export function RateCalculator() {
  const [f, setF] = useState({ fromZip: "11201", toZip: "78704", lengthIn: "12", widthIn: "9", heightIn: "4", weightLb: "1.8" });
  const [res, setRes] = useState<PublicRatesResult | null>(null);
  const [pending, start] = useTransition();
  const [showAll, setShowAll] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      setRes(await publicRates(f));
      setShowAll(false);
    });
  }

  const all = res?.ok ? res.rates : [];
  const rates = showAll ? all : all.slice(0, 5);
  const fastest = all.reduce<(typeof all)[number] | null>((b, r) => (r.estDays !== null && (b === null || (b.estDays ?? 99) > r.estDays) ? r : b), null);

  return (
    <div className="grid grid-cols-1 gap-6 px-6 py-10 sm:px-16 lg:grid-cols-[460px_minmax(0,1fr)] lg:gap-10">
      <form onSubmit={submit} className="card flex flex-col gap-5 self-start p-6">
        <div className="grid grid-cols-2 gap-4">
          <Input label="From ZIP" inputMode="numeric" value={f.fromZip} onChange={set("fromZip")} />
          <Input label="To ZIP" inputMode="numeric" value={f.toZip} onChange={set("toZip")} />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Input label="Length" unit="in" inputMode="decimal" value={f.lengthIn} onChange={set("lengthIn")} />
          <Input label="Width" unit="in" inputMode="decimal" value={f.widthIn} onChange={set("widthIn")} />
          <Input label="Height" unit="in" inputMode="decimal" value={f.heightIn} onChange={set("heightIn")} />
          <Input label="Weight" unit="lb" inputMode="decimal" value={f.weightLb} onChange={set("weightLb")} className="[&_label]:text-coral [&_input]:border-coral [&_input]:bg-coral-soft" />
        </div>
        <Button type="submit" size="lg" icon={<ArrowIcon />} disabled={pending} className="self-start">
          {pending ? "Checking…" : "Check rates"}
        </Button>
        <p className="text-[13px] font-bold leading-[1.5] text-muted">ZIP-to-ZIP estimates. Exact prices — including residential surcharges — show once you enter a full address in the app.</p>
      </form>

      <div className="flex min-h-[320px] flex-col gap-3">
        {res?.ok && (
          <>
            <div className="flex items-baseline justify-between px-1"><div className="disp text-[22px]">Cheapest first</div><div className="text-[14px] font-extrabold text-muted">{all.length} options</div></div>
            <div className="flex flex-col gap-3 pt-2">
              {rates.map((r, i) => (
                <RateRow key={r.carrier + r.serviceName} carrier={r.carrier} service={r.serviceName} eta={r.estDays !== null ? `${r.estDays} day${r.estDays === 1 ? "" : "s"}` : "—"} days={0} tag={i === 0 ? "Cheapest" : r === fastest ? "Fastest" : undefined} retailCents={r.retailCents} priceCents={r.priceCents} selected={i === 0} />
              ))}
              {all.length > 5 && <button type="button" className="self-center py-1 text-[14px] font-extrabold text-coral" onClick={() => setShowAll(!showAll)}>{showAll ? "Show fewer" : `Show ${all.length - 5} more`}</button>}
            </div>
            <div className="flex flex-col items-start gap-3 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-[15px] font-bold text-ink-2">Like what you see? Labels take about a minute.</div>
              <Link href="/signup" className="inline-flex h-12 items-center gap-2 rounded-pill border-2 border-ink bg-coral px-[22px] font-display text-[14px] font-extrabold text-white offset-shadow hover:text-white">Start free <ArrowIcon size={16} /></Link>
            </div>
          </>
        )}
        {res && !res.ok && <div className="card-quiet p-6 text-[15px] font-bold text-danger">{res.error}</div>}
        {!res && <div className="card-quiet p-6 text-[15px] font-bold text-muted">Enter a package to see every USPS, UPS and FedEx rate side by side.</div>}
      </div>
    </div>
  );
}
