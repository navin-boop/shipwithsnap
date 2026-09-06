"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, CarrierLogo, Input, Select } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/money";
import { cancelPickup, requestPickup, schedulePickup, type PickupView } from "@/lib/pickups/actions";

// Carrier pickups: pick a package, a day and a window, then choose from the carrier's pickup rates.

type Candidate = { labelId: string; trackingNumber: string; carrier: string; serviceName: string; shipFromId: string };

const WINDOWS: Array<[string, string, string]> = [
  ["09:00", "15:00", "Morning to afternoon (9–3)"],
  ["10:00", "16:00", "Mid-day (10–4)"],
  ["12:00", "17:00", "Afternoon (12–5)"],
  ["08:00", "18:00", "All day (8–6)"],
];

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + (d.getDay() === 6 ? 2 : 1));
  return d.toISOString().slice(0, 10);
}

export function PickupsView({ initial, candidates, preselect }: { initial: PickupView[]; candidates: Candidate[]; preselect: string | null }) {
  const [pickups, setPickups] = useState(initial);
  const [labelId, setLabelId] = useState(preselect ?? candidates[0]?.labelId ?? "");
  const [date, setDate] = useState(tomorrow());
  const [win, setWin] = useState(0);
  const [instructions, setInstructions] = useState("Packages are by the front door.");
  const [quoted, setQuoted] = useState<PickupView | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [pending, start] = useTransition();

  const say = (ok: boolean, text: string) => { setErr(!ok); setNotice(text); };
  const upsert = (p: PickupView) => setPickups((prev) => [p, ...prev.filter((x) => x.id !== p.id)]);

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-7 sm:px-10">
      <div className="flex flex-col gap-2">
        <h1 className="disp text-[40px]">Pickups</h1>
        <p className="max-w-[640px] text-[15px] font-bold text-ink-2">Have the carrier collect a package instead of walking to the post office. USPS pickups are free; UPS and FedEx charge a few dollars.</p>
      </div>

      <section className="card flex flex-col gap-4 p-5 sm:p-6">
        <div className="lbl">Schedule a pickup</div>
        {candidates.length === 0 ? (
          <div className="text-[14px] font-bold text-muted">Buy a label first — pickups are scheduled against a package that&apos;s ready to go. <Link href="/ship" className="text-coral">Ship something</Link>.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select label="Package" value={labelId} onChange={(e) => { setLabelId(e.target.value); setQuoted(null); }} options={candidates.map((c) => ({ value: c.labelId, label: `${c.carrier} ${c.serviceName} · ${c.trackingNumber}` }))} />
              <Input label="Date" type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => { setDate(e.target.value); setQuoted(null); }} />
              <Select label="Window" value={String(win)} onChange={(e) => { setWin(Number(e.target.value)); setQuoted(null); }} options={WINDOWS.map((w, i) => ({ value: String(i), label: w[2] }))} />
              <Input label="Where to find it — the driver needs this" placeholder="Front porch, side door, at reception…" value={instructions} onChange={(e) => setInstructions(e.target.value)} error={instructions.trim() ? undefined : "Carriers require pickup instructions."} />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="md" disabled={!labelId || !instructions.trim() || pending} onClick={() => start(async () => {
                const r = await requestPickup({ labelId, date, fromTime: WINDOWS[win][0], toTime: WINDOWS[win][1], instructions });
                if (r.ok) { setQuoted(r.pickup); upsert(r.pickup); say(true, "Pick a carrier below to confirm."); } else { setQuoted(null); say(false, r.error); }
              })}>{pending ? "Checking…" : "Check pickup options"}</Button>
              {notice && <span className={cn("text-[13px] font-bold", err ? "text-danger" : "text-teal")}>{notice}</span>}
            </div>
          </>
        )}

        {quoted && quoted.rates.length > 0 && (
          <div className="flex flex-col gap-3 border-t-2 border-hairline pt-4">
            <div className="lbl">Who should collect it?</div>
            <div className="flex flex-col gap-2.5">
              {quoted.rates.map((r) => (
                <div key={`${r.carrier}-${r.serviceCode}`} className="flex items-center justify-between gap-4 rounded-row border-2 border-hairline bg-surface px-4 py-3">
                  <div className="flex items-center gap-3">
                    <CarrierLogo carrier={r.carrier} size={40} />
                    <div className="flex flex-col"><div className="text-[15px] font-extrabold">{r.carrier}</div><div className="text-[13px] font-bold text-muted">{r.serviceCode}</div></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="disp text-[22px]">{r.priceCents === 0 ? "Free" : formatCents(r.priceCents)}</div>
                    <Button size="sm" disabled={pending} onClick={() => start(async () => {
                      const res = await schedulePickup(quoted.id, r.carrier, r.serviceCode);
                      if (res.ok) { upsert(res.pickup); setQuoted(null); say(true, `Scheduled — confirmation ${res.pickup.confirmation ?? "pending"}.`); } else say(false, res.error);
                    })}>Schedule</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="lbl">Scheduled</div>
        {pickups.filter((p) => p.status !== "quoted").length === 0 && <div className="text-[14px] font-bold text-muted">Nothing scheduled yet.</div>}
        {pickups.filter((p) => p.status !== "quoted").map((p) => (
          <div key={p.id} className="card-quiet flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="flex flex-col gap-0.5">
              <div className="text-[15px] font-extrabold">
                {p.carrier ?? "Carrier"} · {new Date(p.minDatetime).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                {" "}{new Date(p.minDatetime).toLocaleTimeString("en-US", { hour: "numeric" })}–{new Date(p.maxDatetime).toLocaleTimeString("en-US", { hour: "numeric" })}
              </div>
              <div className="text-[13px] font-bold text-muted">{p.address}{p.confirmation ? ` · confirmation ${p.confirmation}` : ""}{p.labelTracking ? ` · ${p.labelTracking}` : ""}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn("rounded-pill border-2 border-ink px-3 py-1 text-[12px] font-extrabold", p.status === "scheduled" ? "bg-teal text-white" : p.status === "canceled" ? "bg-surface text-muted" : "bg-coral text-white")}>{p.status}</span>
              {p.priceCents !== null && <span className="disp text-[18px]">{p.priceCents === 0 ? "Free" : formatCents(p.priceCents)}</span>}
              {p.status === "scheduled" && (
                <Button variant="outline" size="sm" disabled={pending} onClick={() => confirm("Cancel this pickup?") && start(async () => {
                  const r = await cancelPickup(p.id);
                  if (r.ok) { upsert(r.pickup); say(true, "Pickup cancelled."); } else say(false, r.error);
                })}>Cancel</Button>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
