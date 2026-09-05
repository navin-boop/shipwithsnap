import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CarrierLogo, Wordmark } from "@/components/ui";
import { cn } from "@/lib/cn";
import { getPublicTracking } from "@/lib/tracking/service";

// Sunny customer tracking page — store-branded, public, no login.
export const dynamic = "force-dynamic";

const STEPS = ["label_created", "in_transit", "out_for_delivery", "delivered"] as const;
const STEP_LABEL: Record<(typeof STEPS)[number], string> = { label_created: "Label created", in_transit: "On its way", out_for_delivery: "Out for delivery", delivered: "Delivered" };

function stepIndex(status: string): number {
  if (status === "delivered") return 3;
  if (status === "out_for_delivery") return 2;
  if (status === "in_transit" || status === "accepted" || status === "exception") return 1;
  return 0;
}

function headline(status: string, est: string | null): { eyebrow: string; title: string; tone: "good" | "bad" | "neutral" } {
  const eta = est ? new Date(est + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }) : null;
  switch (status) {
    case "delivered": return { eyebrow: "Delivered", title: "It's there!", tone: "good" };
    case "out_for_delivery": return { eyebrow: "Out for delivery", title: "Arriving today.", tone: "good" };
    case "exception": return { eyebrow: "Delivery exception", title: "There's a hold-up.", tone: "bad" };
    case "returned": return { eyebrow: "Returned to sender", title: "Heading back.", tone: "bad" };
    case "voided": return { eyebrow: "Cancelled", title: "This label was cancelled.", tone: "neutral" };
    case "in_transit":
    case "accepted": return { eyebrow: "On its way", title: eta ? `Arriving ${eta}.` : "On its way.", tone: "neutral" };
    default: return { eyebrow: "Label created", title: "Getting ready to ship.", tone: "neutral" };
  }
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const t = await getPublicTracking(token);
  return { title: t ? `Tracking · ${t.account.name}` : "Tracking", robots: { index: false } };
}

export default async function TrackingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getPublicTracking(token);
  if (!t) notFound();
  const { label, shipment, account, events, to, order } = t;
  const h = headline(shipment.status, label.estDeliveryDate);
  const idx = stepIndex(shipment.status);
  const hasLogo = !!account.logoData;

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-[900px] flex-col gap-6 overflow-hidden bg-paper px-5 pb-10 sm:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute right-[-160px] top-[-120px] h-[360px] w-[360px] rounded-pill bg-yellow/60" />
      <header className="relative flex h-[72px] items-center justify-between">
        {hasLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/logo/${account.id}`} alt={account.name} className="h-10 w-auto max-w-[200px] object-contain" />
        ) : (
          <div className="disp text-[22px]">{account.name}</div>
        )}
        {order && <div className="rounded-pill border-2 border-ink bg-surface px-3 py-1 text-[13px] font-extrabold">Order {order.number}</div>}
      </header>

      <section className={cn("card relative flex flex-col gap-3 p-6 sm:p-8", h.tone === "good" ? "bg-yellow" : h.tone === "bad" ? "bg-coral text-white" : "bg-surface")}>
        <div className={cn("absolute -top-4 left-6 -rotate-2 rounded-pill border-2 border-ink px-4 py-1.5 text-[13px] font-extrabold", h.tone === "bad" ? "bg-ink text-yellow" : "bg-teal text-white")}>{h.eyebrow}</div>
        <h1 className="disp pt-2 text-[40px] leading-[1] sm:text-[56px]">{h.title}</h1>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-[14px] font-bold">
          <div className="flex items-center gap-2"><CarrierLogo carrier={label.carrier} size={32} inverted={h.tone !== "neutral"} /><span>{label.carrier} {label.serviceName}</span></div>
          <div className={cn(h.tone === "bad" ? "text-white/80" : "text-muted")}>#{label.trackingNumber}</div>
          {to && <div className={cn(h.tone === "bad" ? "text-white/80" : "text-muted")}>To {to.city}, {to.state} {to.zip}</div>}
        </div>
      </section>

      {shipment.status !== "voided" && (
        <section className="grid grid-cols-4 gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-col gap-2">
              <div className={cn("h-3 rounded-pill border-2 border-ink", i < idx ? "bg-teal" : i === idx ? (shipment.status === "exception" ? "bg-coral" : "bg-yellow") : "bg-surface")} />
              <div className={cn("text-[12px] font-extrabold sm:text-[13px]", i <= idx ? "text-ink" : "text-muted")}>{shipment.status === "exception" && i === idx ? "Exception" : STEP_LABEL[s]}</div>
            </div>
          ))}
        </section>
      )}

      <section className="card-quiet flex flex-col p-5 sm:p-6">
        <div className="lbl pb-3">History</div>
        <div className="flex flex-col">
          {events.map((e) => (
            <div key={e.id} className="grid grid-cols-1 gap-1 border-t-2 border-hairline py-3.5 sm:grid-cols-[170px_1fr] sm:gap-6">
              <div className="text-[13px] font-bold text-muted">{e.occurredAt.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
              <div className="flex flex-col gap-0.5">
                <div className="text-[15px] font-extrabold">{e.description}</div>
                {(e.city || e.state) && <div className="text-[13px] font-bold text-muted">{[e.city, e.state, e.zip].filter(Boolean).join(", ")}</div>}
              </div>
            </div>
          ))}
          <div className="grid grid-cols-1 gap-1 border-t-2 border-hairline py-3.5 sm:grid-cols-[170px_1fr] sm:gap-6">
            <div className="text-[13px] font-bold text-muted">{label.purchasedAt.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
            <div className="flex flex-col gap-0.5">
              <div className="text-[15px] font-extrabold">Label created</div>
              <div className="text-[13px] font-bold text-muted">Shipping label printed by {account.name}</div>
            </div>
          </div>
        </div>
      </section>

      {order && order.items.length > 0 && (
        <section className="card-quiet flex flex-col gap-3.5 p-5 sm:p-6">
          <div className="lbl">In this shipment</div>
          {order.items.map((it, i) => (
            <div key={i} className="flex items-center gap-3.5">
              <div className="h-14 w-14 rounded-[12px] bg-hairline" />
              <div className="flex flex-col gap-0.5"><div className="text-[15px] font-extrabold">{it.title}</div><div className="text-[13px] font-bold text-muted">Qty {it.quantity}</div></div>
            </div>
          ))}
        </section>
      )}

      <footer className="mt-auto flex flex-col gap-3 pt-4 text-[13px] font-bold text-muted sm:flex-row sm:items-center sm:justify-between">
        <div>Questions about your order? {account.replyTo ? <a href={`mailto:${account.replyTo}`} className="text-coral">Contact {account.name}</a> : `Contact ${account.name}`}</div>
        <div className="flex items-center gap-2"><span>Shipped with</span><Wordmark className="text-[18px]" href="https://shipwithsnap.com" /></div>
      </footer>
    </div>
  );
}
