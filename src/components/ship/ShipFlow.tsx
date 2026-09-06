"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowIcon, Button, Chip, Input, RateRow, Select } from "@/components/ui";
import type { Address, CustomsDefaults, Parcel, ParcelPreset, RateRules } from "@/lib/db/schema";
import { formatAddressLine } from "@/lib/ship/address-parse";
import { describeRule, pickRate, serviceKey } from "@/lib/ship/rules";
import {
  buy,
  getDeliveryEstimates,
  getRates,
  saveParcelPreset,
  verifyAddressFields,
  type BuyResult,
  type QuoteResult,
  type VerifyResult,
} from "@/lib/ship/actions";
import { COUNTRIES, PREDEFINED_PACKAGES } from "@/lib/shipping/options";
import type { CustomsInput, DeliveryEstimate, ShipmentOptions } from "@/lib/shipping/provider";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/cn";
import { AddressFields, EMPTY_ADDRESS, addressIsComplete, type AddressFieldValues, type AddressMode } from "./AddressFields";
import { ShipFromCard } from "./ShipFromCard";
import { ShipFromForm } from "./ShipFromForm";
import { OptionsPanel } from "./OptionsPanel";
import { CustomsForm, customsProblems, emptyCustoms } from "./CustomsForm";

// Spec: design/SunnyShip.dc.html — "Let's ship something." with a 1-2-3 stepper, two cards on the left
// (Who's it for? / What's in the box?), the rate cards on the right with the cheapest as a yellow hero.
// Everything EasyPost supports hangs off those two cards: package presets, carrier packaging, multiple
// boxes, declared value, shipment options, and the customs declaration for international.

type PkgType = "box" | "mailer" | "flat_rate" | "carrier_package";
type Rate = Extract<QuoteResult, { ok: true }>["quote"]["rates"][number];
type Label = Extract<BuyResult, { ok: true }>["label"];

const FLAT_RATE = [
  { code: "SmallFlatRateBox", label: "Small box" },
  { code: "MediumFlatRateBox", label: "Medium box" },
  { code: "LargeFlatRateBox", label: "Large box" },
  { code: "FlatRateEnvelope", label: "Envelope" },
  { code: "FlatRatePaddedEnvelope", label: "Padded envelope" },
];

const CARRIER_PACKAGES = Object.entries(PREDEFINED_PACKAGES).flatMap(([carrier, list]) =>
  list.filter((p) => !p.code.includes("FlatRate") && p.code !== "Parcel" && p.code !== "YourPackaging").map((p) => ({ value: p.code, label: `${carrier} ${p.label}` })),
);

const COUNTRY_OPTS = COUNTRIES.map(([v, l]) => ({ value: v, label: l }));

type Box = { l: string; w: string; h: string; lb: string };
const newBox = (): Box => ({ l: "12", w: "9", h: "4", lb: "1.8" });

function etaLabel(r: Rate): string {
  const d = r.estDeliveryDate ? new Date(r.estDeliveryDate + "T12:00:00") : r.estDays ? new Date(Date.now() + r.estDays * 86_400_000) : null;
  return d ? d.toLocaleDateString("en-US", { weekday: "long" }) : "—";
}

export interface ShipFlowProps {
  initialFrom: Address | null;
  /** Every saved ship-from, so the Ship page can switch between warehouses. */
  shipFromOptions: Address[];
  afterBuy: "print" | "download" | "nothing";
  /** Labels bought so far — drives the getting-started strip. */
  labelCount: number;
  presets: ParcelPreset[];
  rateRules: RateRules;
  customsDefaults: CustomsDefaults;
  accountName: string;
}

export function ShipFlow({ initialFrom, shipFromOptions, afterBuy, labelCount, presets: initialPresets, rateRules, customsDefaults, accountName }: ShipFlowProps) {
  // Ship to
  const [toName, setToName] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [toPhone, setToPhone] = useState("");
  const [country, setCountry] = useState("US");
  const [mode, setMode] = useState<AddressMode>("paste");
  const [toLine, setToLine] = useState("");
  const [f, setF] = useState<AddressFieldValues>(EMPTY_ADDRESS);
  const [verified, setVerified] = useState<Extract<VerifyResult, { ok: true }> | null>(null);
  const [verifyErrors, setVerifyErrors] = useState<string[]>([]);
  const [verifying, startVerify] = useTransition();

  // Ship from
  const [from, setFrom] = useState<Address | null>(initialFrom);
  const [fromOptions, setFromOptions] = useState<Address[]>(shipFromOptions);
  const [editingFrom, setEditingFrom] = useState(!initialFrom);

  // Package
  const [pkg, setPkg] = useState<PkgType>("box");
  const [flat, setFlat] = useState(FLAT_RATE[0].code);
  const [carrierPkg, setCarrierPkg] = useState(CARRIER_PACKAGES[0]?.value ?? "");
  const [boxes, setBoxes] = useState<Box[]>([newBox()]);
  const [presets, setPresets] = useState(initialPresets);
  const [insureValue, setInsureValue] = useState("");
  const [options, setOptions] = useState<ShipmentOptions>({});
  const [isReturn, setIsReturn] = useState(false);
  const [customs, setCustoms] = useState<CustomsInput | null>(null);

  // Rates
  const [quote, setQuote] = useState<Extract<QuoteResult, { ok: true }>["quote"] | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoting, startQuote] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [estimateCache, setEstimates] = useState<{ key: string; list: DeliveryEstimate[] }>({ key: "", list: [] });
  const idemKey = useRef<string>("");

  // Buy
  const [buying, startBuy] = useTransition();
  const [buyError, setBuyError] = useState<string | null>(null);
  const [label, setLabel] = useState<Label | null>(null);

  const intl = country !== "US";
  const multi = boxes.length > 1;
  const locked = !!label;
  const today = new Date().toISOString().slice(0, 10);

  const canVerify = addressIsComplete(f, country);

  const parcels = useMemo<Parcel[] | null>(() => {
    const out: Parcel[] = [];
    for (const b of boxes) {
      const weightOz = Math.round(parseFloat(b.lb) * 16);
      if (!Number.isFinite(weightOz) || weightOz <= 0) return null;
      if (pkg === "flat_rate") { out.push({ type: "flat_rate", lengthIn: 1, widthIn: 1, heightIn: 1, weightOz, predefinedPackage: flat }); continue; }
      if (pkg === "carrier_package") { out.push({ type: "carrier_package", lengthIn: 1, widthIn: 1, heightIn: 1, weightOz, predefinedPackage: carrierPkg }); continue; }
      const [l, w, h] = [parseFloat(b.l), parseFloat(b.w), parseFloat(b.h)];
      if (![l, w, h].every((x) => Number.isFinite(x) && x > 0)) return null;
      out.push({ type: pkg, lengthIn: l, widthIn: w, heightIn: pkg === "mailer" ? Math.min(h, 1) : h, weightOz });
    }
    return out;
  }, [boxes, pkg, flat, carrierPkg]);

  const totalOz = parcels?.reduce((a, p) => a + p.weightOz, 0) ?? null;
  const insuranceCents = Math.round((parseFloat(insureValue) || 0) * 100);

  const customsReady = !intl || (customs !== null && customsProblems(customs).length === 0);

  /** Country drives three things: the address form, the customs declaration, and which rates exist. */
  function changeCountry(next: string) {
    setCountry(next);
    setVerified(null);
    if (next === "US") {
      setCustoms(null);
    } else {
      setCustoms((c) => c ?? emptyCustoms(customsDefaults, from?.name ?? accountName));
    }
  }

  const verify = useCallback(() => {
    if (!canVerify) return;
    startVerify(async () => {
      const res = await verifyAddressFields({ ...f, street2: f.street2 || null, country, name: toName.trim() || null, email: toEmail.trim() || null, phone: toPhone.trim() || null });
      if (res.ok) {
        setVerified(res);
        setVerifyErrors([]);
      } else {
        setVerified(null);
        setVerifyErrors(res.errors);
      }
    });
  }, [toName, toEmail, toPhone, canVerify, f, country]);

  // Re-rate whenever the inputs that affect price settle.
  const quoteKey = JSON.stringify({ to: verified?.address, fromId: from?.id, parcels, insuranceCents, options, isReturn, customs });
  useEffect(() => {
    if (!verified || !from || !parcels || label || !customsReady) return;
    const t = setTimeout(() => {
      startQuote(async () => {
        setQuoteError(null);
        const res = await getRates({
          to: { ...verified.address, phone: toPhone.trim() || verified.address.phone || null },
          toResidential: verified.residential,
          fromId: from.id,
          parcel: parcels[0],
          parcels: parcels.length > 1 ? parcels : undefined,
          extras: { insuranceCents: insuranceCents > 0 ? insuranceCents : undefined },
          options,
          customs,
          isReturn,
        });
        if (res.ok) {
          setQuote(res.quote);
          idemKey.current = crypto.randomUUID();
          const preferred = pickRate(res.quote.rates, rateRules);
          setSelectedId((prev) => (res.quote.rates.some((r) => r.id === prev) ? prev : preferred?.id ?? res.quote.rates[0]?.id ?? null));
        } else {
          setQuote(null);
          setQuoteError(res.error);
        }
      });
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey, label, customsReady]);

  // SmartRate: how confident the carrier's transit time is, for this ZIP pair on this ship date.
  // Estimates are stamped with the inputs they were fetched for, so a stale set is simply ignored.
  const estimateKey = `${from?.zip ?? ""}|${verified?.address.zip ?? ""}|${options.labelDate || today}`;
  useEffect(() => {
    if (intl || !quote || !from?.zip || !verified?.address.zip) return;
    let live = true;
    getDeliveryEstimates({ fromZip: from.zip, toZip: verified.address.zip, plannedShipDate: options.labelDate || today })
      .then((e) => { if (live) setEstimates({ key: estimateKey, list: e }); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimateKey, quote?.shipmentId, intl]);
  const estimates = estimateCache.key === estimateKey ? estimateCache.list : [];

  const rates = quote?.rates ?? [];
  const selected = rates.find((r) => r.id === selectedId) ?? rates[0] ?? null;
  const cheapest = rates.reduce<Rate | null>((b, r) => (b === null || r.priceCents < b.priceCents ? r : b), null);
  const fastest = rates.reduce<Rate | null>((best, r) => (r.estDays !== null && (best === null || (best.estDays ?? 99) > r.estDays) ? r : best), null);
  const visible = showAll ? rates : rates.slice(0, 5);

  function noteFor(r: Rate): string | undefined {
    if (r.deliveryDateGuaranteed) return "Guaranteed by the carrier";
    const e = estimates.find((x) => serviceKey(x.carrier, x.serviceCode) === serviceKey(r.carrier, r.serviceCode));
    const d = e?.daysInTransit["90"];
    return d ? `90% of these arrive within ${d} day${d === 1 ? "" : "s"}` : undefined;
  }

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
    setToPhone("");
    setF(EMPTY_ADDRESS);
    setBuyError(null);
    setShowAll(false);
    setBoxes([newBox()]);
    setOptions({});
    setIsReturn(false);
    setInsureValue("");
    setCustoms(intl ? emptyCustoms(customsDefaults, from?.name ?? accountName) : null);
  }

  function applyPreset(p: ParcelPreset) {
    const q = p.parcel;
    setPkg((q.type as PkgType) ?? "box");
    if (q.predefinedPackage) { if (q.type === "flat_rate") setFlat(q.predefinedPackage); else setCarrierPkg(q.predefinedPackage); }
    setBoxes([{ l: String(q.lengthIn), w: String(q.widthIn), h: String(q.heightIn), lb: (q.weightOz / 16).toFixed(2).replace(/\.?0+$/, "") }]);
  }

  const ozHint = totalOz ? `${totalOz} oz total` : "";
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
          {/* Ship from — the return address on the label, shown in full rather than as a footnote. */}
          {from && !editingFrom ? (
            <ShipFromCard
              from={from}
              options={fromOptions}
              disabled={locked}
              onSelect={(a) => setFrom(a)}
              onEdit={() => setEditingFrom(true)}
            />
          ) : (
            <section className="card flex flex-col gap-3.5 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="lbl">{from ? "Edit ship-from address" : "Where are you shipping from?"}</div>
                {from && <button type="button" className="text-[13px] font-extrabold text-muted" onClick={() => setEditingFrom(false)}>Cancel</button>}
              </div>
              <ShipFromForm
                initial={from}
                onSaved={(a) => {
                  setFrom(a);
                  setFromOptions((prev) => [a, ...prev.filter((x) => x.id !== a.id)]);
                  setEditingFrom(false);
                }}
                onCancel={from ? () => setEditingFrom(false) : undefined}
              />
            </section>
          )}

          <section className="card flex flex-col gap-3.5 p-5 sm:p-6">
            <div className="lbl">Who&apos;s it for?</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_190px]">
              <Input aria-label="Recipient name" placeholder="Recipient name" value={toName} onChange={(e) => setToName(e.target.value)} disabled={locked} />
              <Select aria-label="Destination country" value={country} onChange={(e) => changeCountry(e.target.value)} options={COUNTRY_OPTS} disabled={locked} />
            </div>

            <AddressFields
              value={f}
              onChange={(next) => { setF(next); setVerified(null); }}
              mode={mode}
              onModeChange={setMode}
              pasted={toLine}
              onPastedChange={setToLine}
              country={country}
              disabled={locked}
              onCommit={verify}
              idPrefix="to"
              action={
                <Button variant="outline" size="lg" className="h-[50px] shrink-0 self-start" onClick={verify} disabled={!canVerify || verifying || locked}>
                  {verifying ? "Checking…" : "Verify address"}
                </Button>
              }
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input aria-label="Recipient email" placeholder="Email for tracking (optional)" type="email" value={toEmail} onChange={(e) => setToEmail(e.target.value)} disabled={locked} />
              <Input aria-label="Recipient phone" placeholder={intl ? "Phone (required abroad)" : "Phone (optional)"} value={toPhone} onChange={(e) => setToPhone(e.target.value)} disabled={locked} />
            </div>
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
          </section>

          <section className="card flex flex-col gap-3.5 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="lbl">What&apos;s in the box?</div>
              {!multi && !locked && parcels && <SavePreset parcel={parcels[0]} onSaved={(p) => setPresets([...presets, p])} />}
            </div>
            {presets.length > 0 && !locked && (
              <div className="flex flex-wrap gap-2">
                {presets.map((p) => <Chip key={p.id} onClick={() => applyPreset(p)}>{p.name}</Chip>)}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Chip size="md" selected={pkg === "box"} onClick={() => setPkg("box")} disabled={locked}>Box</Chip>
              <Chip size="md" selected={pkg === "mailer"} onClick={() => setPkg("mailer")} disabled={locked}>Poly mailer</Chip>
              <Chip size="md" selected={pkg === "flat_rate"} onClick={() => { setPkg("flat_rate"); setBoxes([boxes[0]]); }} disabled={locked}>Flat rate</Chip>
              <Chip size="md" selected={pkg === "carrier_package"} onClick={() => { setPkg("carrier_package"); setBoxes([boxes[0]]); }} disabled={locked}>Carrier packaging</Chip>
            </div>

            {pkg === "flat_rate" && (
              <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[minmax(0,1fr)_130px]">
                <div className="flex flex-wrap gap-2">
                  {FLAT_RATE.map((x) => <Chip key={x.code} selected={flat === x.code} onClick={() => setFlat(x.code)} disabled={locked}>{x.label}</Chip>)}
                </div>
                <Input label="Weight" unit="lb" inputMode="decimal" value={boxes[0].lb} onChange={(e) => setBoxes([{ ...boxes[0], lb: e.target.value }])} className="[&_label]:text-coral [&_input]:border-coral [&_input]:bg-coral-soft" disabled={locked} />
              </div>
            )}
            {pkg === "carrier_package" && (
              <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[minmax(0,1fr)_130px]">
                <Select label="Carrier packaging" value={carrierPkg} onChange={(e) => setCarrierPkg(e.target.value)} options={CARRIER_PACKAGES} disabled={locked} />
                <Input label="Weight" unit="lb" inputMode="decimal" value={boxes[0].lb} onChange={(e) => setBoxes([{ ...boxes[0], lb: e.target.value }])} className="[&_label]:text-coral [&_input]:border-coral [&_input]:bg-coral-soft" disabled={locked} />
              </div>
            )}
            {(pkg === "box" || pkg === "mailer") && (
              <div className="flex flex-col gap-3">
                {boxes.map((b, i) => (
                  <div key={i} className="flex flex-col gap-1.5">
                    {multi && (
                      <div className="flex items-center justify-between">
                        <div className="text-[13px] font-extrabold text-ink-2">Box {i + 1}</div>
                        <button type="button" className="text-[13px] font-extrabold text-muted hover:text-danger" disabled={locked} onClick={() => setBoxes(boxes.filter((_, n) => n !== i))}>Remove</button>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Input label="Length" unit="in" inputMode="decimal" value={b.l} onChange={(e) => setBoxes(boxes.map((x, n) => (n === i ? { ...x, l: e.target.value } : x)))} disabled={locked} />
                      <Input label="Width" unit="in" inputMode="decimal" value={b.w} onChange={(e) => setBoxes(boxes.map((x, n) => (n === i ? { ...x, w: e.target.value } : x)))} disabled={locked} />
                      <Input label="Height" unit="in" inputMode="decimal" value={pkg === "mailer" ? "1" : b.h} onChange={(e) => setBoxes(boxes.map((x, n) => (n === i ? { ...x, h: e.target.value } : x)))} disabled={locked || pkg === "mailer"} />
                      <Input label="Weight" unit="lb" inputMode="decimal" value={b.lb} onChange={(e) => setBoxes(boxes.map((x, n) => (n === i ? { ...x, lb: e.target.value } : x)))} className="[&_label]:text-coral [&_input]:border-coral [&_input]:bg-coral-soft" disabled={locked} />
                    </div>
                  </div>
                ))}
                <button type="button" className="self-start text-[13px] font-extrabold text-coral" disabled={locked} onClick={() => setBoxes([...boxes, newBox()])}>+ Another box</button>
              </div>
            )}
            <div className="text-[13px] font-bold text-muted">
              {ozHint ? `${ozHint} · ` : ""}
              {multi ? "One rate covers every box; you get one label per box." : "Not sure? Round up — carriers re-weigh and bill the difference."}
            </div>

            <div className="flex flex-wrap items-end gap-3 border-t-2 border-hairline pt-3">
              <Input label="Insure the contents for" unit="$" inputMode="decimal" placeholder="0" value={insureValue} onChange={(e) => setInsureValue(e.target.value)} disabled={locked} className="w-[190px]" />
              <div className="pb-3 text-[13px] font-bold text-muted">{insuranceCents > 0 ? `Adds about ${formatCents(Math.max(125, Math.round(insuranceCents * 0.01)))} · claims up to $5,000` : "Leave blank for no coverage."}</div>
            </div>

            <OptionsPanel value={options} onChange={setOptions} isReturn={isReturn} onReturnChange={setIsReturn} disabled={locked} today={today} />
          </section>

          {intl && customs && <CustomsForm value={customs} onChange={setCustoms} defaults={customsDefaults} disabled={locked} parcelWeightOz={totalOz} />}
        </div>

        {/* Right: rates or the bought label */}
        {label ? (
          <LabelReady label={label} onReset={reset} isReturn={isReturn} />
        ) : (
          <div className="flex min-h-0 flex-col gap-3.5">
            <div className="flex items-baseline justify-between px-1">
              <div className="disp text-[24px]">Pick a rate</div>
              <div className="text-[14px] font-extrabold text-muted">{quoting ? "Getting rates…" : rates.length ? `${rates.length} options · ${describeRule(rateRules)}` : ""}</div>
            </div>

            <div role="listbox" aria-label="Rates" className={cn("flex flex-col gap-3 pt-2", quoting && rates.length > 0 && "opacity-50")}>
              {visible.map((r) => (
                <RateRow key={r.id} carrier={r.carrier} service={r.serviceName} eta={etaLabel(r)} days={r.estDays ?? 0} tag={r === cheapest ? "Cheapest" : r === fastest ? "Fastest" : undefined} note={noteFor(r)} retailCents={r.retailCents} priceCents={r.priceCents} selected={selected?.id === r.id} onSelect={() => setSelectedId(r.id)} />
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
                    <div className="text-[15px] font-bold text-ink-2">Rates show up here by themselves. {intl ? "Four" : "Three"} things first:</div>
                    <ol className="flex flex-col gap-2.5">
                      <Todo done={!!from} label="A ship-from address" hint="Saved once, reused forever." />
                      <Todo done={!!verified} label="A verified recipient address" hint={intl ? "Pick the country, then fill in the fields." : "Paste it or type it in fields, then Verify."} />
                      <Todo done={!!parcels} label="Package size and weight" hint="Box, poly mailer, flat rate or carrier packaging." />
                      {intl && <Todo done={customsReady} label="A customs declaration" hint="Every item, its value, weight and origin." />}
                    </ol>
                  </>
                )}
              </div>
            )}
            {quoteError && rates.length > 0 && <div className="px-1 text-[13px] font-bold text-danger">{quoteError}</div>}
            {quote?.messages?.length ? <div className="px-1 text-[13px] font-bold text-muted">{quote.messages[0]}</div> : null}

            {/* Solid, with a rule above it: content scrolls underneath, so a translucent bar reads as a glitch. */}
            <div className="sticky bottom-0 mt-auto flex flex-col gap-3 border-t-2 border-hairline bg-paper px-1 pb-2 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-[14px] font-bold text-muted">
                {selected ? `Charged to your card · ${multi ? `${boxes.length} labels` : "label"} ready in seconds · void within 28 days` : "Pick a rate to continue"}
                {buyError && <div className="text-danger">{buyError}</div>}
              </div>
              <Button size="lg" icon={<ArrowIcon />} disabled={!selected || quoting || buying} onClick={onBuy}>
                {buying ? "Buying…" : selected ? `Buy ${multi ? "labels" : "label"} · ${formatCents(selected.priceCents)}` : "Buy label"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SavePreset({ parcel, onSaved }: { parcel: Parcel; onSaved: (p: ParcelPreset) => void }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="text-[13px] font-extrabold text-coral"
      disabled={pending}
      onClick={() => {
        const name = window.prompt("Name this package size", parcel.predefinedPackage ? "Flat rate" : `${parcel.lengthIn}×${parcel.widthIn}×${parcel.heightIn}`);
        if (!name) return;
        start(async () => onSaved(await saveParcelPreset({ name, parcel })));
      }}
    >
      {pending ? "Saving…" : "Save this size"}
    </button>
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

function LabelReady({ label, onReset, isReturn }: { label: Label; onReset: () => void; isReturn: boolean }) {
  return (
    <div className="card relative flex flex-col gap-6 bg-yellow p-6 sm:p-7">
      <div className="absolute -top-4 left-6 -rotate-3 rounded-pill border-2 border-ink bg-coral px-4 py-1.5 text-[13px] font-extrabold text-white">{isReturn ? "Return label bought!" : "Label bought!"}</div>
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
          {label.forms.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-[13px] font-bold">
              <span className="text-ink-2">Customs forms:</span>
              {label.forms.map((f) => <a key={f.type} href={f.url} target="_blank" rel="noopener" className="rounded-pill border-2 border-ink bg-surface px-3 py-1 font-extrabold">{f.type.replace(/_/g, " ")}</a>)}
            </div>
          )}
          <div className="flex flex-wrap gap-2.5">
            <Button variant="secondary" onClick={() => window.open(label.fileUrl, "_blank", "noopener")}>Print</Button>
            <a href={label.fileUrl} download className="inline-flex h-12 items-center rounded-pill border-2 border-ink bg-surface px-[22px] font-display text-[14px] font-extrabold hover:text-ink">Download</a>
            <Link href={`/shipments/${label.id}`} className="inline-flex h-12 items-center px-3 text-[14px] font-extrabold text-ink-2 hover:text-ink">Shipment details</Link>
          </div>
          <p className="text-[13px] font-bold leading-[1.5] text-ink-2">
            {isReturn ? "Email this label to your customer or drop it in the box. You're only charged if they use it." : "Changed your mind? Void it from Shipments within 28 days — the full amount comes back once the carrier approves."}
          </p>
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
