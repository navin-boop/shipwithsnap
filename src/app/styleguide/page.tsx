"use client";

import { useState } from "react";
import { AppNav } from "@/components/AppNav";
import { ArrowIcon, Button, Checkbox, Chip, Input, RateRow, Switch, Wordmark } from "@/components/ui";

// Mirrors design/Components.dc.html so the implementation can be checked against the sheet.
const swatches = [
  ["Paper", "bg-paper border-[1.5px] border-ink", "#f2efe6 · bg"],
  ["Surface", "bg-surface border-[1.5px] border-ink", "#ffffff · cards, print"],
  ["Ink", "bg-ink", "#111111 · text, rules, selected"],
  ["Ink 2", "bg-ink-2", "#3d3b36 · body on paper"],
  ["Muted", "bg-muted", "#6b6860 · labels, hints"],
  ["Hairline", "bg-hairline", "#c9c4b6 · row dividers, empty"],
  ["Electric", "bg-electric", "#2d5bff · primary action, live"],
  ["Lime", "bg-lime", "#c8ff3d · price on ink only"],
] as const;

export default function Styleguide() {
  const [pkg, setPkg] = useState("box");
  const [on, setOn] = useState(true);
  const [checked, setChecked] = useState(true);
  const [rate, setRate] = useState("ga");

  return (
    <div className="min-h-screen bg-paper">
      <AppNav cardLabel="Visa ·· 4242" />
      <main className="flex flex-col gap-0 px-12 py-10">
        <div className="flex items-end justify-between pb-6">
          <div className="flex flex-col gap-1.5">
            <h1 className="disp text-[44px]">Snap design system</h1>
            <p className="text-sm text-muted">
              Implementation of design/Components.dc.html. Compare side by side before shipping a screen.
            </p>
          </div>
          <Wordmark className="text-[28px]" />
        </div>

        <Section title="Color">
          <div className="grid grid-cols-8 gap-3">
            {swatches.map(([name, cls, note]) => (
              <div key={name} className="flex flex-col gap-1.5">
                <div className={`h-16 ${cls}`} />
                <div className="text-xs font-semibold">{name}</div>
                <div className="font-mono text-xs text-ink-2">{note}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Type">
          <div className="grid grid-cols-2 gap-12">
            <div className="flex flex-col gap-3">
              <div className="disp text-[96px] leading-[0.9]">Syne 800</div>
              <div className="font-mono text-xs text-ink-2">Display · 96 / 72 / 56 / 44 / 40 / 28 / 22 / 16 · line-height 0.9–0.95 · tracking −2%</div>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-xl leading-[1.45] text-ink-2">
                Archivo 400 for reading. Archivo 500 for inputs and names,{" "}
                <span className="font-semibold">600 for emphasis and every button</span>.
              </p>
              <div className="font-mono text-xs text-ink-2">Body · 20 / 16 / 15 / 14 / 13 / 12 · line-height 1.45–1.55</div>
              <div className="lbl">Label · Archivo 600 · 11px · tracking 1.2px · uppercase · muted</div>
            </div>
          </div>
        </Section>

        <Section title="Buttons · 40 / 48 / 56 tall · square · uppercase 600">
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" icon={<ArrowIcon />}>Primary — buy label</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="outline" size="sm">Small outline</Button>
            <div className="bg-ink p-3">
              <Button variant="onInk">On ink — print</Button>
            </div>
            <Button variant="text">Text link</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Section>

        <Section>
          <div className="grid grid-cols-[1fr_1fr_1.6fr] gap-12">
            <div className="flex flex-col gap-3.5">
              <div className="lbl">Inputs · underline only</div>
              <Input label="Default" defaultValue="418 Bergen St" />
              <Input label="With unit" defaultValue="1.8" unit="lb" />
              <Input label="Error" defaultValue="1121" error="ZIP needs 5 digits." />
            </div>
            <div className="flex flex-col gap-3.5">
              <div className="lbl">Chips · toggles · 36–44 tall</div>
              <div className="flex gap-2">
                {["box", "mailer", "flat"].map((k) => (
                  <Chip key={k} selected={pkg === k} onClick={() => setPkg(k)}>
                    {k === "box" ? "Box" : k === "mailer" ? "Poly mailer" : "Flat rate"}
                  </Chip>
                ))}
                <Chip count={12}>Filter</Chip>
              </div>
              <div className="flex items-center gap-4">
                <Switch checked={on} onChange={setOn} label="Example switch" />
                <Checkbox checked={checked} onChange={setChecked} label="Example checkbox" />
                <div className="font-mono text-xs text-ink-2">switch · checkbox</div>
              </div>
            </div>
            <div className="flex flex-col gap-3.5">
              <div className="lbl">Rate row · the core component</div>
              <div className="flex flex-col border-t-2 border-ink" role="listbox">
                <RateRow carrier="USPS" service="Ground Advantage" eta="Mon Sep 7" days={3} tag="Cheapest" retailCents={979} priceCents={643} selected={rate === "ga"} onSelect={() => setRate("ga")} />
                <RateRow carrier="UPS" service="Ground Saver" eta="Tue Sep 8" days={4} retailCents={1132} priceCents={716} selected={rate === "ugs"} onSelect={() => setRate("ugs")} />
              </div>
              <div className="font-mono text-xs text-ink-2">Selected = inverted to ink, price in lime, name grows 16→22px.</div>
            </div>
          </div>
        </Section>
      </main>
    </div>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3.5 border-t-2 border-ink py-6">
      {title && <div className="lbl">{title}</div>}
      {children}
    </section>
  );
}
