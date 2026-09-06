"use client";

import { useState, useTransition } from "react";
import { Button, CarrierLogo, Input, Select } from "@/components/ui";
import { cn } from "@/lib/cn";
import { addTracker, refreshTracker, removeTracker, type TrackerView } from "@/lib/trackers/actions";
import { TRACKER_STATUS_DETAIL_LABELS } from "@/lib/shipping/options";

// Track any package — inbound supplies, a package you bought elsewhere, a customer's return.

const CARRIERS = [
  { value: "", label: "Detect the carrier" },
  { value: "USPS", label: "USPS" },
  { value: "UPS", label: "UPS" },
  { value: "FedEx", label: "FedEx" },
  { value: "DHLExpress", label: "DHL Express" },
];

const STATUS: Record<string, { label: string; tone: string }> = {
  label_created: { label: "Label created", tone: "bg-surface" },
  accepted: { label: "Accepted", tone: "bg-yellow" },
  in_transit: { label: "In transit", tone: "bg-yellow" },
  out_for_delivery: { label: "Out for delivery", tone: "bg-teal text-white" },
  delivered: { label: "Delivered", tone: "bg-teal text-white" },
  exception: { label: "Exception", tone: "bg-danger text-white" },
  returned: { label: "Returned", tone: "bg-danger text-white" },
};

export function TrackView({ initial }: { initial: TrackerView[] }) {
  const [trackers, setTrackers] = useState(initial);
  const [number, setNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [nickname, setNickname] = useState("");
  const [openId, setOpenId] = useState<string | null>(initial[0]?.id ?? null);
  const [notice, setNotice] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [pending, start] = useTransition();

  const say = (ok: boolean, text: string) => { setErr(!ok); setNotice(text); };
  const upsert = (t: TrackerView) => setTrackers((prev) => [t, ...prev.filter((x) => x.id !== t.id)]);

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-7 sm:px-10">
      <div className="flex flex-col gap-2">
        <h1 className="disp text-[40px]">Track a package</h1>
        <p className="max-w-[640px] text-[15px] font-bold text-ink-2">Any tracking number, any carrier — including packages you didn&apos;t label here. Labels you bought are tracked automatically under Shipments.</p>
      </div>

      <section className="card flex flex-col gap-4 p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_200px_minmax(0,1fr)]">
          <Input label="Tracking number" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="9400 1000 0000 0000 0000 00" onKeyDown={(e) => e.key === "Enter" && number && start(async () => { const r = await addTracker({ trackingNumber: number, carrier, nickname }); if (r.ok) { upsert(r.tracker); setOpenId(r.tracker.id); setNumber(""); setNickname(""); say(true, "Tracking it."); } else say(false, r.error); })} />
          <Select label="Carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} options={CARRIERS} />
          <Input label="Nickname (optional)" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Supplier box, customer return…" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="md" disabled={!number.trim() || pending} onClick={() => start(async () => {
            const r = await addTracker({ trackingNumber: number, carrier, nickname });
            if (r.ok) { upsert(r.tracker); setOpenId(r.tracker.id); setNumber(""); setNickname(""); say(true, "Tracking it."); } else say(false, r.error);
          })}>{pending ? "Looking…" : "Track it"}</Button>
          {notice && <span className={cn("text-[13px] font-bold", err ? "text-danger" : "text-teal")}>{notice}</span>}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        {trackers.length === 0 && <div className="text-[14px] font-bold text-muted">Nothing tracked yet.</div>}
        {trackers.map((t) => {
          const s = STATUS[t.status] ?? { label: t.status, tone: "bg-surface" };
          const open = openId === t.id;
          return (
            <div key={t.id} className="card-quiet flex flex-col p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button type="button" className="flex min-w-0 items-center gap-3 text-left" onClick={() => setOpenId(open ? null : t.id)}>
                  <CarrierLogo carrier={t.carrier} size={36} />
                  <div className="flex min-w-0 flex-col">
                    <div className="text-[15px] font-extrabold">{t.nickname ?? t.trackingNumber}</div>
                    <div className="text-[13px] font-bold text-muted">
                      {t.nickname ? `${t.trackingNumber} · ` : ""}{t.carrier}
                      {t.statusDetail ? ` · ${TRACKER_STATUS_DETAIL_LABELS[t.statusDetail] ?? t.statusDetail}` : ""}
                      {t.estDeliveryDate ? ` · expected ${new Date(t.estDeliveryDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-3">
                  <span className={cn("rounded-pill border-2 border-ink px-3 py-1 text-[12px] font-extrabold", s.tone)}>{s.label}</span>
                  <Button variant="outline" size="sm" disabled={pending} onClick={() => start(async () => { const r = await refreshTracker(t.id); if (r.ok) upsert(r.tracker); else say(false, r.error); })}>Refresh</Button>
                  <button type="button" className="text-[13px] font-extrabold text-muted hover:text-danger" onClick={() => start(async () => { await removeTracker(t.id); setTrackers((prev) => prev.filter((x) => x.id !== t.id)); })}>Remove</button>
                </div>
              </div>
              {open && t.events.length > 0 && (
                <div className="mt-3 flex flex-col border-t-2 border-hairline">
                  {t.events.map((e, i) => (
                    <div key={i} className="grid grid-cols-1 gap-1 border-b border-hairline py-2.5 sm:grid-cols-[190px_1fr] sm:gap-6">
                      <div className="text-[13px] font-bold text-muted">{new Date(e.occurredAt).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
                      <div className="flex flex-col"><span className="text-[14px] font-extrabold">{e.description}</span>{(e.city || e.state) && <span className="text-[13px] font-bold text-muted">{[e.city, e.state].filter(Boolean).join(", ")}</span>}</div>
                    </div>
                  ))}
                </div>
              )}
              {open && t.events.length === 0 && <div className="mt-3 border-t-2 border-hairline pt-3 text-[13px] font-bold text-muted">No scans yet.</div>}
            </div>
          );
        })}
      </section>
    </div>
  );
}
