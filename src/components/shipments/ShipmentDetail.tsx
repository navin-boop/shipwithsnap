"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, CarrierLogo, RateRow } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/money";
import { convertLabelFormat, buy as buyLabelAction, getReturnRates, type QuoteResult } from "@/lib/ship/actions";
import { emailTracking, voidLabel } from "@/lib/shipments/actions";
import { TRACKER_STATUS_DETAIL_LABELS } from "@/lib/shipping/options";

// One shipment, everything EasyPost knows about it: tracker detail, options, customs, forms,
// and the follow-on actions (reprint in another format, return label, pickup, claim, void).

export type DetailProps = {
  label: {
    id: string; carrier: string; serviceName: string; trackingNumber: string; trackingToken: string; priceCents: number; retailCents: number | null;
    insuredCents: number; format: string; estDeliveryDate: string | null; statusDetail: string | null; signedBy: string | null; carrierWeightOz: number | null;
    purchasedAt: string; voidedAt: string | null; refundStatus: string | null; feesCents: Record<string, number>; forms: Array<{ type: string; url: string }>;
  };
  status: string;
  isReturn: boolean;
  parcel: { lengthIn: number; widthIn: number; heightIn: number; weightOz: number; predefinedPackage?: string };
  options: Record<string, unknown>;
  hasCustoms: boolean;
  to: { name: string | null; company: string | null; street1: string; street2: string | null; city: string; state: string; zip: string; country: string; email: string | null; phone: string | null } | null;
  from: { name: string | null; city: string; state: string; zip: string } | null;
  events: Array<{ id: number; description: string; statusDetail: string | null; city: string | null; state: string | null; zip: string | null; occurredAt: string }>;
  pickups: Array<{ id: string; status: string; carrier: string | null; confirmation: string | null; minDatetime: string }>;
  claims: Array<{ id: string; status: string; type: string; requestedCents: number }>;
  relatedLabels: Array<{ id: string; kind: "return" | "outbound" | "box"; trackingNumber: string; serviceName: string }>;
  orderNumber: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", label_created: "Label bought", accepted: "Accepted by carrier", in_transit: "In transit",
  out_for_delivery: "Out for delivery", delivered: "Delivered", exception: "Exception", returned: "Returned", voided: "Voided",
};

const OPTION_LABEL: Record<string, string> = {
  signature: "Signature", saturdayDelivery: "Saturday delivery", holdForPickup: "Hold for pickup", machinable: "Machinable", additionalHandling: "Additional handling",
  labelDate: "Ship date", printCustom1: "Reference 1", printCustom2: "Reference 2", invoiceNumber: "Invoice", handlingInstructions: "Handling", contentDescription: "Contents",
  endorsement: "Endorsement", hazmat: "Hazmat", dryIce: "Dry ice", dryIceWeightOz: "Dry ice weight", alcohol: "Alcohol", perishable: "Perishable",
  certifiedMail: "Certified Mail", registeredMail: "Registered Mail", returnReceipt: "Return receipt", specialRatesEligibility: "Special rate", carbonNeutral: "Carbon neutral",
  carrierNotificationEmail: "Carrier emails", carrierNotificationSms: "Carrier texts",
};

const FORMATS: Array<[string, string]> = [["pdf_4x6", "4 × 6 PDF"], ["pdf_letter", "Letter PDF"], ["zpl", "ZPL"]];

export function ShipmentDetail(props: DetailProps) {
  const router = useRouter();
  const { label, to, from } = props;
  const [notice, setNotice] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [pending, start] = useTransition();
  const [fileUrl, setFileUrl] = useState(`/api/labels/${label.id}/file`);
  const [format, setFormat] = useState(label.format);
  const [returnQuote, setReturnQuote] = useState<Extract<QuoteResult, { ok: true }>["quote"] | null>(null);
  const [returnRateId, setReturnRateId] = useState<string | null>(null);
  const [returnLabel, setReturnLabel] = useState<{ id: string; trackingNumber: string; fileUrl: string } | null>(null);

  const voided = !!label.voidedAt;
  const canVoid = !voided && ["label_created", "draft", "accepted"].includes(props.status);
  const say = (ok: boolean, text: string) => { setErr(!ok); setNotice(text); };

  const activeOptions = Object.entries(props.options).filter(([, v]) => v !== undefined && v !== "" && v !== false && v !== "none");

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-7 sm:px-10">
      <div className="flex flex-wrap items-center gap-3 text-[13px] font-extrabold text-muted">
        <Link href="/shipments" className="hover:text-ink">← All shipments</Link>
        {props.orderNumber && <span>Order {props.orderNumber}</span>}
        {props.isReturn && <span className="rounded-pill border-2 border-ink bg-surface px-3 py-1 text-ink">Return label</span>}
      </div>

      <section className={cn("card flex flex-col gap-4 p-6 sm:p-7", props.status === "delivered" ? "bg-yellow" : voided ? "bg-surface" : "bg-surface")}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <CarrierLogo carrier={label.carrier} size={52} />
            <div className="flex flex-col gap-1">
              <div className="disp text-[32px] sm:text-[40px]">{STATUS_LABEL[props.status] ?? props.status}</div>
              <div className="text-[14px] font-bold text-ink-2">
                {label.carrier} {label.serviceName} · <Link href={`/t/${label.trackingToken}`} target="_blank" className="text-coral">{label.trackingNumber}</Link>
              </div>
              {label.statusDetail && <div className="text-[13px] font-bold text-muted">{TRACKER_STATUS_DETAIL_LABELS[label.statusDetail] ?? label.statusDetail}</div>}
              {label.signedBy && <div className="text-[13px] font-bold text-muted">Signed for by {label.signedBy}</div>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="disp text-[32px]">{formatCents(label.priceCents)}</div>
            {label.retailCents !== null && <div className="text-[13px] font-bold text-muted line-through">{formatCents(label.retailCents)} at the counter</div>}
            {voided && <div className="text-[13px] font-extrabold text-danger">Voided · refund {label.refundStatus ?? "pending"}</div>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5 border-t-2 border-hairline pt-4">
          <Button variant="secondary" size="sm" disabled={voided} onClick={() => window.open(fileUrl, "_blank", "noopener")}>Print label</Button>
          {FORMATS.filter(([f]) => f !== format).map(([f, l]) => (
            <Button key={f} variant="outline" size="sm" disabled={voided || pending} onClick={() => start(async () => {
              const r = await convertLabelFormat(label.id, f as "pdf_4x6" | "pdf_letter" | "zpl");
              if (r.ok) { setFormat(f); setFileUrl(`${r.label.fileUrl}?v=${Date.now()}`); say(true, `Re-rendered as ${l}.`); }
              else say(false, /convert/i.test(r.error) ? `${r.error} Carriers only allow a conversion in some cases — pick your format under Settings → Printing before you buy.` : r.error);
            })}>Reprint as {l}</Button>
          ))}
          <Button variant="outline" size="sm" disabled={!to?.email || pending} onClick={() => start(async () => { const r = await emailTracking(label.id); say(r.ok, r.ok ? r.message ?? "Sent." : r.error); })}>Email tracking</Button>
          {!props.isReturn && !voided && (
            <Button variant="outline" size="sm" disabled={pending || !!returnLabel} onClick={() => start(async () => {
              const r = await getReturnRates(label.id);
              if (r.ok) { setReturnQuote(r.quote); setReturnRateId(r.quote.rates[0]?.id ?? null); } else say(false, r.error);
            })}>Create return label</Button>
          )}
          <Link href={`/pickups?label=${label.id}`} className="inline-flex h-10 items-center rounded-pill border-2 border-ink bg-surface px-4 text-[14px] font-extrabold">Schedule a pickup</Link>
          {label.insuredCents > 0 && <Link href={`/claims?label=${label.id}`} className="inline-flex h-10 items-center rounded-pill border-2 border-ink bg-surface px-4 text-[14px] font-extrabold">File a claim</Link>}
          {canVoid && (
            <Button variant="outline" size="sm" disabled={pending} onClick={() => confirm("Void this label? The refund follows once the carrier approves.") && start(async () => {
              const r = await voidLabel(label.id);
              say(r.ok, r.ok ? r.message ?? "Voided." : r.error);
              if (r.ok) router.refresh();
            })}>Void &amp; refund</Button>
          )}
        </div>
        {notice && <div className={cn("text-[13px] font-bold", err ? "text-danger" : "text-teal")}>{notice}</div>}
      </section>

      {returnQuote && !returnLabel && (
        <section className="card flex flex-col gap-3 p-5 sm:p-6">
          <div className="lbl">Return label — {to?.name ?? "the recipient"} ships it back to {from?.city ?? "you"}</div>
          <div role="listbox" aria-label="Return rates" className="flex flex-col gap-3 pt-2">
            {returnQuote.rates.slice(0, 4).map((r) => (
              <RateRow key={r.id} carrier={r.carrier} service={r.serviceName} eta={r.estDeliveryDate ? new Date(r.estDeliveryDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" }) : "—"} days={r.estDays ?? 0} retailCents={r.retailCents} priceCents={r.priceCents} selected={returnRateId === r.id} onSelect={() => setReturnRateId(r.id)} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="md" disabled={!returnRateId || pending} onClick={() => start(async () => {
              const r = await buyLabelAction({ shipmentId: returnQuote.shipmentId, rateQuoteId: returnRateId!, idempotencyKey: crypto.randomUUID() });
              if (r.ok) { setReturnLabel({ id: r.label.id, trackingNumber: r.label.trackingNumber, fileUrl: r.label.fileUrl }); say(true, "Return label bought."); router.refresh(); } else say(false, r.error);
            })}>{pending ? "Buying…" : "Buy return label"}</Button>
            <button type="button" className="text-[13px] font-extrabold text-muted" onClick={() => setReturnQuote(null)}>Cancel</button>
            <span className="text-[13px] font-bold text-muted">You&apos;re charged now; void it if it goes unused.</span>
          </div>
        </section>
      )}

      {returnLabel && (
        <section className="card flex flex-wrap items-center gap-4 bg-yellow p-5">
          <div className="flex flex-col"><div className="disp text-[22px]">Return label ready</div><div className="text-[13px] font-bold text-ink-2">{returnLabel.trackingNumber}</div></div>
          <Button variant="secondary" size="sm" onClick={() => window.open(returnLabel.fileUrl, "_blank", "noopener")}>Print</Button>
          <Link href={`/shipments/${returnLabel.id}`} className="text-[13px] font-extrabold text-ink">Open it</Link>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="card-quiet flex flex-col p-5 sm:p-6">
          <div className="lbl pb-3">Tracking history</div>
          {props.events.length === 0 && <div className="py-3 text-[14px] font-bold text-muted">No carrier scans yet. The first one usually shows up within a day of drop-off.</div>}
          {props.events.map((e) => (
            <div key={e.id} className="grid grid-cols-1 gap-1 border-t-2 border-hairline py-3.5 sm:grid-cols-[190px_1fr] sm:gap-6">
              <div className="text-[13px] font-bold text-muted">{new Date(e.occurredAt).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
              <div className="flex flex-col gap-0.5">
                <div className="text-[15px] font-extrabold">{e.description}</div>
                <div className="text-[13px] font-bold text-muted">{[[e.city, e.state, e.zip].filter(Boolean).join(", "), e.statusDetail ? TRACKER_STATUS_DETAIL_LABELS[e.statusDetail] ?? e.statusDetail : ""].filter(Boolean).join(" · ")}</div>
              </div>
            </div>
          ))}
          <div className="grid grid-cols-1 gap-1 border-t-2 border-hairline py-3.5 sm:grid-cols-[190px_1fr] sm:gap-6">
            <div className="text-[13px] font-bold text-muted">{new Date(label.purchasedAt).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
            <div className="text-[15px] font-extrabold">Label bought</div>
          </div>
        </section>

        <div className="flex flex-col gap-6">
          <section className="card-quiet flex flex-col gap-3 p-5">
            <div className="lbl">Package</div>
            <Field k="Size" v={props.parcel.predefinedPackage ? props.parcel.predefinedPackage.replace(/([a-z])([A-Z])/g, "$1 $2") : `${props.parcel.lengthIn} × ${props.parcel.widthIn} × ${props.parcel.heightIn} in`} />
            <Field k="Weight" v={`${props.parcel.weightOz} oz${label.carrierWeightOz ? ` · carrier weighed ${label.carrierWeightOz} oz` : ""}`} />
            {label.insuredCents > 0 && <Field k="Insured for" v={formatCents(label.insuredCents)} />}
            {label.estDeliveryDate && <Field k="Expected" v={new Date(label.estDeliveryDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} />}
            {Object.entries(label.feesCents).map(([k, v]) => <Field key={k} k={k.replace(/_/g, " ")} v={formatCents(v)} />)}
          </section>

          {activeOptions.length > 0 && (
            <section className="card-quiet flex flex-col gap-3 p-5">
              <div className="lbl">Options</div>
              {activeOptions.map(([k, v]) => <Field key={k} k={OPTION_LABEL[k] ?? k} v={typeof v === "boolean" ? "Yes" : String(v)} />)}
            </section>
          )}

          {props.hasCustoms && (
            <section className="card-quiet flex flex-col gap-3 p-5">
              <div className="lbl">Customs</div>
              <div className="text-[14px] font-bold text-ink-2">A declaration was filed with this shipment.</div>
              {label.forms.map((f) => <a key={f.type} href={f.url} target="_blank" rel="noopener" className="text-[13px] font-extrabold text-coral">{f.type.replace(/_/g, " ")} →</a>)}
            </section>
          )}

          <section className="card-quiet flex flex-col gap-3 p-5">
            <div className="lbl">Addresses</div>
            {to && <div className="flex flex-col text-[14px] font-bold"><span className="text-muted">To</span><span>{to.name ?? to.company}</span><span className="text-ink-2">{to.street1}{to.street2 ? `, ${to.street2}` : ""}</span><span className="text-ink-2">{to.city}, {to.state} {to.zip} {to.country !== "US" ? to.country : ""}</span>{to.email && <span className="text-muted">{to.email}</span>}{to.phone && <span className="text-muted">{to.phone}</span>}</div>}
            {from && <div className="flex flex-col border-t-2 border-hairline pt-3 text-[14px] font-bold"><span className="text-muted">From</span><span>{from.name}</span><span className="text-ink-2">{from.city}, {from.state} {from.zip}</span></div>}
          </section>

          {(props.pickups.length > 0 || props.claims.length > 0 || props.relatedLabels.length > 0) && (
            <section className="card-quiet flex flex-col gap-3 p-5">
              <div className="lbl">Related</div>
              {props.relatedLabels.map((r) => (
                <Link key={r.id} href={`/shipments/${r.id}`} className="text-[14px] font-extrabold text-coral">
                  {r.kind === "return" ? "Return label" : r.kind === "outbound" ? "Outbound label" : "Another box"} · {r.trackingNumber}
                </Link>
              ))}
              {props.pickups.map((p) => <Link key={p.id} href="/pickups" className="text-[14px] font-bold text-ink-2">Pickup {p.status}{p.confirmation ? ` · ${p.confirmation}` : ""} on {new Date(p.minDatetime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</Link>)}
              {props.claims.map((c) => <Link key={c.id} href="/claims" className="text-[14px] font-bold text-ink-2">Claim ({c.type}) {formatCents(c.requestedCents)} · {c.status.replace(/_/g, " ")}</Link>)}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-[14px] font-bold">
      <span className="text-muted capitalize">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}
