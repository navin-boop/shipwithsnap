import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Wordmark } from "@/components/ui";
import { cn } from "@/lib/cn";
import { getPublicTracking } from "@/lib/tracking/service";

// Spec: design/Tracking.dc.html — store-branded, public, no login.
export const dynamic = "force-dynamic";

const STEPS = ["label_created", "in_transit", "out_for_delivery", "delivered"] as const;
const STEP_LABEL: Record<(typeof STEPS)[number], string> = { label_created: "Label created", in_transit: "In transit", out_for_delivery: "Out for delivery", delivered: "Delivered" };

function stepIndex(status: string): number {
  if (status === "delivered") return 3;
  if (status === "out_for_delivery") return 2;
  if (status === "in_transit" || status === "accepted" || status === "exception") return 1;
  return 0;
}

function headline(status: string, est: string | null): { eyebrow: string; title: string; tone: "lime" | "danger" | "paper" } {
  const eta = est ? new Date(est + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }) : null;
  switch (status) {
    case "delivered":
      return { eyebrow: "Delivered", title: "It's there.", tone: "lime" };
    case "out_for_delivery":
      return { eyebrow: "Out for delivery", title: "Arriving today.", tone: "lime" };
    case "exception":
      return { eyebrow: "Delivery exception", title: "There's a hold-up.", tone: "danger" };
    case "returned":
      return { eyebrow: "Returned to sender", title: "Heading back.", tone: "danger" };
    case "voided":
      return { eyebrow: "Cancelled", title: "This label was cancelled.", tone: "paper" };
    case "in_transit":
    case "accepted":
      return { eyebrow: "In transit", title: eta ? `Arriving ${eta}.` : "On its way.", tone: "paper" };
    default:
      return { eyebrow: "Label created", title: "Getting ready to ship.", tone: "paper" };
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

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[900px] flex-col bg-paper">
      <header className="box-border flex h-16 items-center justify-between border-b-2 border-ink px-6 sm:px-12">
        <div className="disp text-xl">{account.name}</div>
        {order && <div className="lbl">Order {order.number}</div>}
      </header>

      <section className="flex flex-col gap-2.5 bg-ink px-6 pb-9 pt-12 text-paper sm:px-12">
        <div className={cn("lbl", h.tone === "lime" ? "text-lime" : h.tone === "danger" ? "text-[#ff8a80]" : "text-muted-on-ink")}>{h.eyebrow}</div>
        <h1 className="disp text-[40px] leading-[0.92] sm:text-[56px]">{h.title}</h1>
        <div className="mt-4 flex flex-wrap gap-8 text-[13px] text-muted-on-ink">
          <div className="flex flex-col gap-0.5"><div className="lbl text-muted">Carrier</div><div className="text-paper">{label.carrier} {label.serviceName}</div></div>
          <div className="flex flex-col gap-0.5"><div className="lbl text-muted">Tracking</div><div className="tracking-[0.4px] text-paper">{label.trackingNumber}</div></div>
          {to && <div className="flex flex-col gap-0.5"><div className="lbl text-muted">Going to</div><div className="text-paper">{to.city}, {to.state} {to.zip}</div></div>}
        </div>
      </section>

      {shipment.status !== "voided" && (
        <section className="px-6 pt-6 sm:px-12">
          <div className="grid grid-cols-4 gap-1">
            {STEPS.map((s, i) => (
              <div key={s} className={cn("h-1.5", i < idx ? "bg-ink" : i === idx ? (shipment.status === "exception" ? "bg-danger" : "bg-electric") : "bg-hairline")} />
            ))}
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1">
            {STEPS.map((s, i) => (
              <div key={s} className={cn("lbl", i < idx ? "text-ink" : i === idx ? (shipment.status === "exception" ? "text-danger" : "text-electric") : "")}>
                {shipment.status === "exception" && i === idx ? "Exception" : STEP_LABEL[s]}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col px-6 pt-8 sm:px-12">
        <div className="lbl pb-3">History</div>
        <div className="flex flex-col border-t-2 border-ink">
          {events.map((e) => (
            <div key={e.id} className="grid grid-cols-[130px_1fr] items-baseline gap-6 border-b border-ink py-3.5 sm:grid-cols-[150px_1fr]">
              <div className="text-[13px] text-ink-2">{e.occurredAt.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
              <div className="flex flex-col gap-0.5">
                <div className="text-[15px] font-semibold">{e.description}</div>
                {(e.city || e.state) && <div className="text-[13px] text-muted">{[e.city, e.state, e.zip].filter(Boolean).join(", ")}</div>}
              </div>
            </div>
          ))}
          <div className="grid grid-cols-[130px_1fr] items-baseline gap-6 border-b border-ink py-3.5 sm:grid-cols-[150px_1fr]">
            <div className="text-[13px] text-ink-2">{label.purchasedAt.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
            <div className="flex flex-col gap-0.5">
              <div className="text-[15px] font-semibold">Label created</div>
              <div className="text-[13px] text-muted">Shipping label printed by {account.name}</div>
            </div>
          </div>
        </div>
      </section>

      {order && order.items.length > 0 && (
        <section className="flex flex-col gap-3.5 px-6 py-8 sm:px-12">
          <div className="lbl">In this shipment</div>
          {order.items.map((it, i) => (
            <div key={i} className="flex items-center gap-3.5">
              <div className="h-14 w-14 bg-hairline" />
              <div className="flex flex-col gap-0.5"><div className="text-[15px] font-semibold">{it.title}</div><div className="text-[13px] text-muted">Qty {it.quantity}</div></div>
            </div>
          ))}
        </section>
      )}

      <footer className="mt-auto flex flex-col gap-3 border-t-2 border-ink px-6 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-12">
        <div>Questions about your order? {account.replyTo ? <a href={`mailto:${account.replyTo}`}>Contact {account.name}</a> : `Contact ${account.name}`}</div>
        <div className="flex items-center gap-2"><span className="font-semibold uppercase tracking-[0.8px]">Shipped with</span><Wordmark className="text-base" href="https://shipwithsnap.com" /></div>
      </footer>
    </div>
  );
}
