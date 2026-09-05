"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowIcon, Button, Chip, Input, RateRow } from "@/components/ui";
import type { Address } from "@/lib/db/schema";
import { formatAddressLine } from "@/lib/ship/address";
import { buy, getRates, verifyShipTo, type BuyResult, type QuoteResult, type VerifyResult } from "@/lib/ship/actions";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/cn";
import { ShipFromForm } from "./ShipFromForm";

// Spec: design/SunnyShip.dc.html — "Let's ship something." with a 1-2-3 stepper, two cards on the left
// (Who's it for? / What's in the box?), the rate cards on the right with the cheapest as a yellow hero.

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
  return d ? d.toLocaleDateString("en-US", { weekday: "long" }) : "—";
}

export interface ShipFlowProps {
  initialFrom: Address | null;
  afterBuy: "print" | "download" | "nothing";
  /** Labels bought so far — drives the getting-started strip. */
  labelCount: number;
}

export function ShipFlow({ initialFrom, afterBuy, labelCount }: ShipFlowProps) {
  // Ship to
  const [toName, setToName] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [mode, setMode] = useState<"paste" | "fields">("paste");
  const [toLine, setToLine] = useState("");
  const [f, setF] = useState({ street1: "", street2: "", city: "", state: "", zip: "" });
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
  const [showAll, setShowAll] = useState(false);
  const idemKey = useRef<string>("");

  // Buy
  const [buying, startBuy] = useTransition();
  const [buyError, setBuyError] = useState<string | null>(null);
  const [label, setLabel] = useState<Label | null>(null);

  const composedLine = mode === "paste" ? toLine : [f.street1, f.street2, f.city, `${f.state} ${f.zip}`].filter((s) => s.trim()).join(", ");
  const canVerify = mode === "paste" ? toLine.trim().length > 8 : !!(f.street1 && f.city && f.state && f.zip);

  const parcel = useMemo(() => {
    const weightOz = Math.round(parseFloat(weightLb) * 16);
    const n = (s: string) => parseFloat(s);
    if (pkg === "flat_rate") return Number.isFinite(weightOz) && weightOz > 0 ? { type: pkg, lengthIn: 1, widthIn: 1, heightIn: 1, weightOz, predefinedPackage: flat } : null;
    const [l, w, h] = [n(dims.l), n(dims.w), n(dims.h)];
    if (![l, w, h].every((x) => Number.isFinite(x) && x > 0) || !Number.isFinite(weightOz) || weightOz <= 0) return null;
    return { type: pkg, lengthIn: l, widthIn: w, heightIn: pkg === "mailer" ? Math.min(h, 1) : h, weightOz };
  }, [pkg, flat, dims, weightLb]);

  const verify = useCallback(() => {
    if (!canVerify) return;
    startVerify(async () => {
      const res = await verifyShipTo(toName, composedLine, toEmail);
      if (res.ok) {
        setVerified(res);
        setVerifyErrors([]);
      } else {
        setVerified(null);
        setVerifyErrors(res.errors);
      }
    });
  }, [toName, composedLine, toEmail, canVerify]);

  // Re-rate whenever the inputs that affect price settle.
  const quoteKey = JSON.stringify({ to: verified?.address, fromId: from?.id, parcel, insure, signature });
  useEffect(() => {
    if (!verified || !from || !parcel || label) return;
    const t = setTimeout(() => {
      startQuote(async () => {
        setQuoteError(null);
        const res = await getRates({ to: verified.address, toResidential: verified.residential, fromId: from.id, parcel, extras: { insuranceCents: insure ? 10_000 : undefined, signature } });
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
  const visible = showAll ? rates : rates.slice(0, 5);

  function onBuy() {
    if (!quote || !selected) return;
    setBuyError(null);
    startBuy(async () => {
      const res = await buy({ shipmentId: quote.shipmentId, rateQuoteId: selected.id, idempotencyKey: idemKey.current });
      if (res.ok) {
        setLabel(res.label);
        if (afterBuy === "print") window.open(res.label.fileUrl, "_blank", "noopener");
        if (afterBuy === "download") {
          const a = document.createElement("a");
          a.href = res.label.fileUrl;
          a.download = `snap-${res.label.trackingNumber}.pdf`;
          a.click();
        }
      } else if (res.code === "rate_expired") {
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
    setVerifyErrors([]);
    setToName("");
    setToLine("");
    setToEmail("");
    setF({ street1: "", street2: "", city: "", state: "", zip: "" });
    setBuyError(null);
    setShowAll(false);
  }

  const weightNum = parseFloat(weightLb);
  const ozHint = Number.isFinite(weightNum) && weightNum > 0 ? `${Math.round(weightNum * 16)} oz` : "";
  const firstRun = labelCount === 0 && !label;
  const step = label ? 4 : rates.length ? 3 : verified ? 2 : 1;

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-8 pt-2 sm:px-10">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="disp text-[36px] sm:text-[40px]">Let&apos;s ship something.</h1>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <StepPill n={1} label="Where to" state={step > 1 ? "done" : "now"} />
            <StepPill n={2} label="Package" state={step > 2 ? "done" : step === 2 ? "now" : "todo"} />
            <StepPill n={3} label="Pick a rate" state={step > 3 ? "done" : step === 3 ? "now" : "todo"} />
          </div>
        </div>
        {firstRun && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-pill border-2 border-ink bg-surface px-4 py-2 text-[13px] font-extrabold">
            <span className="text-muted">Getting started:</span>
            <span className={cn(from && "text-muted line-through")}>Ship-from address</span>
            <span>First label</span>
            <span className="text-muted">Card (with billing)</span>
          </div>
        )}
      </div>

      <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[540px_minmax(0,1fr)]">
        {/* Left: who and what */}
        <div className="flex flex-col gap-5">
          <section className="card flex flex-col gap-3.5 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="lbl">Who&apos;s it for?</div>
              <button type="button" className="text-[13px] font-extrabold text-coral" onClick={() => { setMode(mode === "paste" ? "fields" : "paste"); setVerified(null); setVerifyErrors([]); }}>
                {mode === "paste" ? "Type it in fields" : "Paste one line"}
              </button>
            </div>
            <Input aria-label="Recipient name" placeholder="Recipient name" value={toName} onChange={(e) => setToName(e.target.value)} disabled={!!label} />
            {mode === "paste" ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <Input aria-label="Address" placeholder="Paste the whole address — 418 Bergen St, Brooklyn, NY 11217" value={toLine} onChange={(e) => { setToLine(e.target.value); setVerified(null); }} onBlur={verify} onKeyDown={(e) => e.key === "Enter" && verify()} disabled={!!label} className="flex-1" />
                <Button variant="outline" size="lg" className="h-[50px] shrink-0" onClick={verify} disabled={!canVerify || verifying || !!label}>{verifying ? "Checking…" : "Verify"}</Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Input aria-label="Street" placeholder="Street address" value={f.street1} onChange={(e) => { setF({ ...f, street1: e.target.value }); setVerified(null); }} disabled={!!label} />
                <Input aria-label="Apartment or unit" placeholder="Apt, suite, unit (optional)" value={f.street2} onChange={(e) => setF({ ...f, street2: e.target.value })} disabled={!!label} />
                <div className="grid grid-cols-[minmax(0,1fr)_72px_104px] gap-3">
                  <Input aria-label="City" placeholder="City" value={f.city} onChange={(e) => { setF({ ...f, city: e.target.value }); setVerified(null); }} disabled={!!label} />
                  <Input aria-label="State" placeholder="NY" maxLength={2} value={f.state} onChange={(e) => { setF({ ...f, state: e.target.value.toUpperCase() }); setVerified(null); }} disabled={!!label} />
                  <Input aria-label="ZIP" placeholder="ZIP" inputMode="numeric" value={f.zip} onChange={(e) => { setF({ ...f, zip: e.target.value }); setVerified(null); }} onBlur={verify} disabled={!!label} />
                </div>
                <Button variant="outline" size="md" className="self-start" onClick={verify} disabled={!canVerify || verifying || !!label}>{verifying ? "Checking…" : "Verify address"}</Button>
              </div>
            )}
            <Input aria-label="Recipient email" placeholder="Email for tracking updates (optional)" type="email" value={toEmail} onChange={(e) => setToEmail(e.target.value)} disabled={!!label} />
            {!verifying && verified && (
              <div className="flex flex-wrap items-center gap-2 text-[13px] font-bold text-ink-2">
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-teal px-3 py-1 text-[12px] font-extrabold text-white">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 8 3 3 7-7" /></svg>
                  Verified
                </span>
                <span>{verified.residential === null ? "Deliverable" : verified.residential ? "Residential" : "Commercial"} · {formatAddressLine(verified.address)}</span>
              </div>
            )}
            {!verifying && verifyErrors.map((e) => <div key={e} className="text-[13px] font-bold text-danger">{e}</div>)}

            <div className="border-t-2 border-hairline pt-3 text-[13px] font-bold text-muted">
              {from && !editingFrom ? (
                <div className="flex flex-col gap-1">
                  <div>Shipping from <b className="text-ink">{from.name ?? from.company}, {from.city} {from.zip}</b> · <button type="button" className="font-extrabold text-coral" onClick={() => setEditingFrom(true)}>change</button></div>
                  {!from.phone && <div className="text-danger">Add a phone number to this address — FedEx and UPS won&apos;t print labels without one.</div>}
                </div>
              ) : (
                <div className="flex flex-col gap-2 text-ink">
                  <div className="lbl">Where are you shipping from?</div>
                  <ShipFromForm initial={from} onSaved={(a) => { setFrom(a); setEditingFrom(false); }} onCancel={from ? () => setEditingFrom(false) : undefined} />
                </div>
              )}
            </div>
          </section>

          <section className="card flex flex-col gap-3.5 p-5 sm:p-6">
            <div className="lbl">What&apos;s in the box?</div>
            <div className="flex flex-wrap gap-2">
              <Chip size="md" selected={pkg === "box"} onClick={() => setPkg("box")} disabled={!!label}>Box</Chip>
              <Chip size="md" selected={pkg === "mailer"} onClick={() => setPkg("mailer")} disabled={!!label}>Poly mailer</Chip>
              <Chip size="md" selected={pkg === "flat_rate"} onClick={() => setPkg("flat_rate")} disabled={!!label}>Flat rate</Chip>
            </div>
            {pkg === "flat_rate" ? (
              <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[minmax(0,1fr)_130px]">
                <div className="flex flex-wrap gap-2">
                  {FLAT_RATE.map((x) => (
                    <Chip key={x.code} selected={flat === x.code} onClick={() => setFlat(x.code)} disabled={!!label}>{x.label}</Chip>
                  ))}
                </div>
                <Input label="Weight" unit="lb" inputMode="decimal" value={weightLb} onChange={(e) => setWeightLb(e.target.value)} className="[&_label]:text-coral [&_input]:border-coral [&_input]:bg-coral-soft" disabled={!!label} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Input label="Length" unit="in" inputMode="decimal" value={dims.l} onChange={(e) => setDims({ ...dims, l: e.target.value })} disabled={!!label} />
                <Input label="Width" unit="in" inputMode="decimal" value={dims.w} onChange={(e) => setDims({ ...dims, w: e.target.value })} disabled={!!label} />
                <Input label="Height" unit="in" inputMode="decimal" value={pkg === "mailer" ? "1" : dims.h} onChange={(e) => setDims({ ...dims, h: e.target.value })} disabled={!!label || pkg === "mailer"} />
                <Input label="Weight" unit="lb" inputMode="decimal" value={weightLb} onChange={(e) => setWeightLb(e.target.value)} className="[&_label]:text-coral [&_input]:border-coral [&_input]:bg-coral-soft" disabled={!!label} />
              </div>
            )}
            <div className="text-[13px] font-bold text-muted">{ozHint ? `${ozHint} · ` : ""}Not sure? Round up — carriers re-weigh and bill the difference.</div>
            <div className="flex flex-wrap gap-2 border-t-2 border-hairline pt-3">
              <Chip selected={insure} onClick={() => setInsure(!insure)} disabled={!!label}>+ Insure for $100</Chip>
              <Chip selected={signature} onClick={() => setSignature(!signature)} disabled={!!label}>+ Signature required</Chip>
            </div>
          </section>
        </div>

        {/* Right: rates or the bought label */}
        {label ? (
          <LabelReady label={label} onReset={reset} />
        ) : (
          <div className="flex min-h-0 flex-col gap-3.5">
            <div className="flex items-baseline justify-between px-1">
              <div className="disp text-[24px]">Pick a rate</div>
              <div className="text-[14px] font-extrabold text-muted">{quoting ? "Getting rates…" : rates.length ? `${rates.length} options · cheapest first` : ""}</div>
            </div>

            <div role="listbox" aria-label="Rates" className={cn("flex flex-col gap-3 pt-2", quoting && rates.length > 0 && "opacity-50")}>
              {visible.map((r) => (
                <RateRow key={r.id} carrier={r.carrier} service={r.serviceName} eta={etaLabel(r)} days={r.estDays ?? 0} tag={r === cheapest ? "Cheapest" : r === fastest ? "Fastest" : undefined} retailCents={r.retailCents} priceCents={r.priceCents} selected={selected?.id === r.id} onSelect={() => setSelectedId(r.id)} />
              ))}
              {rates.length > 5 && (
                <button type="button" className="self-center py-1 text-[14px] font-extrabold text-coral" onClick={() => setShowAll(!showAll)}>{showAll ? "Show fewer" : `Show ${rates.length - 5} more`}</button>
              )}
              {quoting && !rates.length && [0, 1, 2, 3].map((i) => (
                <div key={i} className="grid animate-pulse grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3.5 rounded-row border-2 border-hairline bg-surface px-[18px] py-4">
                  <div className="h-11 w-11 rounded-[12px] bg-hairline" /><div className="flex flex-col gap-2"><div className="h-4 w-40 rounded bg-hairline" /><div className="h-3 w-28 rounded bg-hairline" /></div><div className="h-6 w-16 rounded bg-hairline" />
                </div>
              ))}
            </div>

            {!rates.length && !quoting && (
              <div className="card-quiet flex flex-col gap-4 p-6">
                {quoteError ? (
                  <div className="text-[14px] font-bold text-danger">{quoteError}</div>
                ) : (
                  <>
                    <div className="text-[15px] font-bold text-ink-2">Rates show up here by themselves. Three things first:</div>
                    <ol className="flex flex-col gap-2.5">
                      <Todo done={!!from} label="A ship-from address" hint="Saved once, reused forever." />
                      <Todo done={!!verified} label="A verified recipient address" hint="Paste it or type it in fields, then Verify." />
                      <Todo done={!!parcel} label="Package size and weight" hint="Box, poly mailer or a flat-rate box." />
                    </ol>
                  </>
                )}
              </div>
            )}
            {quoteError && rates.length > 0 && <div className="px-1 text-[13px] font-bold text-danger">{quoteError}</div>}

            <div className="sticky bottom-0 mt-auto flex flex-col gap-3 bg-paper/95 pt-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <div className="text-[14px] font-bold text-muted">
                {selected ? "Charged to your card · label ready in seconds · void within 28 days" : "Pick a rate to continue"}
                {buyError && <div className="text-danger">{buyError}</div>}
              </div>
              <Button size="lg" icon={<ArrowIcon />} disabled={!selected || quoting || buying} onClick={onBuy}>
                {buying ? "Buying…" : selected ? `Buy label · ${formatCents(selected.priceCents)}` : "Buy label"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepPill({ n, label, state }: { n: number; label: string; state: "done" | "now" | "todo" }) {
  return (
    <div className={cn("flex items-center gap-2 text-[14px] font-extrabold", state === "todo" && "text-muted")}>
      <span className={cn("flex h-[26px] w-[26px] items-center justify-center rounded-pill border-2 text-[13px]", state === "now" ? "border-ink bg-ink text-yellow" : state === "done" ? "border-teal bg-teal text-white" : "border-hairline text-hairline")}>
        {state === "done" ? "✓" : n}
      </span>
      {label}
    </div>
  );
}

function Todo({ done, label, hint }: { done: boolean; label: string; hint: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className={cn("mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] border-2", done ? "border-teal bg-teal text-white" : "border-ink")}>
        {done && <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 8 3 3 7-7" /></svg>}
      </span>
      <span className="flex flex-col"><span className={cn("text-[15px] font-extrabold", done && "text-muted line-through")}>{label}</span><span className="text-[13px] font-bold text-muted">{hint}</span></span>
    </li>
  );
}

function LabelReady({ label, onReset }: { label: Label; onReset: () => void }) {
  return (
    <div className="card relative flex flex-col gap-6 bg-yellow p-6 sm:p-7">
      <div className="absolute -top-4 left-6 -rotate-3 rounded-pill border-2 border-ink bg-coral px-4 py-1.5 text-[13px] font-extrabold text-white">Label bought!</div>
      <div className="disp pt-2 text-[40px] sm:text-[44px]">Ready to print.</div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[300px_minmax(0,1fr)]">
        <div className="box-border h-[400px] rounded-[16px] border-2 border-ink bg-surface p-2">
          <iframe title="Label preview" src={label.fileUrl} className="h-full w-full rounded-[10px] border-0 bg-surface" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 text-[15px] font-bold">
            <Row k="Service" v={`${label.carrier} ${label.serviceName}`} />
            <Row k="Tracking" v={label.trackingNumber} />
            <Row k="Charged" v={<span className="disp text-[22px]">{formatCents(label.priceCents)}</span>} />
            {label.retailCents !== null && <Row k="At the counter" v={<span className="line-through">{formatCents(label.retailCents)}</span>} />}
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button variant="secondary" onClick={() => window.open(label.fileUrl, "_blank", "noopener")}>Print</Button>
            <a href={label.fileUrl} download className="inline-flex h-12 items-center rounded-pill border-2 border-ink bg-surface px-[22px] font-display text-[14px] font-extrabold hover:text-ink">Download</a>
            <Link href="/shipments" className="inline-flex h-12 items-center px-3 text-[14px] font-extrabold text-ink-2 hover:text-ink">All shipments</Link>
          </div>
          <p className="text-[13px] font-bold leading-[1.5] text-ink-2">Changed your mind? Void it from Shipments within 28 days — the full amount comes back once the carrier approves.</p>
        </div>
      </div>
      <Button size="lg" icon={<ArrowIcon />} className="self-start" onClick={onReset}>Ship another</Button>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b-2 border-ink/15 pb-2">
      <div className="text-ink-2">{k}</div>
      <div className="text-right">{v}</div>
    </div>
  );
}
