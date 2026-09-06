"use client";

import { useState, useTransition } from "react";
import { Button, CarrierLogo, Checkbox } from "@/components/ui";
import { cn } from "@/lib/cn";
import { createManifest, refreshManifest, type ManifestCandidate, type ManifestView } from "@/lib/manifests/actions";

// End-of-day manifests (SCAN forms): one barcode the driver scans for the whole stack.

export function ManifestsView({ initial, candidates }: { initial: ManifestView[]; candidates: ManifestCandidate[] }) {
  const carriers = [...new Set(candidates.map((c) => c.carrier))];
  const [carrier, setCarrier] = useState(carriers[0] ?? "");
  const [manifests, setManifests] = useState(initial);
  const [selected, setSelected] = useState<Set<string>>(new Set(candidates.filter((c) => c.carrier === (carriers[0] ?? "")).map((c) => c.labelId)));
  const [notice, setNotice] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [pending, start] = useTransition();

  const rows = candidates.filter((c) => c.carrier === carrier);
  const say = (ok: boolean, text: string) => { setErr(!ok); setNotice(text); };

  function switchCarrier(c: string) {
    setCarrier(c);
    setSelected(new Set(candidates.filter((x) => x.carrier === c).map((x) => x.labelId)));
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-7 sm:px-10">
      <div className="flex flex-col gap-2">
        <h1 className="disp text-[40px]">End-of-day manifest</h1>
        <p className="max-w-[680px] text-[15px] font-bold text-ink-2">Hand the driver one sheet instead of waiting for every package to be scanned. Build it after you&apos;ve printed the day&apos;s labels and before they leave.</p>
      </div>

      <section className="card flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="lbl">Packages not yet manifested</div>
          <div className="flex gap-2">
            {carriers.map((c) => (
              <button key={c} type="button" onClick={() => switchCarrier(c)} className={cn("flex items-center gap-2 rounded-pill border-2 border-ink px-3 py-1.5 text-[13px] font-extrabold", carrier === c ? "bg-ink text-yellow" : "bg-surface")}>
                <CarrierLogo carrier={c} size={22} inverted={carrier === c} />{c} · {candidates.filter((x) => x.carrier === c).length}
              </button>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="text-[14px] font-bold text-muted">Every label is already on a manifest, or nothing has been bought today.</div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b-2 border-hairline pb-2">
              <Checkbox checked={selected.size === rows.length} onChange={(v) => setSelected(v ? new Set(rows.map((r) => r.labelId)) : new Set())} label="Select all" />
              <span className="lbl">{selected.size} of {rows.length} selected</span>
            </div>
            <div className="flex max-h-[320px] flex-col overflow-y-auto">
              {rows.map((r) => (
                <div key={r.labelId} className="flex items-center gap-3 border-b border-hairline py-2.5">
                  <Checkbox checked={selected.has(r.labelId)} onChange={(v) => setSelected((prev) => { const n = new Set(prev); if (v) n.add(r.labelId); else n.delete(r.labelId); return n; })} label={`Select ${r.trackingNumber}`} />
                  <div className="flex min-w-0 flex-1 flex-col"><span className="text-[14px] font-extrabold">{r.name}</span><span className="text-[12px] font-bold text-muted">{r.serviceName} · {r.trackingNumber}</span></div>
                  <span className="text-[12px] font-bold text-muted">{new Date(r.purchasedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="md" disabled={!selected.size || pending} onClick={() => start(async () => {
                const r = await createManifest([...selected]);
                if (r.ok) { setManifests([r.manifest, ...manifests]); setSelected(new Set()); say(true, "Manifest ready — print it and hand it to the driver."); } else say(false, r.error);
              })}>{pending ? "Building…" : `Build manifest for ${selected.size} package${selected.size === 1 ? "" : "s"}`}</Button>
              {notice && <span className={cn("text-[13px] font-bold", err ? "text-danger" : "text-teal")}>{notice}</span>}
            </div>
          </>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="lbl">Manifests</div>
        {manifests.length === 0 && <div className="text-[14px] font-bold text-muted">No manifests yet.</div>}
        {manifests.map((m) => (
          <div key={m.id} className="card-quiet flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <CarrierLogo carrier={m.carrier} size={36} />
              <div className="flex flex-col">
                <div className="text-[15px] font-extrabold">{m.carrier} · {m.labelCount} package{m.labelCount === 1 ? "" : "s"}</div>
                <div className="text-[13px] font-bold text-muted">{new Date(m.createdAt).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}{m.message ? ` · ${m.message}` : ""}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn("rounded-pill border-2 border-ink px-3 py-1 text-[12px] font-extrabold", m.status === "created" ? "bg-teal text-white" : m.status === "failed" ? "bg-danger text-white" : "bg-yellow")}>{m.status}</span>
              {m.formUrl && <Button variant="secondary" size="sm" onClick={() => window.open(m.formUrl!, "_blank", "noopener")}>Print</Button>}
              {m.status === "creating" && (
                <Button variant="outline" size="sm" disabled={pending} onClick={() => start(async () => { const r = await refreshManifest(m.id); if (r.ok) setManifests((prev) => prev.map((x) => (x.id === m.id ? r.manifest : x))); })}>Refresh</Button>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
