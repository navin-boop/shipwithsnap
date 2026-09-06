"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, Input, Select } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/money";
import { cancelClaim, fileClaim, refreshClaim, type ClaimView } from "@/lib/claims/actions";
import { CLAIM_TYPES } from "@/lib/shipping/options";

// Insurance claims: lost, damaged or stolen packages that were insured when the label was bought.

type Claimable = { labelId: string; trackingNumber: string; carrier: string; serviceName: string; insuredCents: number; name: string; status: string };
type Attachment = { name: string; dataUrl: string };

const OPEN = ["submitted", "in_review", "pending", "under_review"];

async function readFile(file: File): Promise<Attachment> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error("read failed"));
    r.readAsDataURL(file);
  });
  return { name: file.name, dataUrl };
}

export function ClaimsView({ initial, claimable, preselect, defaultEmail }: { initial: ClaimView[]; claimable: Claimable[]; preselect: string | null; defaultEmail: string }) {
  const [claims, setClaims] = useState(initial);
  const [open, setOpen] = useState(!!preselect);
  const [labelId, setLabelId] = useState(preselect ?? claimable[0]?.labelId ?? "");
  const [type, setType] = useState<"damage" | "loss" | "theft">("damage");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [pending, start] = useTransition();

  const label = claimable.find((c) => c.labelId === labelId);
  const say = (ok: boolean, text: string) => { setErr(!ok); setNotice(text); };

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-7 sm:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="disp text-[40px]">Claims</h1>
          <p className="max-w-[640px] text-[15px] font-bold text-ink-2">If an insured package is lost, damaged or stolen, file here. Damage and theft claims need a photo; lost packages need a wait of about 15 days from the last scan.</p>
        </div>
        {!open && claimable.length > 0 && <Button size="md" onClick={() => setOpen(true)}>File a claim</Button>}
      </div>

      {open && (
        <section className="card flex flex-col gap-4 p-5 sm:p-6">
          <div className="lbl">New claim</div>
          {claimable.length === 0 ? (
            <div className="text-[14px] font-bold text-muted">No insured labels yet. Add a declared value on the <Link href="/ship" className="text-coral">Ship</Link> page to insure a package.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Select label="Package" value={labelId} onChange={(e) => setLabelId(e.target.value)} options={claimable.map((c) => ({ value: c.labelId, label: `${c.name} · ${c.trackingNumber} · insured ${formatCents(c.insuredCents)}` }))} />
                <Select label="What happened" value={type} onChange={(e) => setType(e.target.value as typeof type)} options={CLAIM_TYPES.map((t) => ({ value: t.value, label: t.label }))} />
                <Input label="Amount you're claiming" unit="$" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={label ? (label.insuredCents / 100).toFixed(2) : "0.00"} />
                <Input label="Contact email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Input label="What happened, in your words" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="The box arrived crushed and the mug inside was in pieces." />
              <div className="flex flex-col gap-2">
                <div className="lbl">Evidence {type !== "loss" && <span className="text-danger">— required for {type}</span>}</div>
                <label className="inline-flex h-10 w-fit cursor-pointer items-center rounded-pill border-2 border-ink bg-surface px-4 text-[14px] font-extrabold">
                  Add photos or receipts
                  <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" multiple className="hidden" onChange={async (e) => {
                    const picked = [...(e.target.files ?? [])];
                    setFiles([...files, ...(await Promise.all(picked.map(readFile)))].slice(0, 5));
                  }} />
                </label>
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {files.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-2 rounded-pill border-2 border-hairline bg-surface px-3 py-1 text-[12px] font-bold">
                        {f.name}
                        <button type="button" className="text-muted hover:text-danger" onClick={() => setFiles(files.filter((_, n) => n !== i))}>✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="md" disabled={pending} onClick={() => start(async () => {
                  const r = await fileClaim({
                    labelId, type, amountCents: Math.round((parseFloat(amount) || 0) * 100), description, contactEmail: email,
                    evidence: type !== "loss" ? files : undefined, supporting: type === "loss" ? files : undefined,
                  });
                  if (r.ok) { setClaims([r.claim, ...claims]); setOpen(false); setFiles([]); setAmount(""); setDescription(""); say(true, "Claim submitted. You'll hear back by email."); } else say(false, r.error);
                })}>{pending ? "Submitting…" : "Submit claim"}</Button>
                <button type="button" className="text-[13px] font-extrabold text-muted" onClick={() => setOpen(false)}>Cancel</button>
                {notice && <span className={cn("text-[13px] font-bold", err ? "text-danger" : "text-teal")}>{notice}</span>}
              </div>
            </>
          )}
        </section>
      )}
      {!open && notice && <div className={cn("text-[13px] font-bold", err ? "text-danger" : "text-teal")}>{notice}</div>}

      <section className="flex flex-col gap-3">
        <div className="lbl">Filed</div>
        {claims.length === 0 && <div className="text-[14px] font-bold text-muted">No claims filed.</div>}
        {claims.map((c) => (
          <div key={c.id} className="card-quiet flex flex-col gap-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <div className="text-[15px] font-extrabold capitalize">{c.type} · {c.trackingNumber}</div>
                <div className="text-[13px] font-bold text-muted">Filed {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}{c.statusDetail ? ` · ${c.statusDetail}` : ""}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn("rounded-pill border-2 border-ink px-3 py-1 text-[12px] font-extrabold capitalize", c.status === "approved" || c.status === "paid" ? "bg-teal text-white" : c.status === "denied" || c.status === "rejected" ? "bg-danger text-white" : "bg-yellow")}>{c.status.replace(/_/g, " ")}</span>
                <div className="flex flex-col items-end">
                  <span className="disp text-[20px]">{formatCents(c.approvedCents ?? c.requestedCents)}</span>
                  {c.approvedCents !== null && c.approvedCents !== c.requestedCents && <span className="text-[12px] font-bold text-muted line-through">{formatCents(c.requestedCents)}</span>}
                </div>
                <Button variant="outline" size="sm" disabled={pending} onClick={() => start(async () => { const r = await refreshClaim(c.id); if (r.ok) setClaims((prev) => prev.map((x) => (x.id === c.id ? r.claim : x))); else say(false, r.error); })}>Refresh</Button>
                {OPEN.includes(c.status) && (
                  <Button variant="outline" size="sm" disabled={pending} onClick={() => confirm("Withdraw this claim?") && start(async () => { const r = await cancelClaim(c.id); if (r.ok) setClaims((prev) => prev.map((x) => (x.id === c.id ? r.claim : x))); else say(false, r.error); })}>Withdraw</Button>
                )}
              </div>
            </div>
            <p className="text-[14px] font-bold text-ink-2">{c.description}</p>
            {c.history.length > 1 && (
              <div className="flex flex-wrap gap-2 border-t-2 border-hairline pt-2 text-[12px] font-bold text-muted">
                {c.history.map((h, i) => <span key={i} className="capitalize">{h.status.replace(/_/g, " ")}{h.at ? ` ${new Date(h.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}</span>)}
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
