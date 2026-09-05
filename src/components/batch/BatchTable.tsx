"use client";

import { useRef, useState, useTransition } from "react";
import { ArrowIcon, Button, Checkbox } from "@/components/ui";
import type { Order } from "@/lib/db/schema";
import { buyBatch, deleteOrders, importCsv, rateOrders, type RatedRow } from "@/lib/batch/actions";
import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/money";

// Spec: design/Batch.dc.html — sources, order rows with the cheapest rate pre-picked, one buy for all.

type Done = { batchId: string; okCount: number; failed: Array<{ orderId: string; error: string }> };

export function BatchTable({ orders, storeCounts }: { orders: Order[]; storeCounts: { csv: number } }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(orders.map((o) => o.id)));
  const [rated, setRated] = useState<Record<string, RatedRow>>({});
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedOrders = orders.filter((o) => selected.has(o.id));
  const allSelected = orders.length > 0 && selectedOrders.length === orders.length;
  const readyRows = selectedOrders.map((o) => rated[o.id]).filter((r): r is RatedRow => !!r && !!r.shipmentId && !!(choice[r.orderId] ?? r.chosenQuoteId));
  const chosen = (r: RatedRow) => r.quotes.find((q) => q.id === (choice[r.orderId] ?? r.chosenQuoteId));
  const totalPay = readyRows.reduce((a, r) => a + (chosen(r)?.priceCents ?? 0), 0);
  const totalRetail = readyRows.reduce((a, r) => a + (chosen(r)?.retailCents ?? chosen(r)?.priceCents ?? 0), 0);

  function upload(file: File) {
    const fd = new FormData();
    fd.set("file", file);
    start(async () => {
      const res = await importCsv(fd);
      setNotice(res.ok ? `Imported ${res.imported} order${res.imported === 1 ? "" : "s"}${res.skipped ? `, ${res.skipped} already there` : ""}${res.errors.length ? ` · ${res.errors.length} line(s) skipped: ${res.errors[0]}` : ""}` : res.error);
    });
  }

  function rate() {
    start(async () => {
      setNotice("Verifying addresses and getting rates…");
      const res = await rateOrders(selectedOrders.map((o) => o.id));
      if (!res.ok) return setNotice(res.error);
      setRated((prev) => ({ ...prev, ...Object.fromEntries(res.rows.map((r) => [r.orderId, r])) }));
      const bad = res.rows.filter((r) => r.error).length;
      setNotice(bad ? `${res.rows.length - bad} rated · ${bad} need attention` : `${res.rows.length} rated — cheapest picked for each`);
    });
  }

  function buy() {
    start(async () => {
      const res = await buyBatch(readyRows.map((r) => ({ orderId: r.orderId, shipmentId: r.shipmentId!, rateQuoteId: choice[r.orderId] ?? r.chosenQuoteId! })));
      if (!res.ok) return setNotice(res.error);
      setDone(res);
    });
  }

  if (done) {
    return (
      <div className="flex flex-1 flex-col gap-6 bg-ink px-6 py-7 text-paper sm:px-10">
        <div className="flex flex-col gap-1.5">
          <div className="lbl text-lime">{done.failed.length ? "Batch partly done" : "Batch done"}</div>
          <div className="disp text-[44px]">{done.okCount} label{done.okCount === 1 ? "" : "s"} ready.</div>
        </div>
        {done.failed.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-ink-2 pt-4 text-sm">
            <div className="lbl text-[#ff8a80]">{done.failed.length} didn&apos;t go through — nothing was charged for these</div>
            {done.failed.map((f) => (
              <div key={f.orderId} className="text-muted-on-ink">{orders.find((o) => o.id === f.orderId)?.number ?? f.orderId}: {f.error}</div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2.5">
          <Button variant="onInk" onClick={() => window.open(`/api/batches/${done.batchId}/labels.pdf`, "_blank", "noopener")}>Print all labels</Button>
          <a href={`/api/batches/${done.batchId}/labels.pdf`} download className="inline-flex h-12 items-center rounded-pill border-2 border-paper px-[22px] text-[14px] font-extrabold text-paper hover:text-paper">Download PDF</a>
          <a href="/shipments" className="inline-flex h-12 items-center px-[22px] text-[14px] font-extrabold text-muted-on-ink hover:text-paper">View shipments</a>
        </div>
        <button type="button" onClick={() => location.reload()} className="mt-auto self-start border-b-2 border-paper pb-0.5 text-[14px] font-extrabold">Back to batch</button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-4 px-6 pb-[18px] pt-7 sm:px-10 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="disp text-[40px]">Batch</h1>
          <p className="text-sm text-muted">Open orders from your stores. Snap picks the cheapest rate for each — change any row, then buy them all at once.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-pill border-2 border-ink bg-ink px-4 text-[14px] font-extrabold text-yellow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v12M6 10l6 6 6-6M4 20h16" /></svg>
            <span>Upload CSV{storeCounts.csv ? ` · ${storeCounts.csv} open` : ""}</span>
          </button>
          <a href="/api/batch/template.csv" className="inline-flex h-10 items-center rounded-pill border-2 border-ink bg-surface px-3.5 text-[14px] font-extrabold">CSV template</a>
          <span title="Store connections need Shopify partner credentials — coming soon" className="inline-flex h-10 cursor-not-allowed items-center rounded-pill border-2 border-hairline px-3.5 text-[14px] font-extrabold text-hairline">Connect Shopify</span>
          <span title="Coming soon" className="inline-flex h-10 cursor-not-allowed items-center rounded-pill border-2 border-hairline px-3.5 text-[14px] font-extrabold text-hairline">Connect Etsy</span>
        </div>
      </div>

      <div className="hidden grid-cols-[40px_0.9fr_1.5fr_1fr_1.6fr_0.7fr] items-center border-b border-line border-t-2 px-10 py-2.5 md:grid">
        <Checkbox checked={allSelected} onChange={(v) => setSelected(v ? new Set(orders.map((o) => o.id)) : new Set())} label="Select all" />
        <div className="lbl">Order</div><div className="lbl">Ship to</div><div className="lbl">Package</div><div className="lbl">Rate · cheapest picked</div><div className="lbl text-right">Cost</div>
      </div>

      <div className="flex flex-col">
        {orders.map((o) => {
          const on = selected.has(o.id);
          const r = rated[o.id];
          const q = r ? chosen(r) : undefined;
          return (
            <div key={o.id} className={cn("grid grid-cols-[40px_1fr] items-center gap-y-1 border-b border-hairline px-6 py-3 sm:px-10 md:grid-cols-[40px_0.9fr_1.5fr_1fr_1.6fr_0.7fr]", !on && "bg-[#e6e2d6]")}>
              <Checkbox checked={on} onChange={(v) => setSelected((prev) => { const n = new Set(prev); if (v) n.add(o.id); else n.delete(o.id); return n; })} label={`Select ${o.number}`} />
              <div className="flex flex-col gap-0.5"><div className="text-sm font-semibold">{o.number}</div><div className="text-xs text-muted">CSV</div></div>
              <div className="col-start-2 flex flex-col gap-0.5 md:col-start-auto"><div className="text-sm">{o.shipTo.name}</div><div className="text-xs text-muted">{o.shipTo.city}, {o.shipTo.state} {o.shipTo.zip}</div></div>
              <div className="col-start-2 text-[13px] text-ink-2 md:col-start-auto">
                {o.parcel ? `${o.parcel.lengthIn}×${o.parcel.widthIn}×${o.parcel.heightIn} · ${(o.parcel.weightOz / 16).toFixed(1)} lb` : "12×9×4 · 1 lb (assumed)"}
              </div>
              <div className="col-start-2 flex flex-col gap-1 md:col-start-auto">
                {r?.error && <div className="text-xs text-danger">{r.error}</div>}
                {r && !r.error && (
                  <select value={choice[o.id] ?? r.chosenQuoteId ?? ""} onChange={(e) => setChoice({ ...choice, [o.id]: e.target.value })} className="h-9 max-w-[320px] rounded-pill border-2 border-ink bg-surface bg-transparent px-2 text-sm font-semibold">
                    {r.quotes.map((x) => (
                      <option key={x.id} value={x.id}>{x.carrier} {x.serviceName} — {formatCents(x.priceCents)}{x.estDays ? ` · ${x.estDays}d` : ""}</option>
                    ))}
                  </select>
                )}
                {!r && <div className="text-xs text-muted">Not rated yet</div>}
                {r?.note && <div className="text-xs text-muted">{r.note}</div>}
              </div>
              <div className="disp col-start-2 text-base md:col-start-auto md:text-right">{q ? formatCents(q.priceCents) : "—"}</div>
            </div>
          );
        })}
        {!orders.length && (
          <div className="flex flex-col gap-3 px-6 py-12 text-sm text-muted sm:px-10">
            <div>No open orders. Upload a CSV to get started — one row per package, with name, address and weight.</div>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 mt-auto flex flex-col gap-4 border-t-2 border-line bg-ink px-6 py-5 text-paper sm:px-10 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-10">
          <div className="flex flex-col gap-0.5"><div className="lbl text-muted-on-ink">Selected</div><div className="disp text-2xl">{selectedOrders.length} of {orders.length}</div></div>
          <div className="flex flex-col gap-0.5"><div className="lbl text-muted-on-ink">Retail would be</div><div className="disp text-2xl text-muted-on-ink line-through">{formatCents(totalRetail)}</div></div>
          <div className="flex flex-col gap-0.5"><div className="lbl text-muted-on-ink">You pay</div><div className="disp text-2xl text-lime">{formatCents(totalPay)}</div></div>
        </div>
        <div className="flex flex-col items-start gap-3 lg:items-end">
          <div className="flex flex-wrap gap-2.5">
            <Button variant="onInkOutline" size="sm" disabled={!selectedOrders.length || pending} onClick={() => confirm(`Remove ${selectedOrders.length} order(s) from the list?`) && start(async () => { await deleteOrders(selectedOrders.map((o) => o.id)); location.reload(); })}>Remove</Button>
            <Button variant="onInkOutline" disabled={!selectedOrders.length || pending} onClick={rate}>{pending ? "Working…" : "Get rates"}</Button>
            <Button size="lg" icon={<ArrowIcon />} disabled={!readyRows.length || pending} onClick={buy}>Buy {readyRows.length} label{readyRows.length === 1 ? "" : "s"} — {formatCents(totalPay)}</Button>
          </div>
          <div className="text-[13px] text-muted-on-ink">
            {notice ?? (!orders.length ? "Step 1 · Upload a CSV of orders (use the template)" : !Object.keys(rated).length ? "Step 2 · Select orders and press Get rates" : readyRows.length ? "Step 3 · Check the rates, then buy — one charge, one PDF" : "Fix the rows that need attention, or deselect them")}
          </div>
        </div>
      </div>
    </div>
  );
}
