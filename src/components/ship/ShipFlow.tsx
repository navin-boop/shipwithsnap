"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowIcon, Button, Chip, Input, RateRow } from "@/components/ui";
import type { Address } from "@/lib/db/schema";
import { formatAddressLine } from "@/lib/ship/address";
import { buy, getRates, verifyShipTo, type BuyResult, type QuoteResult, type VerifyResult } from "@/lib/ship/actions";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/cn";
import { ShipFromForm } from "./ShipFromForm";

// Spec: design/Main.dc.html. Left: address, ship-from, package, extras. Right: rates, buy, label-ready panel.

type PkgType = "box" | "mailer" | "flat_rate";
type Rate = Extract<QuoteResult, { ok: true }>["quote"]["rates"][number];
type Label = Extract<BuyResult, { ok: true }>["label"];

const FLAT_RATE = [
  { code: "SmallFlatRateBox", label: "Small box" },
  { code: "MediumFlatRateBox", label: "Medium box" },
  { code: "LargeFlatRateBox", label: "Large box" },
  { code: "FlatRateEnvelope", label: "Envelope" },
];

function etaLabel(r: Rate): string {
  const d = r.estDeliveryDate ? new Date(r.estDeliveryDate + "T12:00:00") : r.estDays ? new Date(Date.now() + r.estDays * 86_400_000) : null;
  return d ? d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "—";
}

export function ShipFlow({ initialFrom }: { initialFrom: Address | null }) {
  // Ship to
  const [toName, setToName] = useState("");
  const [toLine, setToLine] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [verified, setVerified] = useState<Extract<VerifyResult, { ok: true }> | null>(null);
  const [verifyErrors, setVerifyErrors] = useState<string[]>([]);
  const [verifying, startVerify] = useTransition();

  // Ship from
  const [from, setFrom] = useState<Address | null>(initialFrom);
  const [editingFrom, setEditingFrom] = useState(!initialFrom);

  // Package
  const [pkg, setPkg] = useState<PkgType>("box");
  const [flat, setFlat] = useState(FLAT_RATE[0].code);
  const [dims, setDims] = useState({ l: "12", w: "9", h: "4" });
  const [weightLb, setWeightLb] = useState("1.8");
  const [insure, setInsure] = useState(false);
  const [signature, setSignature] = useState(false);

  // Rates
  const [quote, setQuote] = useState<Extract<QuoteResult, { ok: true }>["quote"] | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoting, startQuote] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const idemKey = useRef<string>("");

  // Buy
  const [buying, startBuy] = useTransition();
  const [buyError, setBuyError] = useState<string | null>(null);
  const [label, setLabel] = useState<Label | null>(null);

  const parcel = useMemo(() => {
    const weightOz = Math.round(parseFloat(weightLb) * 16);
    const n = (s: string) => parseFloat(s);
    if (pkg === "flat_rate") return Number.isFinite(weightOz) && weightOz > 0 ? { type: pkg, lengthIn: 1, widthIn: 1, heightIn: 1, weightOz, predefinedPackage: flat } : null;
    const [l, w, h] = [n(dims.l), n(dims.w), n(dims.h)];
    if (![l, w, h].every((x) => Number.isFinite(x) && x > 0) || !Number.isFinite(weightOz) || weightOz <= 0) return null;
    return { type: pkg, lengthIn: l, widthIn: w, heightIn: pkg === "mailer" ? Math.min(h, 1) : h, weightOz };
  }, [pkg, flat, dims, weightLb]);

  const verify = useCallback(() => {
    if (!toLine.trim()) return;
    startVerify(async () => {
      const res = await verifyShipTo(toName, toLine, toEmail);
      if (res.ok) {
        setVerified(res);
        setVerifyErrors([]);
      } else {
        setVerified(null);
        setVerifyErrors(res.errors);
      }
    });
  }, [toName, toLine, toEmail]);

  // Re-rate whenever the inputs that affect price settle (design: rates recalculate live).
  const quoteKey = JSON.stringify({ to: verified?.address, fromId: from?.id, parcel, insure, signature });
  useEffect(() => {
    if (!verified || !from || !parcel || label) return;
    const t = setTimeout(() => {
      startQuote(async () => {
        setQuoteError(null);
        const res = await getRates({
          to: verified.address,
          toResidential: verified.residential,
          fromId: from.id,
          parcel,
          extras: { insuranceCents: insure ? 10_000 : undefined, signature },
        });
        if (res.ok) {
          setQuote(res.quote);
          idemKey.current = crypto.randomUUID();
          setSelectedId((prev) => (res.quote.rates.some((r) => r.id === prev) ? prev : res.quote.rates[0]?.id ?? null));
        } else {
          setQuote(null);
          setQuoteError(res.error);
        }
      });
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey, label]);

  const rates = quote?.rates ?? [];
  const selected = rates.find((r) => r.id === selectedId) ?? rates[0] ?? null;
  const cheapest = rates[0];
  const fastest = rates.reduce<Rate | null>((best, r) => (r.estDays !== null && (best === null || (best.estDays ?? 99) > r.estDays) ? r : best), null);

  function onBuy() {
    if (!quote || !selected) return;
    setBuyError(null);
    startBuy(async () => {
      const res = await buy({ shipmentId: quote.shipmentId, rateQuoteId: selected.id, idempotencyKey: idemKey.current });
      if (res.ok) setLabel(res.label);
      else if (res.code === "rate_expired") {
        setBuyError(res.error);
        setQuote(null);
      } else setBuyError(res.error);
    });
  }

  function reset() {
    setLabel(null);
    setQuote(null);
    setSelectedId(null);
    setVerified(null);
    setToName("");
    setToLine("");
    setToEmail("");
    setBuyError(null);
  }

  const weightNum = parseFloat(weightLb);

  return (
    <div className="grid flex-1 grid-cols-1 lg:grid-cols-[560px_minmax(0,1fr)]">
      {/* Left: the shipment */}
      <div className="flex flex-col gap-[22px] border-b-2 border-ink px-6 py-7 sm:px-10 lg:border-b-0 lg:border-r-2">
        <h1 className="disp text-[40px]">Ship it cheaper.</h1>

        <section className="flex flex-col gap-2.5">
          <div className="lbl">Ship to</div>
          <Input aria-label="Recipient name" placeholder="Recipient name" value={toName} onChange={(e) => setToName(e.target.value)} onBlur={verify} disabled={!!label} />
          <Input
            aria-label="Address"
            placeholder="Paste the whole address — 418 Bergen St, Brooklyn, NY 11217"
            value={toLine}
            onChange={(e) => {
              setToLine(e.target.value);
              setVerified(null);
            }}
            onBlur={verify}
            onKeyDown={(e) => e.key === "Enter" && verify()}
            disabled={!!label}
          />
          <Input aria-label="Recipient email" placeholder="Email for tracking updates (optional)" type="email" value={toEmail} onChange={(e) => setToEmail(e.target.value)} onBlur={verify} disabled={!!label} />
          {verifying && <div className="lbl">Verifying…</div>}
          {!verifying && verified && (
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.8px] text-electric">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 8 3 3 7-7" /></svg>
              <span>
                Verified · {verified.residential === null ? formatAddressLine(verified.address) : verified.residential ? "Residential" : "Commercial"}
              </span>
            </div>
          )}
          {!verifying && verifyErrors.map((e) => <div key={e} className="text-xs text-danger">{e}</div>)}
        </section>

        <section className="flex flex-col gap-1.5">
          <div className="lbl">Ship from</div>
          {from && !editingFrom ? (
            <div className="flex items-center justify-between text-sm">
              <div>
                {from.name ?? from.company} · {formatAddressLine(from)}
              </div>
              <button type="button" className="lbl text-electric" onClick={() => setEditingFrom(true)}>
                Change
              </button>
            </div>
          ) : (
            <ShipFromForm
              initial={from}
              onSaved={(a) => {
                setFrom(a);
                setEditingFrom(false);
              }}
              onCancel={from ? () => setEditingFrom(false) : undefined}
            />
          )}
        </section>

        <section className="flex flex-col gap-3">
          <div className="lbl">Package</div>
          <div className="flex gap-2">
            <Chip selected={pkg === "box"} onClick={() => setPkg("box")} disabled={!!label}>Box</Chip>
            <Chip selected={pkg === "mailer"} onClick={() => setPkg("mailer")} disabled={!!label}>Poly mailer</Chip>
            <Chip selected={pkg === "flat_rate"} onClick={() => setPkg("flat_rate")} disabled={!!label}>Flat rate</Chip>
          </div>
          {pkg === "flat_rate" ? (
            <div className="grid grid-cols-[minmax(0,1fr)_120px] items-end gap-4">
              <div className="flex flex-wrap gap-2">
                {FLAT_RATE.map((f) => (
                  <Chip key={f.code} selected={flat === f.code} onClick={() => setFlat(f.code)} disabled={!!label}>{f.label}</Chip>
                ))}
              </div>
              <Input label="Weight" unit="lb" inputMode="decimal" value={weightLb} onChange={(e) => setWeightLb(e.target.value)} className="[&_label]:text-electric [&_input]:border-electric" disabled={!!label} />
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              <Input label="Length" unit="in" inputMode="decimal" value={dims.l} onChange={(e) => setDims({ ...dims, l: e.target.value })} disabled={!!label} />
              <Input label="Width" unit="in" inputMode="decimal" value={dims.w} onChange={(e) => setDims({ ...dims, w: e.target.value })} disabled={!!label} />
              <Input label="Height" unit="in" inputMode="decimal" value={pkg === "mailer" ? "1" : dims.h} onChange={(e) => setDims({ ...dims, h: e.target.value })} disabled={!!label || pkg === "mailer"} />
              <Input label="Weight" unit="lb" inputMode="decimal" value={weightLb} onChange={(e) => setWeightLb(e.target.value)} className="[&_label]:text-electric [&_input]:border-electric" disabled={!!label} />
            </div>
          )}
        </section>

        <section className="flex flex-col gap-2.5">
          <div className="lbl">Extras</div>
          <div className="flex gap-2">
            <Chip selected={insure} onClick={() => setInsure(!insure)} disabled={!!label}>Insure for $100</Chip>
            <Chip selected={signature} onClick={() => setSignature(!signature)} disabled={!!label}>Signature required</Chip>
          </div>
        </section>
      </div>

      {/* Right: rates or the bought label */}
      {label ? (
        <LabelReady label={label} onReset={reset} />
      ) : (
        <div className="flex min-h-0 flex-col">
          <div className="flex items-baseline justify-between px-8 pb-2.5 pt-[22px]">
            <div className="lbl">
              {quoting ? "Getting rates…" : rates.length ? `${rates.length} rates · ${Number.isFinite(weightNum) ? weightNum : "—"} lb · sorted by price` : "Rates"}
            </div>
            <div className="lbl text-ink">Retail → You pay</div>
          </div>

          <div role="listbox" aria-label="Rates" className={cn("flex flex-col border-t-2 border-ink", quoting && "opacity-50")}>
            {rates.map((r) => (
              <RateRow
                key={r.id}
                carrier={r.carrier}
                service={r.serviceName}
                eta={etaLabel(r)}
                days={r.estDays ?? 0}
                tag={r === cheapest ? "Cheapest" : r === fastest ? "Fastest" : undefined}
                retailCents={r.retailCents}
                priceCents={r.priceCents}
                selected={selected?.id === r.id}
                onSelect={() => setSelectedId(r.id)}
              />
            ))}
          </div>

          {!rates.length && !quoting && (
            <div className="px-8 py-10 text-sm text-muted">
              {quoteError ?? (!from ? "Save a ship-from address to see rates." : !verified ? "Enter a recipient address to see rates." : !parcel ? "Enter the package size and weight." : "")}
            </div>
          )}
          {quoteError && rates.length > 0 && <div className="px-8 py-3 text-xs text-danger">{quoteError}</div>}

          <div className="sticky bottom-0 mt-auto flex items-center justify-between border-t-2 border-ink bg-paper px-8 py-[22px]">
            <div className="flex flex-col gap-0.5">
              {selected ? (
                <>
                  <div className="lbl">
                    {selected.carrier} {selected.serviceName}
                    {selected.retailCents !== null && selected.retailCents > selected.priceCents ? ` · you save ${formatCents(selected.retailCents - selected.priceCents)} vs retail` : ""}
                  </div>
                  <div className="text-[13px] text-muted">Label ready in about 2 seconds{process.env.NODE_ENV !== "production" ? " · test mode, no card charged" : ""}</div>
                  {buyError && <div className="text-xs text-danger">{buyError}</div>}
                </>
              ) : (
                <div className="lbl">Pick a rate</div>
              )}
            </div>
            <Button size="lg" icon={<ArrowIcon />} disabled={!selected || quoting || buying} onClick={onBuy}>
              {buying ? "Buying…" : selected ? `Buy label — ${formatCents(selected.priceCents)}` : "Buy label"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function LabelReady({ label, onReset }: { label: Label; onReset: () => void }) {
  return (
    <div className="flex flex-col gap-6 bg-ink px-8 py-7 text-paper">
      <div className="flex flex-col gap-1.5">
        <div className="lbl text-lime">Label bought</div>
        <div className="disp text-[44px]">Ready to print.</div>
      </div>
      <div className="grid grid-cols-1 gap-7 md:grid-cols-[300px_minmax(0,1fr)]">
        <div className="box-border h-[400px] bg-paper p-2">
          <iframe title="Label preview" src={label.fileUrl} className="h-full w-full border-0 bg-surface" />
        </div>
        <div className="flex flex-col gap-[18px]">
          <div className="flex flex-col gap-2.5 text-sm">
            <Row k="Service" v={`${label.carrier} ${label.serviceName}`} />
            <Row k="Tracking" v={label.trackingNumber} />
            <Row k="Charged" v={<span className="disp text-lg text-lime">{formatCents(label.priceCents)}</span>} />
            {label.retailCents !== null && <Row k="Retail would be" v={<span className="line-through text-muted-on-ink">{formatCents(label.retailCents)}</span>} />}
          </div>
          <div className="flex gap-2.5">
            <Button variant="onInk" onClick={() => window.open(label.fileUrl, "_blank", "noopener")}>Print</Button>
            <a href={label.fileUrl} download className="inline-flex h-12 items-center border-[1.5px] border-paper px-[22px] text-xs font-semibold uppercase tracking-[1px] text-paper hover:text-paper">
              Download
            </a>
          </div>
          <p className="text-[13px] leading-[1.5] text-muted-on-ink">
            Changed your mind? Void this label within 28 days and the full amount is refunded once the carrier approves it.
          </p>
        </div>
      </div>
      <button type="button" onClick={onReset} className="mt-auto self-start border-b-2 border-paper pb-0.5 text-xs font-semibold uppercase tracking-[1px]">
        Ship another
      </button>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-2 pb-2">
      <div className="text-muted-on-ink">{k}</div>
      <div>{v}</div>
    </div>
  );
}
