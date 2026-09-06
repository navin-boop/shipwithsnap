"use client";

import { useState, useTransition } from "react";
import { Button, CarrierLogo, Checkbox, Chip, Input, Select, Switch } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { CustomsDefaults, RateRules } from "@/lib/db/schema";
import {
  connectCarrierAccount,
  removeCarrierAccount,
  toggleCarrierAccount,
  updateCustomsDefaults,
  updateRateRules,
  type CarrierAccountView,
} from "@/lib/carriers/actions";
import type { CarrierMetadataInfo, CarrierTypeInfo } from "@/lib/shipping/provider";
import { CONTENTS_TYPES, COUNTRIES, EEL_PFC_DEFAULT } from "@/lib/shipping/options";

function Notice({ text, error }: { text: string | null; error?: boolean }) {
  return text ? <div className={cn("text-[13px] font-bold", error ? "text-danger" : "text-teal")}>{text}</div> : null;
}

/** Your own UPS/FedEx/DHL accounts. Credentials go straight to EasyPost; we only keep the account id. */
export function CarrierAccountsPanel({ accounts: initial, types }: { accounts: CarrierAccountView[]; types: CarrierTypeInfo[] }) {
  const [accounts, setAccounts] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState(types[0]?.type ?? "");
  const [description, setDescription] = useState("");
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [pending, start] = useTransition();

  const chosen = types.find((t) => t.type === type);

  return (
    <div className="flex max-w-[720px] flex-col gap-5">
      <div className="flex flex-col gap-3">
        {accounts.length === 0 && <div className="text-[14px] font-bold text-muted">You&apos;re shipping on our carrier accounts, which is what most sellers want — the rates are already discounted.</div>}
        {accounts.map((a) => (
          <div key={a.id} className="card-quiet flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <CarrierLogo carrier={a.carrier} size={36} />
              <div className="flex flex-col"><div className="text-[15px] font-extrabold">{a.carrier}</div><div className="text-[13px] font-bold text-muted">{a.description ?? a.type}</div></div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-bold text-muted">{a.enabled ? "Rates included" : "Off"}</span>
              <Switch checked={a.enabled} label={`Use ${a.carrier}`} onChange={(v) => start(async () => { await toggleCarrierAccount(a.id, v); setAccounts(accounts.map((x) => (x.id === a.id ? { ...x, enabled: v } : x))); })} />
              <button type="button" className="text-[13px] font-extrabold text-muted hover:text-danger" onClick={() => confirm(`Disconnect ${a.carrier}?`) && start(async () => {
                const r = await removeCarrierAccount(a.id);
                if (r.ok) setAccounts(accounts.filter((x) => x.id !== a.id));
                else { setErr(true); setMsg(r.error); }
              })}>Disconnect</button>
            </div>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="card flex flex-col gap-4 p-5">
          <div className="lbl">Connect a carrier account</div>
          <Select label="Carrier" value={type} onChange={(e) => { setType(e.target.value); setCreds({}); }} options={types.map((t) => ({ value: t.type, label: t.readable }))} />
          <Input label="Nickname (optional)" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Main UPS account" />
          {chosen?.credentials.map((c) => (
            <Input key={c.name} label={c.label} type={c.secret ? "password" : "text"} value={creds[c.name] ?? ""} onChange={(e) => setCreds({ ...creds, [c.name]: e.target.value })} />
          ))}
          {chosen?.customWorkflow && <div className="text-[13px] font-bold text-muted">{chosen.readable} may ask you to accept its terms before the account is usable. Rates appear once the carrier approves it.</div>}
          <Notice text={msg} error={err} />
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm" disabled={pending} onClick={() => start(async () => {
              const r = await connectCarrierAccount({ type, description, credentials: creds });
              setErr(!r.ok);
              setMsg(r.ok ? "Connected. Your negotiated rates now show up alongside ours." : r.error);
              if (r.ok) { setAdding(false); setCreds({}); setDescription(""); }
            })}>{pending ? "Connecting…" : "Connect"}</Button>
            <button type="button" className="text-[13px] font-extrabold text-muted" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Button variant="outline" size="sm" className="self-start" disabled={!types.length} onClick={() => setAdding(true)}>+ Connect your own carrier account</Button>
          {!types.length && <div className="text-[13px] font-bold text-muted">Connecting your own carrier account needs a live account — it isn&apos;t available while we&apos;re in test mode.</div>}
          <Notice text={msg} error={err} />
        </div>
      )}
      <p className="text-[13px] font-bold text-muted">Bring your own account when you have negotiated rates with UPS or FedEx. Your credentials are stored by our shipping provider, never by us.</p>
    </div>
  );
}

/** Which rate gets pre-selected, and which services to hide entirely. */
export function RateRulesPanel({ rules: initial, metadata }: { rules: RateRules; metadata: CarrierMetadataInfo[] }) {
  const [rules, setRules] = useState<RateRules>(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [pending, start] = useTransition();

  const hidden = new Set(rules.hiddenServices ?? []);
  const hiddenCarriers = new Set((rules.hiddenCarriers ?? []).map((c) => c.toLowerCase()));
  const toggleService = (key: string) => {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key); else next.add(key);
    setRules({ ...rules, hiddenServices: [...next] });
  };

  return (
    <div className="flex max-w-[760px] flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="lbl">Which rate should be picked for me?</div>
        <div className="flex flex-wrap gap-2">
          {([["cheapest", "Cheapest"], ["fastest", "Fastest"], ["cheapest_within_days", "Cheapest that arrives in time"], ["preferred_carrier", "A carrier I prefer"]] as const).map(([m, l]) => (
            <Chip key={m} size="md" selected={rules.mode === m} onClick={() => setRules({ ...rules, mode: m })}>{l}</Chip>
          ))}
        </div>
        {rules.mode === "cheapest_within_days" && (
          <Input label="Deliver within" unit="days" inputMode="numeric" className="w-[180px]" value={rules.maxDays ?? 3} onChange={(e) => setRules({ ...rules, maxDays: Math.max(1, Math.min(10, parseInt(e.target.value) || 3)) })} />
        )}
        {rules.mode === "preferred_carrier" && (
          <Select label="Preferred carrier" className="w-[240px]" value={rules.preferredCarrier ?? "USPS"} onChange={(e) => setRules({ ...rules, preferredCarrier: e.target.value })} options={(metadata.length ? metadata.map((m) => m.carrier) : ["USPS", "UPS", "FedEx"]).map((c) => ({ value: c, label: c }))} />
        )}
        <div className="text-[13px] font-bold text-muted">This is only the pre-selection — every rate is still listed, and you can always pick another.</div>
      </div>

      {metadata.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="lbl">Hide services you never use</div>
          {metadata.map((m) => {
            const off = hiddenCarriers.has(m.carrier.toLowerCase());
            return (
              <div key={m.carrier} className="flex flex-col gap-2 border-t-2 border-hairline pt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><CarrierLogo carrier={m.carrier} size={28} /><span className="text-[15px] font-extrabold">{m.carrier}</span></div>
                  <label className="flex items-center gap-2 text-[13px] font-bold text-muted">
                    Hide {m.carrier} entirely
                    <Checkbox checked={off} label={`Hide ${m.carrier}`} onChange={(v) => {
                      const next = new Set(hiddenCarriers);
                      if (v) next.add(m.carrier.toLowerCase()); else next.delete(m.carrier.toLowerCase());
                      setRules({ ...rules, hiddenCarriers: [...next] });
                    }} />
                  </label>
                </div>
                {!off && (
                  <div className="flex flex-wrap gap-2">
                    {m.services.map((s) => {
                      const key = `${m.carrier}:${s.code}`;
                      return <Chip key={key} selected={!hidden.has(key)} onClick={() => toggleService(key)} title={s.description ?? undefined}>{s.name}</Chip>;
                    })}
                  </div>
                )}
              </div>
            );
          })}
          <div className="text-[13px] font-bold text-muted">Teal means the service shows up in rate lists. Turning everything off has no effect — we always show something.</div>
        </div>
      )}

      <Notice text={msg} error={err} />
      <Button variant="secondary" size="sm" className="self-start" disabled={pending} onClick={() => start(async () => {
        const r = await updateRateRules(rules);
        setErr(!r.ok);
        setMsg(r.ok ? "Saved." : r.error);
      })}>{pending ? "Saving…" : "Save"}</Button>
    </div>
  );
}

export function CustomsDefaultsForm({ defaults }: { defaults: CustomsDefaults }) {
  const [d, setD] = useState<CustomsDefaults>(defaults);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="flex max-w-[560px] flex-col gap-5">
      <Input label="Who signs the customs form" value={d.signer ?? ""} onChange={(e) => setD({ ...d, signer: e.target.value })} placeholder="Your name" />
      <Select label="Usual contents" value={d.contentsType ?? "merchandise"} onChange={(e) => setD({ ...d, contentsType: e.target.value })} options={CONTENTS_TYPES.map((c) => ({ value: c.value, label: c.label }))} />
      <Select label="Where your goods are made" value={d.originCountry ?? "US"} onChange={(e) => setD({ ...d, originCountry: e.target.value })} options={COUNTRIES.map(([v, l]) => ({ value: v, label: l }))} />
      <Input label="EEL / PFC" value={d.eelPfc ?? EEL_PFC_DEFAULT} onChange={(e) => setD({ ...d, eelPfc: e.target.value })} />
      <Notice text={msg} error={err} />
      <Button variant="secondary" size="sm" className="self-start" disabled={pending} onClick={() => start(async () => {
        const r = await updateCustomsDefaults(d);
        setErr(!r.ok);
        setMsg(r.ok ? "Saved. International shipments start with these." : r.error);
      })}>{pending ? "Saving…" : "Save"}</Button>
      <p className="text-[13px] font-bold text-muted">These pre-fill the customs declaration on the Ship page. You can change any of them per shipment.</p>
    </div>
  );
}
