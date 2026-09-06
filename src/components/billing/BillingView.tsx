"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Input, Switch } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/money";
import { deleteCard, makeDefaultCard, updateReceiptSettings } from "@/lib/billing/actions";
import type { LedgerEntry } from "@/lib/billing/service";
import { AddCardButton } from "./AddCardDialog";

// Spec: design/Wallet.dc.html — payment method, receipts, then charges and refunds in one list.

export type CardView = { id: string; brand: string; last4: string; exp: string; nameOnCard: string | null; isDefault: boolean; expired: boolean };

export interface BillingViewProps {
  cards: CardView[];
  ledger: LedgerEntry[];
  summary: { month: string; chargedCents: number; charges: number; refundedCents: number };
  publishableKey: string | null;
  billingEnabled: boolean;
  lockedReason: string | null;
  receiptEmails: boolean;
  receiptEmail: string;
  isOwner: boolean;
}

const LOCK_COPY: Record<string, string> = {
  card_declined: "Your last charge was declined. Add or update a card to start buying labels again.",
  unpaid_adjustment: "A carrier adjustment could not be charged. Settle it to start buying labels again.",
  dispute: "A payment on this account is disputed. New purchases are paused until it is resolved.",
};

export function BillingView(props: BillingViewProps) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [pending, start] = useTransition();
  const [emails, setEmails] = useState(props.receiptEmails);
  const [email, setEmail] = useState(props.receiptEmail);

  const say = (ok: boolean, text: string) => { setErr(!ok); setNotice(text); };
  const net = props.summary.chargedCents - props.summary.refundedCents;

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-7 sm:px-10">
      <div className="flex flex-col gap-2">
        <div className="lbl">Billing</div>
        <h1 className="disp text-[40px]">Pay as you go.</h1>
        <p className="max-w-[560px] text-[15px] font-bold text-ink-2">
          Each label is one charge to your card. A batch is one charge for the whole batch. Nothing to prepay.
        </p>
      </div>

      {!props.billingEnabled && (
        <div className="card-quiet flex flex-col gap-1 border-coral bg-coral-soft p-4">
          <div className="text-[15px] font-extrabold">Billing is switched off</div>
          <div className="text-[14px] font-semibold text-ink-2">No Stripe key is set on this deployment, so labels are bought without a charge. Add the Stripe keys to start taking payment.</div>
        </div>
      )}

      {props.lockedReason && (
        <div className="card flex flex-col gap-1 bg-coral p-4 text-white">
          <div className="text-[15px] font-extrabold">Buying is paused</div>
          <div className="text-[14px] font-semibold">{LOCK_COPY[props.lockedReason] ?? "Buying is paused on this account."}</div>
        </div>
      )}

      <section className="card flex flex-col gap-4 p-5 sm:p-6">
        <div className="lbl">Payment method</div>
        {props.cards.length === 0 && (
          <div className="text-[14px] font-bold text-muted">No card saved yet. You need one before your first label.</div>
        )}
        <div className="flex flex-col gap-3">
          {props.cards.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border-2 border-hairline bg-surface p-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-[54px] items-center justify-center rounded-[10px] border-2 border-ink bg-ink text-[11px] font-extrabold text-paper">{c.brand}</div>
                <div className="flex flex-col">
                  <div className="text-[15px] font-extrabold">{c.brand} ·· {c.last4}{c.nameOnCard ? ` · ${c.nameOnCard}` : ""}</div>
                  <div className={cn("text-[13px] font-bold", c.expired ? "text-danger" : "text-muted")}>{c.expired ? `Expired ${c.exp}` : `Expires ${c.exp}`}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {c.isDefault ? (
                  <span className="rounded-pill border-2 border-ink bg-teal px-3 py-1 text-[12px] font-extrabold text-white">Default</span>
                ) : (
                  props.isOwner && (
                    <Button variant="outline" size="sm" disabled={pending} onClick={() => start(async () => { const r = await makeDefaultCard(c.id); say(r.ok, r.ok ? r.message ?? "Updated." : r.error); router.refresh(); })}>Make default</Button>
                  )
                )}
                {props.isOwner && (
                  <button type="button" className="text-[13px] font-extrabold text-muted hover:text-danger" disabled={pending}
                    onClick={() => confirm(`Remove ${c.brand} ·· ${c.last4}?`) && start(async () => { const r = await deleteCard(c.id); say(r.ok, r.ok ? r.message ?? "Removed." : r.error); router.refresh(); })}>Remove</button>
                )}
              </div>
            </div>
          ))}
        </div>
        {props.isOwner && props.billingEnabled && <AddCardButton publishableKey={props.publishableKey} onAdded={() => { say(true, "Card saved."); router.refresh(); }} label={props.cards.length ? "Add another card" : "Add card"} />}
        <p className="text-[13px] font-bold text-muted">
          Cards are stored by Stripe; Snap never sees the number. A declined card stops new labels until you update it — nothing already bought is affected.
        </p>
      </section>

      {props.isOwner && (
        <section className="card-quiet flex flex-col gap-4 p-5 sm:p-6">
          <div className="lbl">Receipts</div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col">
              <div className="text-[15px] font-extrabold">Email a receipt for every charge</div>
              <div className="text-[13px] font-bold text-muted">Stripe sends it the moment the charge settles.</div>
            </div>
            <Switch checked={emails} label="Email a receipt for every charge" onChange={setEmails} />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Input label="Send receipts to" type="email" placeholder="billing@yourstore.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full sm:w-[320px]" />
            <Button variant="secondary" size="sm" disabled={pending} onClick={() => start(async () => { const r = await updateReceiptSettings({ receiptEmails: emails, receiptEmail: email }); say(r.ok, r.ok ? r.message ?? "Saved." : r.error); })}>Save</Button>
          </div>
        </section>
      )}

      {notice && <div className={cn("text-[13px] font-bold", err ? "text-danger" : "text-teal")}>{notice}</div>}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="lbl">Charges</div>
          <div className="text-[13px] font-bold text-muted">
            {props.summary.month} so far: {formatCents(props.summary.chargedCents)} across {props.summary.charges} charge{props.summary.charges === 1 ? "" : "s"}
            {props.summary.refundedCents > 0 ? ` · ${formatCents(props.summary.refundedCents)} refunded` : ""}
            {props.summary.refundedCents > 0 ? ` · ${formatCents(net)} net` : ""}
          </div>
        </div>

        <div className="hidden grid-cols-[2.2fr_1fr_1fr_0.8fr_0.6fr] items-center border-b border-line border-t-2 py-2.5 md:grid">
          <div className="lbl">Description</div><div className="lbl">Card</div><div className="lbl">Status</div><div className="lbl text-right">Amount</div><div className="lbl text-right">Receipt</div>
        </div>

        <div className="flex flex-col">
          {props.ledger.map((e) => (
            <div key={e.id} className="grid grid-cols-1 gap-y-1 border-b border-hairline py-3.5 md:grid-cols-[2.2fr_1fr_1fr_0.8fr_0.6fr] md:items-center">
              <div className="flex flex-col gap-0.5">
                <div className="text-[15px] font-extrabold">{e.description}</div>
                <div className="text-[13px] font-bold text-muted">
                  {new Date(e.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  {e.detail ? ` · ${e.detail}` : ""}
                </div>
              </div>
              <div className="text-[14px] font-bold text-ink-2">{e.cardLabel ?? "—"}</div>
              <div className={cn("text-[14px] font-extrabold", e.status === "Paid" || e.status === "Refunded" ? "text-ink" : e.status === "Failed" ? "text-danger" : "text-muted")}>{e.status}</div>
              <div className={cn("disp text-[18px] md:text-right", e.amountCents < 0 && "text-teal")}>{e.amountCents < 0 ? `−${formatCents(-e.amountCents)}` : formatCents(e.amountCents)}</div>
              <div className="text-[13px] font-extrabold md:text-right">
                {e.receiptUrl ? <a href={e.receiptUrl} target="_blank" rel="noopener" className="text-coral">View</a> : <span className="text-muted">—</span>}
              </div>
            </div>
          ))}
          {!props.ledger.length && (
            <div className="py-10 text-[14px] font-bold text-muted">No charges yet. Your first label will show up here with a receipt.</div>
          )}
        </div>
      </section>
    </div>
  );
}
