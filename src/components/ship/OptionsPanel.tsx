"use client";

import { useState } from "react";
import { Chip, Input, Select, Switch } from "@/components/ui";
import { ENDORSEMENTS, HAZMAT, SIGNATURE_LEVELS, SPECIAL_RATES } from "@/lib/shipping/options";
import type { ShipmentOptions } from "@/lib/shipping/provider";
import { cn } from "@/lib/cn";

// Every EasyPost shipment option, grouped the way a seller thinks about them:
// Delivery · On the label · Contents · USPS extras. Collapsed by default; the header counts what's on.

export interface OptionsPanelProps {
  value: ShipmentOptions;
  onChange: (next: ShipmentOptions) => void;
  isReturn: boolean;
  onReturnChange: (v: boolean) => void;
  disabled?: boolean;
  /** Defaults to today; ship date can be up to 7 days out. */
  today?: string;
}

const NONE = { value: "", label: "None" };

export function OptionsPanel({ value, onChange, isReturn, onReturnChange, disabled, today }: OptionsPanelProps) {
  const [open, setOpen] = useState(false);
  const set = <K extends keyof ShipmentOptions>(k: K, v: ShipmentOptions[K]) => {
    const next = { ...value, [k]: v };
    if (v === undefined || v === "" || v === false) delete next[k];
    onChange(next);
  };
  const active = Object.entries(value).filter(([k, v]) => v !== undefined && v !== "" && v !== false && !(k === "signature" && v === "none")).length + (isReturn ? 1 : 0);
  const max = (() => { const d = new Date((today ?? new Date().toISOString().slice(0, 10)) + "T12:00:00"); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); })();

  return (
    <div className="flex flex-col gap-3 border-t-2 border-hairline pt-3">
      <button type="button" className="flex items-center justify-between text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="lbl">More options{active ? ` · ${active} on` : ""}</span>
        <span className="text-[13px] font-extrabold text-coral">{open ? "Hide" : "Show"}</span>
      </button>
      {!open && active > 0 && (
        <div className="flex flex-wrap gap-1.5 text-[12px] font-extrabold text-ink-2">
          {summary(value, isReturn).map((s) => <span key={s} className="rounded-pill border-2 border-hairline bg-surface px-2.5 py-0.5">{s}</span>)}
        </div>
      )}
      {open && (
        <div className={cn("flex flex-col gap-5", disabled && "pointer-events-none opacity-60")}>
          <Group title="Delivery">
            <Select label="Signature" value={value.signature ?? "none"} onChange={(e) => set("signature", e.target.value as ShipmentOptions["signature"])} options={SIGNATURE_LEVELS.map((s) => ({ value: s.value, label: `${s.label} — ${s.hint}` }))} />
            <div className="flex flex-wrap gap-2">
              <Chip selected={!!value.saturdayDelivery} onClick={() => set("saturdayDelivery", !value.saturdayDelivery)}>Saturday delivery</Chip>
              <Chip selected={!!value.holdForPickup} onClick={() => set("holdForPickup", !value.holdForPickup)}>Hold for pickup</Chip>
              <Chip selected={!!value.additionalHandling} onClick={() => set("additionalHandling", !value.additionalHandling)}>Additional handling</Chip>
              <Chip selected={!!value.carbonNeutral} onClick={() => set("carbonNeutral", !value.carbonNeutral)}>Carbon neutral (UPS)</Chip>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label="Ship date" type="date" min={today} max={max} value={value.labelDate ?? ""} onChange={(e) => set("labelDate", e.target.value)} />
              <Select label="If undeliverable (USPS endorsement)" value={value.endorsement ?? ""} onChange={(e) => set("endorsement", e.target.value)} options={[NONE, ...ENDORSEMENTS]} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label="Carrier emails the recipient at" type="email" placeholder="optional" value={value.carrierNotificationEmail ?? ""} onChange={(e) => set("carrierNotificationEmail", e.target.value)} />
              <Input label="Carrier texts the recipient at" placeholder="optional" value={value.carrierNotificationSms ?? ""} onChange={(e) => set("carrierNotificationSms", e.target.value)} />
            </div>
          </Group>

          <Group title="On the label">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label="Reference line 1" placeholder="Order #1042, SKU…" maxLength={40} value={value.printCustom1 ?? ""} onChange={(e) => set("printCustom1", e.target.value)} />
              <Input label="Reference line 2" placeholder="optional" maxLength={40} value={value.printCustom2 ?? ""} onChange={(e) => set("printCustom2", e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label="Invoice number" placeholder="optional" maxLength={40} value={value.invoiceNumber ?? ""} onChange={(e) => set("invoiceNumber", e.target.value)} />
              <Input label="Handling instructions" placeholder="Fragile, this side up…" maxLength={200} value={value.handlingInstructions ?? ""} onChange={(e) => set("handlingInstructions", e.target.value)} />
            </div>
          </Group>

          <Group title="What's inside">
            <Input label="Contents description" placeholder="Candles, T-shirts…" maxLength={120} value={value.contentDescription ?? ""} onChange={(e) => set("contentDescription", e.target.value)} />
            <Select label="Hazardous materials" value={value.hazmat ?? ""} onChange={(e) => set("hazmat", e.target.value)} options={HAZMAT.map((h) => ({ value: h.value, label: h.label }))} />
            <div className="flex flex-wrap gap-2">
              <Chip selected={!!value.alcohol} onClick={() => set("alcohol", !value.alcohol)}>Contains alcohol</Chip>
              <Chip selected={!!value.perishable} onClick={() => set("perishable", !value.perishable)}>Perishable</Chip>
              <Chip selected={!!value.dryIce} onClick={() => set("dryIce", !value.dryIce)}>Dry ice</Chip>
              <Chip selected={value.machinable === false} onClick={() => set("machinable", value.machinable === false ? undefined : false)}>Not machinable</Chip>
            </div>
            {value.dryIce && <Input label="Dry ice weight" unit="oz" inputMode="decimal" value={value.dryIceWeightOz ?? ""} onChange={(e) => set("dryIceWeightOz", e.target.value ? Number(e.target.value) : undefined)} className="max-w-[200px]" />}
            {value.alcohol && <div className="text-[13px] font-bold text-muted">Alcohol needs an adult signature and a licensed shipper account with the carrier.</div>}
          </Group>

          <Group title="USPS extras">
            <Select label="Special rate" value={value.specialRatesEligibility ?? ""} onChange={(e) => set("specialRatesEligibility", e.target.value)} options={[{ value: "", label: "Standard postage" }, ...SPECIAL_RATES.map((s) => ({ value: s.value, label: `${s.label} — ${s.hint}` }))]} />
            <div className="flex flex-wrap gap-2">
              <Chip selected={!!value.certifiedMail} onClick={() => set("certifiedMail", !value.certifiedMail)}>Certified Mail</Chip>
              <Chip selected={!!value.registeredMail} onClick={() => set("registeredMail", !value.registeredMail)}>Registered Mail</Chip>
              <Chip selected={!!value.returnReceipt} onClick={() => set("returnReceipt", !value.returnReceipt)}>Return receipt</Chip>
            </div>
          </Group>

          <div className="flex items-center justify-between gap-4 rounded-[14px] border-2 border-ink bg-surface px-4 py-3">
            <div className="flex flex-col">
              <div className="text-[15px] font-extrabold">This is a return label</div>
              <div className="text-[13px] font-bold text-muted">The recipient ships the package back to you. Email it or drop it in the box.</div>
            </div>
            <Switch checked={isReturn} onChange={onReturnChange} label="Return label" />
          </div>
        </div>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[13px] font-extrabold text-ink-2">{title}</div>
      {children}
    </div>
  );
}

function summary(v: ShipmentOptions, isReturn: boolean): string[] {
  const out: string[] = [];
  const sig = SIGNATURE_LEVELS.find((s) => s.value === v.signature);
  if (sig && sig.value !== "none") out.push(sig.label);
  if (v.saturdayDelivery) out.push("Saturday");
  if (v.holdForPickup) out.push("Hold for pickup");
  if (v.additionalHandling) out.push("Additional handling");
  if (v.labelDate) out.push(`Ships ${v.labelDate}`);
  if (v.printCustom1) out.push(`Ref: ${v.printCustom1}`);
  if (v.hazmat) out.push("Hazmat");
  if (v.alcohol) out.push("Alcohol");
  if (v.dryIce) out.push("Dry ice");
  if (v.perishable) out.push("Perishable");
  if (v.specialRatesEligibility) out.push(v.specialRatesEligibility.includes("MEDIA") ? "Media Mail" : "Library Mail");
  if (v.certifiedMail) out.push("Certified");
  if (v.registeredMail) out.push("Registered");
  if (isReturn) out.push("Return label");
  return out;
}
