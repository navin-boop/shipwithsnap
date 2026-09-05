"use client";

import { useState } from "react";
import { AppNav } from "@/components/AppNav";
import { ArrowIcon, Button, CarrierLogo, Checkbox, Chip, Input, RateRow, Switch, Wordmark } from "@/components/ui";

// Sunny design system, live. Compare against design/SunnyShip.dc.html before shipping a screen.
const swatches = [
  ["Cream", "bg-paper border-2 border-ink", "#fff8ee · page"],
  ["White", "bg-surface border-2 border-ink", "#ffffff · cards"],
  ["Ink", "bg-ink", "#2b2320 · text, outlines"],
  ["Ink 2", "bg-ink-2", "#5c524b · body"],
  ["Muted", "bg-muted", "#7a6f68 · labels"],
  ["Hairline", "bg-hairline", "#e9dfd4 · quiet borders"],
  ["Coral", "bg-coral", "#ff5c39 · primary"],
  ["Teal", "bg-teal", "#0fa3a3 · verified, selected"],
  ["Yellow", "bg-yellow", "#ffd23f · the price you pay"],
] as const;

export default function Styleguide() {
  const [pkg, setPkg] = useState("box");
  const [on, setOn] = useState(true);
  const [checked, setChecked] = useState(true);
  const [rate, setRate] = useState("ga");

  return (
    <div className="min-h-screen bg-paper">
      <AppNav cardLabel="Visa ·· 4242" />
      <main className="flex flex-col gap-8 px-6 py-8 sm:px-12">
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-1.5">
            <h1 className="disp text-[44px]">Snap design system</h1>
            <p className="text-[15px] font-bold text-muted">Sunny — Sora + Nunito, cream, coral, teal, yellow, 2px outlines with offset shadows.</p>
          </div>
          <Wordmark className="text-[32px]" />
        </div>

        <section className="card flex flex-col gap-4 p-6">
          <div className="lbl">Colour</div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-9">
            {swatches.map(([name, cls, note]) => (
              <div key={name} className="flex flex-col gap-1.5">
                <div className={`h-16 rounded-[14px] ${cls}`} />
                <div className="text-[13px] font-extrabold">{name}</div>
                <div className="text-[12px] font-bold text-muted">{note}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="card flex flex-col gap-4 p-6">
          <div className="lbl">Type</div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="flex flex-col gap-2"><div className="disp text-[72px]">Sora 800</div><div className="text-[13px] font-bold text-muted">Display · headlines, prices, buttons · 76 / 56 / 44 / 40 / 24 / 22 / 20</div></div>
            <div className="flex flex-col gap-2"><p className="text-[20px] font-semibold leading-[1.5] text-ink-2">Nunito 600 for reading, <b className="font-extrabold text-ink">800 for labels and anything clickable</b>.</p><div className="text-[13px] font-bold text-muted">Body · 20 / 18 / 16 / 15 / 14 / 13</div></div>
          </div>
        </section>

        <section className="card flex flex-col gap-4 p-6">
          <div className="lbl">Buttons · 40 / 48 / 58 · pills</div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" icon={<ArrowIcon />}>Primary — buy label</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="outline" size="sm">Small outline</Button>
            <div className="rounded-[14px] bg-ink p-3"><Button variant="onInk">On ink</Button></div>
            <Button variant="text">Text link</Button>
            <Button disabled>Disabled</Button>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1fr_1.4fr]">
          <section className="card flex flex-col gap-4 p-6">
            <div className="lbl">Inputs</div>
            <Input label="Default" defaultValue="418 Bergen St" />
            <Input label="With unit" defaultValue="1.8" unit="lb" />
            <Input label="Error" defaultValue="1121" error="ZIP needs 5 digits." />
          </section>
          <section className="card flex flex-col gap-4 p-6">
            <div className="lbl">Chips · toggles · carrier marks</div>
            <div className="flex flex-wrap gap-2">
              {["box", "mailer", "flat"].map((k) => (
                <Chip key={k} selected={pkg === k} onClick={() => setPkg(k)}>{k === "box" ? "Box" : k === "mailer" ? "Poly mailer" : "Flat rate"}</Chip>
              ))}
              <Chip count={12}>Filter</Chip>
            </div>
            <div className="flex items-center gap-4">
              <Switch checked={on} onChange={setOn} label="Example switch" />
              <Checkbox checked={checked} onChange={setChecked} label="Example checkbox" />
              <CarrierLogo carrier="USPS" size={40} /><CarrierLogo carrier="UPS" size={40} /><CarrierLogo carrier="FedEx" size={40} />
            </div>
            <div className="text-[12px] font-bold text-muted">Carrier marks show the official logos once the files are in public/carriers/.</div>
          </section>
          <section className="flex flex-col gap-4">
            <div className="lbl px-1">Rate card · the core component</div>
            <div className="flex flex-col gap-3 pt-2" role="listbox">
              <RateRow carrier="USPS" service="Ground Advantage" eta="Monday" days={3} tag="Cheapest" retailCents={1080} priceCents={568} selected={rate === "ga"} onSelect={() => setRate("ga")} />
              <RateRow carrier="UPS" service="Ground Saver" eta="Tuesday" days={4} retailCents={1132} priceCents={716} selected={rate === "ugs"} onSelect={() => setRate("ugs")} />
              <RateRow carrier="FedEx" service="Ground Economy" eta="Wednesday" days={4} tag="Fastest" retailCents={null} priceCents={749} selected={rate === "fx"} onSelect={() => setRate("fx")} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
