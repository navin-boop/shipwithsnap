"use client";

import { useState, useTransition } from "react";
import { Button, Chip, Input, Switch } from "@/components/ui";
import type { Account, Address, ApiKey, CustomerEmailPrefs, User, WebhookEndpoint } from "@/lib/db/schema";
import { cn } from "@/lib/cn";
import {
  addWebhookEndpoint,
  changeRole,
  updateLogo,
  createApiKey,
  deleteWebhookEndpoint,
  inviteMember,
  removeMember,
  revokeApiKey,
  revokeInvite,
  setDefaultShipFrom,
  testWebhookEndpoint,
  updateCustomerEmails,
  updatePrinting,
  updateStore,
} from "@/lib/settings/actions";
import { WEBHOOK_EVENTS } from "@/lib/webhooks/outbound";
import { formatAddressLine } from "@/lib/ship/address-parse";
import { ShipFromForm } from "@/components/ship/ShipFromForm";

function Notice({ text, error }: { text: string | null; error?: boolean }) {
  return text ? <div className={cn("text-xs", error ? "text-danger" : "text-electric")}>{text}</div> : null;
}

export function SectionHeader({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="disp text-[28px]">{title}</h2>
      <p className="text-sm text-muted">{blurb}</p>
    </div>
  );
}

/** Shrinks an image file to fit 512×512 and returns a PNG data URL (keeps transparency). */
async function resizeLogo(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

export function StoreForm({ account, hasLogo }: { account: Account; hasLogo: boolean }) {
  const [name, setName] = useState(account.name);
  const [replyTo, setReplyTo] = useState(account.replyTo ?? "");
  const [logo, setLogo] = useState<string | null>(hasLogo ? `/api/logo/${account.id}` : null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [pending, start] = useTransition();

  function pickLogo(file: File) {
    start(async () => {
      try {
        const dataUrl = await resizeLogo(file);
        const r = await updateLogo(dataUrl);
        setErr(!r.ok);
        setMsg(r.ok ? "Logo saved." : r.error);
        if (r.ok) setLogo(dataUrl);
      } catch {
        setErr(true);
        setMsg("Couldn't read that image.");
      }
    });
  }

  return (
    <div className="flex max-w-[560px] flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="lbl">Logo — on the tracking page and customer emails</div>
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-40 items-center justify-center rounded-[14px] border-2 border-ink bg-surface bg-surface p-2">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="Store logo" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="disp text-xl">{name || "Your logo"}</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="inline-flex h-10 cursor-pointer items-center rounded-pill border-2 border-ink bg-surface px-4 text-[14px] font-extrabold">
              {logo ? "Replace" : "Upload logo"}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && pickLogo(e.target.files[0])} />
            </label>
            {logo && <button type="button" className="lbl text-danger" onClick={() => start(async () => { await updateLogo(null); setLogo(null); setMsg("Logo removed."); })}>Remove</button>}
          </div>
        </div>
        <div className="text-xs text-muted">PNG with a transparent background looks best. It&apos;s resized to 512px.</div>
      </div>
      <Input label="Store name — shown on labels, emails and the tracking page" value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="Reply-to email for customer emails" type="email" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} placeholder="hello@yourstore.com" />
      <Notice text={msg} error={err} />
      <Button variant="secondary" size="sm" className="self-start" disabled={pending} onClick={() => start(async () => { const r = await updateStore({ name, replyTo }); setErr(!r.ok); setMsg(r.ok ? "Saved." : r.error); })}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

export function PrintingForm({ account }: { account: Account }) {
  const [fmt, setFmt] = useState(account.labelFormat);
  const [after, setAfter] = useState(account.afterBuy as "print" | "download" | "nothing");
  const [slip, setSlip] = useState(account.packingSlip);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const opts: Array<[typeof fmt, string, string]> = [
    ["pdf_4x6", "4 × 6 in", "Thermal label printers. One label per page."],
    ["pdf_letter", "8.5 × 11 in", "Plain paper. Letter-size where the carrier supports it, else 4×6 on a page."],
    ["zpl", "ZPL", "Raw Zebra output for print servers and the API."],
  ];
  return (
    <div className="flex max-w-[760px] flex-col gap-7">
      <div className="flex flex-col gap-3">
        <div className="lbl">Label format</div>
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
          {opts.map(([k, title, sub]) => (
            <button key={k} type="button" onClick={() => setFmt(k)} className={cn("flex flex-col gap-1.5 rounded-card border-2 border-ink bg-surface p-5 text-left", fmt === k && "bg-ink text-paper")}>
              <div className="disp text-lg">{title}</div>
              <div className="text-[13px] opacity-75">{sub}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="lbl">After buying a label</div>
        <div className="flex flex-wrap gap-2">
          {([["print", "Open print dialog"], ["download", "Download PDF"], ["nothing", "Do nothing"]] as const).map(([k, label]) => (
            <Chip key={k} size="md" selected={after === k} onClick={() => setAfter(k)}>{label}</Chip>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between border-b border-t border-line py-3 text-sm">
        <div>Packing slip with order items (batch labels)</div>
        <Switch checked={slip} onChange={setSlip} label="Packing slip" />
      </div>
      <Notice text={msg} />
      <Button variant="secondary" size="sm" className="self-start" disabled={pending} onClick={() => start(async () => { const r = await updatePrinting({ labelFormat: fmt, afterBuy: after, packingSlip: slip }); setMsg(r.ok ? "Saved." : r.error); })}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

export function ShipFromList({ addresses: initial, defaultId: initialDefault }: { addresses: Address[]; defaultId: string | null }) {
  const [addresses, setAddresses] = useState(initial);
  const [defaultId, setDefaultId] = useState(initialDefault);
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="flex max-w-[760px] flex-col gap-4">
      <div className="flex flex-col">
        {addresses.map((a) => (
          <div key={a.id} className="flex flex-col gap-2 border-t border-line py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-0.5 text-sm">
              <div className="font-semibold">{a.name ?? a.company}{a.id === defaultId && <span className="lbl ml-2 text-electric">Default</span>}</div>
              <div className="text-ink-2">{formatAddressLine(a)}</div>
              <div className="text-xs text-muted">{a.phone ? a.phone : <span className="text-danger">No phone — FedEx and UPS refuse labels without one</span>}</div>
            </div>
            {a.id !== defaultId && (
              <Button variant="outline" size="sm" disabled={pending} onClick={() => start(async () => { await setDefaultShipFrom(a.id); setDefaultId(a.id); })}>Make default</Button>
            )}
          </div>
        ))}
        {!addresses.length && <div className="border-t border-line py-3.5 text-sm text-muted">No ship-from addresses yet. Add the first one below.</div>}
      </div>

      {adding ? (
        <div className="card flex flex-col gap-3 p-5">
          <div className="lbl">New ship-from address</div>
          <ShipFromForm
            initial={null}
            onSaved={(a) => {
              setAddresses((prev) => [a, ...prev.filter((x) => x.id !== a.id)]);
              setDefaultId(a.id); // saveShipFrom makes the newest one the default
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        <Button variant="outline" size="sm" className="self-start" onClick={() => setAdding(true)}>+ Add a ship-from address</Button>
      )}
      <p className="text-xs text-muted">Saving a new address makes it the default for new shipments. You can also switch address per shipment on the Ship page.</p>
    </div>
  );
}

export function TeamPanel({ members, invites, me }: { members: User[]; invites: Array<{ id: string; email: string; role: string; expiresAt: Date }>; me: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"owner" | "shipper" | "viewer">("shipper");
  const [link, setLink] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex max-w-[760px] flex-col gap-7">
      <div className="flex flex-col">
        <div className="grid grid-cols-[1.4fr_1fr_auto] border-b border-line py-2"><div className="lbl">Member</div><div className="lbl">Role</div><div className="lbl" /></div>
        {members.map((m) => (
          <div key={m.id} className="grid grid-cols-[1.4fr_1fr_auto] items-center gap-2 border-b border-hairline py-3 text-sm">
            <div className="flex min-w-0 flex-col"><div className="truncate font-semibold">{m.name ?? m.email}</div><div className="truncate text-xs text-muted">{m.email}{m.id === me ? " · you" : ""}</div></div>
            <div>
              {m.id === me ? <span className="lbl text-ink">{m.role}</span> : (
                <select defaultValue={m.role} onChange={(e) => start(async () => { const r = await changeRole(m.id, e.target.value as "owner"); if (!r.ok) setMsg(r.error); })} className="h-9 rounded-pill border-2 border-ink bg-surface bg-transparent px-2 text-[14px] font-extrabold">
                  <option value="owner">Owner</option><option value="shipper">Shipper</option><option value="viewer">Viewer</option>
                </select>
              )}
            </div>
            <div className="text-right">{m.id !== me && <button type="button" className="lbl text-danger" onClick={() => confirm(`Remove ${m.email}?`) && start(async () => { const r = await removeMember(m.id); if (!r.ok) setMsg(r.error); })}>Remove</button>}</div>
          </div>
        ))}
        {invites.map((i) => (
          <div key={i.id} className="grid grid-cols-[1.4fr_1fr_auto] items-center gap-2 border-b border-hairline py-3 text-sm">
            <div className="flex flex-col"><div className="font-semibold">{i.email}</div><div className="text-xs text-muted">Invited · expires {i.expiresAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div></div>
            <div className="lbl text-ink">{i.role}</div>
            <div className="text-right"><button type="button" className="lbl text-danger" onClick={() => start(async () => { await revokeInvite(i.id); })}>Revoke</button></div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-4 rounded-card border-2 border-ink bg-surface p-5">
        <div className="lbl">Invite someone</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="packer@yourstore.com" />
          <div className="flex flex-col gap-1">
            <div className="lbl">Role</div>
            <select value={role} onChange={(e) => setRole(e.target.value as "owner")} className="h-11 border-0 border-b-2 border-line bg-transparent text-[15px] font-medium">
              <option value="owner">Owner</option><option value="shipper">Shipper</option><option value="viewer">Viewer</option>
            </select>
          </div>
          <Button variant="secondary" size="sm" disabled={pending} onClick={() => start(async () => { const r = await inviteMember({ email, role }); if (r.ok) { setLink(r.data.link); setEmail(""); setMsg(null); } else setMsg(r.error); })}>Create invite</Button>
        </div>
        {link && <div className="flex flex-col gap-1 text-sm"><div className="lbl">Send them this link (valid 7 days)</div><code className="break-all bg-surface p-2 text-xs">{link}</code></div>}
        <Notice text={msg} error />
        <p className="text-xs text-muted">Owners manage billing and team. Shippers buy labels. Viewers see reports only.</p>
      </div>
    </div>
  );
}

export function CustomerEmailsForm({ prefs }: { prefs: CustomerEmailPrefs }) {
  const [p, setP] = useState(prefs);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const rows: Array<[keyof CustomerEmailPrefs, string, string]> = [
    ["shipped", "Shipped", "Sent on the carrier's first scan, with the tracking link."],
    ["outForDelivery", "Out for delivery", "Sent the morning it's on the truck."],
    ["delivered", "Delivered", "Sent when the carrier confirms delivery."],
    ["exception", "Delivery problem", "Sent when the carrier reports an exception. Off by default — you'll want to reach out yourself."],
  ];
  return (
    <div className="flex max-w-[640px] flex-col gap-5">
      <div className="flex flex-col">
        {rows.map(([k, title, sub]) => (
          <div key={k} className="flex items-center justify-between gap-6 border-t border-line py-3.5 text-sm">
            <div className="flex flex-col gap-0.5"><div className="font-semibold">{title}</div><div className="text-xs text-muted">{sub}</div></div>
            <Switch checked={p[k]} onChange={(v) => setP({ ...p, [k]: v })} label={title} />
          </div>
        ))}
      </div>
      <Notice text={msg} />
      <Button variant="secondary" size="sm" className="self-start" disabled={pending} onClick={() => start(async () => { const r = await updateCustomerEmails(p); setMsg(r.ok ? "Saved." : r.error); })}>{pending ? "Saving…" : "Save"}</Button>
      <p className="text-xs text-muted">Emails go to the recipient email on each shipment, from Ship with Snap with your store name and reply-to.</p>
    </div>
  );
}

export function ApiPanel({ keys, endpoints }: { keys: ApiKey[]; endpoints: WebhookEndpoint[] }) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"live" | "test">("test");
  const [shown, setShown] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["label.created", "tracking.updated"]);
  const [secret, setSecret] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex max-w-[800px] flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col">
          <div className="grid grid-cols-[1fr_1fr_auto] border-b border-line border-t-2 py-2 sm:grid-cols-[1.2fr_1.4fr_0.8fr_0.6fr]"><div className="lbl">Name</div><div className="lbl">Key</div><div className="lbl hidden sm:block">Last used</div><div className="lbl" /></div>
          {keys.map((k) => (
            <div key={k.id} className={cn("grid grid-cols-[1fr_1fr_auto] items-center gap-2 border-b border-hairline py-3 text-sm sm:grid-cols-[1.2fr_1.4fr_0.8fr_0.6fr]", k.revokedAt && "opacity-50")}>
              <div className="truncate font-semibold">{k.name}</div>
              <div className="truncate font-mono text-[13px]">{k.prefix}…{k.revokedAt ? " (revoked)" : ""}</div>
              <div className="hidden text-muted sm:block">{k.lastUsedAt ? k.lastUsedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Never"}</div>
              <div className="text-right">{!k.revokedAt && <button type="button" className="lbl text-danger" onClick={() => confirm("Revoke this key? Anything using it stops working immediately.") && start(async () => { await revokeApiKey(k.id); })}>Revoke</button>}</div>
            </div>
          ))}
          {!keys.length && <div className="py-3 text-sm text-muted">No API keys yet.</div>}
        </div>
        {shown && (
          <div className="flex flex-col gap-1 bg-ink p-4 text-paper"><div className="lbl text-lime">Copy it now — it won&apos;t be shown again</div><code className="break-all text-sm">{shown}</code></div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
          <Input label="Key name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Warehouse app" />
          <div className="flex flex-col gap-1"><div className="lbl">Mode</div>
            <select value={mode} onChange={(e) => setMode(e.target.value as "live")} className="h-11 border-0 border-b-2 border-line bg-transparent text-[15px] font-medium"><option value="test">Test</option><option value="live">Live</option></select>
          </div>
          <Button variant="secondary" size="sm" disabled={pending} onClick={() => start(async () => { const r = await createApiKey({ name, mode }); if (r.ok) { setShown(r.data.key); setName(""); setMsg(null); } else setMsg(r.error); })}>Create key</Button>
        </div>
        <p className="text-xs text-muted">Use as <code>Authorization: Bearer sk_…</code>. See the <a href="/docs" target="_blank">API docs</a>.</p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="lbl">Webhook endpoints</div>
        <div className="flex flex-col">
          {endpoints.map((e) => (
            <div key={e.id} className="flex flex-col gap-2 border-t border-line py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-0.5"><div className="break-all font-mono text-[13px]">{e.url}</div><div className="text-xs text-muted">{e.events.join(" · ")}</div></div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={pending} onClick={() => start(async () => { const r = await testWebhookEndpoint(e.id); setMsg(r.ok ? `Ping delivered · HTTP ${r.data.status}` : r.error); })}>Send test</Button>
                <button type="button" className="lbl text-danger" onClick={() => confirm("Delete this endpoint?") && start(async () => { await deleteWebhookEndpoint(e.id); })}>Delete</button>
              </div>
            </div>
          ))}
        </div>
        {secret && <div className="flex flex-col gap-1 bg-ink p-4 text-paper"><div className="lbl text-lime">Signing secret — copy it now</div><code className="break-all text-sm">{secret}</code><div className="text-xs text-muted-on-ink">Verify <code>x-snap-signature: sha256=HMAC(body)</code> with it.</div></div>}
        <div className="flex flex-col gap-3 rounded-card border-2 border-ink bg-surface p-5">
          <Input label="Endpoint URL" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.yourstore.com/hooks/snap" />
          <div className="flex flex-wrap gap-2">
            {WEBHOOK_EVENTS.map((ev) => (
              <Chip key={ev} selected={events.includes(ev)} onClick={() => setEvents((p) => (p.includes(ev) ? p.filter((x) => x !== ev) : [...p, ev]))}>{ev}</Chip>
            ))}
          </div>
          <Button variant="secondary" size="sm" className="self-start" disabled={pending} onClick={() => start(async () => { const r = await addWebhookEndpoint({ url, events }); if (r.ok) { setSecret(r.data.secret); setUrl(""); setMsg(null); } else setMsg(r.error); })}>Add endpoint</Button>
        </div>
        <Notice text={msg} error={!!msg && !msg.startsWith("Ping")} />
      </div>
    </div>
  );
}
