"use client";

import { Button, Checkbox, Input, Select } from "@/components/ui";
import type { CustomsDefaults } from "@/lib/db/schema";
import { CONTENTS_TYPES, COUNTRIES, EEL_PFC_DEFAULT, INCOTERMS, NON_DELIVERY, RESTRICTION_TYPES } from "@/lib/shipping/options";
import type { CustomsInput, CustomsItemInput } from "@/lib/shipping/provider";
import { formatCents } from "@/lib/money";

// International shipments: the customs declaration EasyPost turns into a CN22/CN23 or commercial invoice.

export function emptyCustoms(d: CustomsDefaults | null | undefined, signer: string): CustomsInput {
  return {
    contentsType: d?.contentsType ?? "merchandise",
    contentsExplanation: null,
    customsCertify: false,
    customsSigner: d?.signer ?? signer,
    eelPfc: d?.eelPfc ?? EEL_PFC_DEFAULT,
    nonDeliveryOption: "return",
    restrictionType: "none",
    restrictionComments: null,
    declaration: null,
    incoterm: null,
    items: [emptyItem(d)],
  };
}

export function emptyItem(d: CustomsDefaults | null | undefined): CustomsItemInput {
  return { description: "", quantity: 1, valueCents: 0, weightOz: 0, hsTariffNumber: null, originCountry: d?.originCountry ?? "US", code: null };
}

export function customsProblems(c: CustomsInput): string[] {
  const out: string[] = [];
  if (!c.customsSigner.trim()) out.push("Add the signer's name.");
  if (!c.items.length) out.push("Add at least one item.");
  c.items.forEach((i, n) => {
    if (!i.description.trim()) out.push(`Item ${n + 1} needs a description.`);
    if (!(i.valueCents > 0)) out.push(`Item ${n + 1} needs a value.`);
    if (!(i.weightOz > 0)) out.push(`Item ${n + 1} needs a weight.`);
  });
  if (c.contentsType === "other" && !c.contentsExplanation?.trim()) out.push("Explain the contents.");
  if (c.restrictionType !== "none" && !c.restrictionComments?.trim()) out.push("Explain the restriction.");
  if (!c.customsCertify) out.push("Certify the declaration.");
  return out;
}

const COUNTRY_OPTS = COUNTRIES.map(([v, l]) => ({ value: v, label: l }));

export function CustomsForm({ value, onChange, defaults, disabled, parcelWeightOz }: { value: CustomsInput; onChange: (c: CustomsInput) => void; defaults: CustomsDefaults | null | undefined; disabled?: boolean; parcelWeightOz: number | null }) {
  const set = <K extends keyof CustomsInput>(k: K, v: CustomsInput[K]) => onChange({ ...value, [k]: v });
  const setItem = (i: number, patch: Partial<CustomsItemInput>) => onChange({ ...value, items: value.items.map((it, n) => (n === i ? { ...it, ...patch } : it)) });
  const totalValue = value.items.reduce((a, i) => a + i.valueCents * i.quantity, 0);
  const totalWeight = value.items.reduce((a, i) => a + i.weightOz * i.quantity, 0);
  const problems = customsProblems(value);

  return (
    <section className="card flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex items-baseline justify-between">
        <div className="lbl">Customs declaration</div>
        <div className="text-[13px] font-bold text-muted">Printed as a CN22 / commercial invoice</div>
      </div>
      <div className="flex flex-col gap-3">
        {value.items.map((it, i) => (
          <div key={i} className="grid grid-cols-2 gap-3 rounded-[14px] border-2 border-hairline bg-surface p-3 sm:grid-cols-[minmax(0,2fr)_70px_100px_90px_120px_minmax(0,1fr)_32px]">
            <Input aria-label="Item description" placeholder="What is it? e.g. Cotton T-shirt" value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} disabled={disabled} className="col-span-2 sm:col-span-1" />
            <Input aria-label="Quantity" label="Qty" inputMode="numeric" value={it.quantity} onChange={(e) => setItem(i, { quantity: Math.max(1, parseInt(e.target.value) || 1) })} disabled={disabled} />
            <Input aria-label="Value each" label="Value" unit="$" inputMode="decimal" value={it.valueCents ? (it.valueCents / 100).toString() : ""} onChange={(e) => setItem(i, { valueCents: Math.round((parseFloat(e.target.value) || 0) * 100) })} disabled={disabled} />
            <Input aria-label="Weight each" label="Weight" unit="oz" inputMode="decimal" value={it.weightOz || ""} onChange={(e) => setItem(i, { weightOz: parseFloat(e.target.value) || 0 })} disabled={disabled} />
            <Input aria-label="HS tariff code" label="HS code" placeholder="6109.10" value={it.hsTariffNumber ?? ""} onChange={(e) => setItem(i, { hsTariffNumber: e.target.value || null })} disabled={disabled} />
            <Select aria-label="Country of origin" label="Made in" value={it.originCountry} onChange={(e) => setItem(i, { originCountry: e.target.value })} options={COUNTRY_OPTS} disabled={disabled} />
            <button type="button" aria-label="Remove item" className="self-end pb-3 text-[13px] font-extrabold text-muted hover:text-danger" disabled={disabled || value.items.length === 1} onClick={() => onChange({ ...value, items: value.items.filter((_, n) => n !== i) })}>✕</button>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" disabled={disabled} onClick={() => onChange({ ...value, items: [...value.items, emptyItem(defaults)] })}>+ Add item</Button>
          <div className="text-[13px] font-bold text-muted">
            Declared {formatCents(totalValue)} · {totalWeight} oz
            {parcelWeightOz !== null && totalWeight > parcelWeightOz && <span className="text-danger"> · heavier than the package ({parcelWeightOz} oz)</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select label="Contents" value={value.contentsType} onChange={(e) => set("contentsType", e.target.value)} options={CONTENTS_TYPES.map((c) => ({ value: c.value, label: c.label }))} disabled={disabled} />
        {value.contentsType === "other" ? (
          <Input label="Explain the contents" value={value.contentsExplanation ?? ""} onChange={(e) => set("contentsExplanation", e.target.value)} disabled={disabled} />
        ) : (
          <Select label="If it can't be delivered" value={value.nonDeliveryOption} onChange={(e) => set("nonDeliveryOption", e.target.value as "return" | "abandon")} options={NON_DELIVERY.map((n) => ({ value: n.value, label: n.label }))} disabled={disabled} />
        )}
        <Input label="Signer (your name)" value={value.customsSigner} onChange={(e) => set("customsSigner", e.target.value)} disabled={disabled} />
        <Input label="EEL / PFC" value={value.eelPfc} onChange={(e) => set("eelPfc", e.target.value)} disabled={disabled} placeholder={EEL_PFC_DEFAULT} />
        <Select label="Restriction" value={value.restrictionType} onChange={(e) => set("restrictionType", e.target.value)} options={RESTRICTION_TYPES.map((r) => ({ value: r.value, label: r.label }))} disabled={disabled} />
        {value.restrictionType !== "none" ? (
          <Input label="Restriction details" value={value.restrictionComments ?? ""} onChange={(e) => set("restrictionComments", e.target.value)} disabled={disabled} />
        ) : (
          <Select label="Incoterm (who pays duties)" value={value.incoterm ?? ""} onChange={(e) => set("incoterm", e.target.value || null)} options={[{ value: "", label: "Carrier default (usually DAP — recipient pays)" }, ...INCOTERMS.map((i) => ({ value: i, label: i === "DDP" ? "DDP — I pay duties & taxes" : i === "DAP" ? "DAP — recipient pays duties" : i }))]} disabled={disabled} />
        )}
      </div>
      <label className="flex cursor-pointer items-start gap-3 text-[14px] font-bold text-ink-2">
        <Checkbox checked={value.customsCertify} onChange={(v) => set("customsCertify", v)} label="Certify the declaration" className="mt-0.5" />
        <span onClick={() => set("customsCertify", !value.customsCertify)}>I certify this declaration is accurate and the package contains nothing prohibited.</span>
      </label>
      {problems.length > 0 && <div className="text-[13px] font-bold text-muted">To get international rates: {problems[0]}</div>}
      <div className="text-[12px] font-bold text-muted">&ldquo;NOEEI 30.37(a)&rdquo; is the usual EEL/PFC for goods under $2,500. Duties and taxes are charged by the destination country, not by us.</div>
    </section>
  );
}
