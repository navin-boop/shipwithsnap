"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Checkbox, Chip } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/money";
import { emailTracking, voidLabel } from "@/lib/shipments/actions";
import type { ShipmentFilter, ShipmentRow } from "@/lib/shipments/queries";

// Spec: design/Shipments.dc.html — filter chips, searchable list, bulk actions in a bottom bar.

const FILTERS: Array<[ShipmentFilter, string]> = [["all", "All"], ["label", "Label bought"], ["transit", "In transit"], ["delivered", "Delivered"], ["exception", "Exception"], ["voided", "Voided"]];

const STATUS: Record<string, { label: string; color: string }> = {
  label_created: { label: "Label bought", color: "text-muted" },
  accepted: { label: "Accepted", color: "text-electric" },
  in_transit: { label: "In transit", color: "text-electric" },
  out_for_delivery: { label: "Out for delivery", color: "text-electric" },
  delivered: { label: "Delivered", color: "text-ink" },
  exception: { label: "Exception", color: "text-danger" },
  returned: { label: "Returned", color: "text-danger" },
  voided: { label: "Voided", color: "text-muted" },
};

function when(d: Date): string {
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ShipmentsTable({ rows, counts, filter, q }: { rows: ShipmentRow[]; counts: Record<ShipmentFilter, number>; filter: ShipmentFilter; q: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState(q);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function go(next: { filter?: ShipmentFilter; q?: string }) {
    const p = new URLSearchParams(params.toString());
    if (next.filter !== undefined) p.set("filter", next.filter);
    if (next.q !== undefined) {
      if (next.q) p.set("q", next.q);
      else p.delete("q");
    }
    router.push(`/shipments?${p.toString()}`);
  }

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.labelId));
  const selectedRows = rows.filter((r) => selected.has(r.labelId));

  function run(fn: (id: string) => Promise<{ ok: boolean; message?: string; error?: string }>) {
    start(async () => {
      const results = await Promise.all(selectedRows.map((r) => fn(r.labelId)));
      const errs = results.filter((r) => !r.ok).map((r) => (r as { error: string }).error);
      const oks = results.filter((r) => r.ok).map((r) => (r as { message?: string }).message).filter(Boolean);
      setNotice([...new Set([...oks, ...errs])].join(" · ") || "Done.");
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-4 px-6 pb-[18px] pt-7 sm:px-10 lg:flex-row lg:items-end lg:justify-between">
        <h1 className="disp text-[40px]">Shipments</h1>
        <div className="flex flex-wrap items-center gap-2.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              go({ q: search });
            }}
            className="flex h-10 w-full items-center gap-2 rounded-pill border-2 border-ink bg-surface px-3 sm:w-[280px]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, tracking, city" className="w-full bg-transparent text-[13px] outline-none placeholder:text-muted" />
          </form>
          <Link href="/addresses" className="inline-flex h-10 items-center rounded-pill border-2 border-ink bg-surface px-4 text-[14px] font-extrabold">Address book</Link>
          <a href={`/api/exports/shipments.csv?filter=${filter}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className="inline-flex h-10 items-center rounded-pill border-2 border-ink bg-surface px-4 text-[14px] font-extrabold">Export CSV</a>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 px-6 pb-[18px] sm:px-10">
        {FILTERS.map(([k, label]) => (
          <Chip key={k} selected={filter === k} count={counts[k]} onClick={() => go({ filter: k })}>{label}</Chip>
        ))}
      </div>

      <div className="hidden grid-cols-[40px_1.5fr_1.4fr_1fr_1fr_0.7fr_0.9fr] items-center border-b border-line border-t-2 px-10 py-2.5 md:grid">
        <Checkbox checked={allSelected} onChange={(v) => setSelected(v ? new Set(rows.map((r) => r.labelId)) : new Set())} label="Select all" />
        <div className="lbl">Recipient</div><div className="lbl">Service</div><div className="lbl">Tracking</div><div className="lbl">Status</div><div className="lbl text-right">Cost</div><div className="lbl text-right">Bought</div>
      </div>

      <div className="flex flex-col">
        {rows.map((r) => {
          const s = STATUS[r.status] ?? { label: r.status, color: "text-muted" };
          const on = selected.has(r.labelId);
          return (
            <div key={r.labelId} className={cn("grid grid-cols-[40px_1fr] items-center gap-y-1 border-b border-hairline px-6 py-3.5 sm:px-10 md:grid-cols-[40px_1.5fr_1.4fr_1fr_1fr_0.7fr_0.9fr]", on && "bg-surface")}>
              <Checkbox checked={on} onChange={(v) => setSelected((prev) => { const n = new Set(prev); if (v) n.add(r.labelId); else n.delete(r.labelId); return n; })} label={`Select ${r.name}`} />
              <div className="flex flex-col gap-0.5"><div className="text-sm font-semibold">{r.name}</div><div className="text-xs text-muted">{r.city}</div></div>
              <div className="col-start-2 text-sm md:col-start-auto">{r.service}</div>
              <Link href={`/t/${r.trackingToken}`} target="_blank" className="col-start-2 text-sm tracking-[0.4px] text-ink-2 md:col-start-auto">{r.trackingNumber}</Link>
              <div className={cn("col-start-2 inline-flex items-center gap-1.5 text-[14px] font-extrabold md:col-start-auto", s.color)}>
                <span className="h-2 w-2 bg-current" />
                <span>{s.label}{r.refundStatus === "submitted" ? " · refund pending" : ""}</span>
              </div>
              <div className="disp col-start-2 text-base md:col-start-auto md:text-right">{formatCents(r.priceCents)}</div>
              <div className="col-start-2 flex items-center gap-3 text-sm text-muted md:col-start-auto md:justify-end">
                <span>{when(r.purchasedAt)}</span>
                {r.status !== "voided" && (
                  <button type="button" title="Print label" aria-label={`Print label for ${r.name}`} onClick={() => window.open(`/api/labels/${r.labelId}/file`, "_blank", "noopener")} className="flex h-8 w-8 items-center justify-center rounded-pill border-2 border-ink bg-surface text-ink hover:bg-ink hover:text-paper">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z" /></svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {!rows.length && <div className="px-6 py-12 text-sm text-muted sm:px-10">{q ? "Nothing matches that search." : "No shipments here yet."}</div>}
      </div>

      <div className="sticky bottom-0 mt-auto flex flex-col gap-3 border-t-2 border-line bg-paper px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div className="text-[13px] text-muted">
          {selectedRows.length ? `${selectedRows.length} selected` : `Showing ${rows.length} of ${counts[filter]} shipments`}
          {notice && <span className="ml-3 text-ink">{notice}</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={selectedRows.length !== 1 || pending} onClick={() => window.open(`/api/labels/${selectedRows[0].labelId}/file`, "_blank", "noopener")}>Reprint</Button>
          <Button variant="outline" size="sm" disabled={!selectedRows.length || pending} onClick={() => confirm(`Void ${selectedRows.length} label(s)? Refunds follow once the carrier approves.`) && run(voidLabel)}>Void &amp; refund</Button>
          <Button variant="outline" size="sm" disabled={!selectedRows.length || pending} onClick={() => run(emailTracking)}>Email tracking</Button>
        </div>
      </div>
    </div>
  );
}
