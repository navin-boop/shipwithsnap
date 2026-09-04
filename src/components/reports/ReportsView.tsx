"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/money";
import type { Range, Report } from "@/lib/reports/queries";

// Spec: design/Reports.dc.html — stat tiles, single-hue bars with hover detail, by-service table.
const RANGES: Array<[Range, string]> = [["7d", "Last 7 days"], ["30d", "Last 30 days"], ["90d", "Last 90 days"]];

export function ReportsView({ report }: { report: Report }) {
  const [hover, setHover] = useState<number>(-1);
  const max = Math.max(1, ...report.series.map((s) => s.spendCents));
  const h = hover >= 0 ? report.series[hover] : null;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-4 px-6 pb-[18px] pt-7 sm:px-10 lg:flex-row lg:items-end lg:justify-between">
        <h1 className="disp text-[40px]">Reports</h1>
        <div className="flex flex-wrap gap-2">
          {RANGES.map(([k, label]) => (
            <Link key={k} href={`/reports?range=${k}`} className={cn("inline-flex h-9 items-center border-[1.5px] border-ink px-3.5 text-[11px] font-semibold uppercase tracking-[0.8px]", report.range === k ? "bg-ink text-paper hover:text-paper" : "")}>{label}</Link>
          ))}
          <a href={`/api/exports/shipments.csv`} className="inline-flex h-9 items-center border-[1.5px] border-ink px-3.5 text-[11px] font-semibold uppercase tracking-[0.8px]">Export CSV</a>
        </div>
      </div>

      <div className="grid grid-cols-2 border-b-2 border-t-2 border-ink md:grid-cols-4">
        <Tile label="Postage spent" value={formatCents(report.totals.spendCents)} />
        <Tile label="Labels bought" value={String(report.totals.labels)} />
        <Tile label="Saved vs retail" value={formatCents(report.totals.savedCents)} accent />
        <Tile label="Average per label" value={formatCents(report.totals.avgCents)} last />
      </div>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-3.5 px-6 py-6 sm:px-10 lg:border-r-2 lg:border-ink">
          <div className="flex items-baseline justify-between">
            <div className="text-[15px] font-semibold">Postage spent by {report.bucket}</div>
            <div className="text-[13px] text-muted">{h ? `${h.label} · ${formatCents(h.spendCents)} · ${h.labels} label${h.labels === 1 ? "" : "s"}` : "Hover a bar for detail"}</div>
          </div>
          <div className="flex min-h-[260px] flex-1 flex-col">
            <div className="grid flex-1 items-end gap-0.5 border-b-[1.5px] border-ink px-2" style={{ gridTemplateColumns: `repeat(${report.series.length}, minmax(0, 1fr))` }}>
              {report.series.map((s, i) => (
                <div key={i} className="flex h-full cursor-pointer flex-col items-center justify-end gap-1.5" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(-1)}>
                  <div className={cn("text-xs font-semibold", hover === i ? "text-electric" : "text-transparent")}>{formatCents(s.spendCents)}</div>
                  <div className={cn("w-full max-w-[44px] rounded-t", hover === i ? "bg-electric" : "bg-ink")} style={{ height: `${Math.max(2, Math.round((s.spendCents / max) * 100))}%` }} />
                </div>
              ))}
            </div>
            <div className="grid gap-0.5 px-2 pt-2" style={{ gridTemplateColumns: `repeat(${report.series.length}, minmax(0, 1fr))` }}>
              {report.series.map((s, i) => (
                <div key={i} className="truncate text-center text-[11px] text-muted">{s.label}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 px-6 py-6 sm:px-10">
          <div className="text-[15px] font-semibold">By service</div>
          <div className="grid grid-cols-[1.6fr_0.6fr_0.8fr_0.8fr_0.8fr] border-b border-ink border-t-[1.5px] py-2">
            <div className="lbl">Service</div><div className="lbl text-right">Labels</div><div className="lbl text-right">Spent</div><div className="lbl text-right">Avg</div><div className="lbl text-right">Saved</div>
          </div>
          {report.services.map((s) => (
            <div key={s.name} className="grid grid-cols-[1.6fr_0.6fr_0.8fr_0.8fr_0.8fr] items-center border-b border-hairline py-2.5 text-sm">
              <div className="flex items-center gap-2.5"><span className="h-2 w-2 bg-ink" /><span className="truncate">{s.name}</span></div>
              <div className="text-right">{s.labels}</div>
              <div className="disp text-right text-[15px]">{formatCents(s.spendCents)}</div>
              <div className="text-right text-muted">{formatCents(s.avgCents)}</div>
              <div className="text-right font-semibold text-electric">{formatCents(s.savedCents)}</div>
            </div>
          ))}
          {!report.services.length && <div className="py-6 text-sm text-muted">No labels in this period yet.</div>}
          <p className="mt-auto text-xs leading-[1.5] text-muted">Savings compare what you paid with the carrier&apos;s published retail price for the same service on the day of purchase.</p>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, accent, last }: { label: string; value: string; accent?: boolean; last?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-1.5 px-6 py-[22px] sm:px-10", !last && "border-r border-ink", "max-md:[&:nth-child(2)]:border-r-0 max-md:[&:nth-child(-n+2)]:border-b")}>
      <div className="lbl">{label}</div>
      <div className={cn("disp text-[32px] sm:text-[40px]", accent && "text-electric")}>{value}</div>
    </div>
  );
}
