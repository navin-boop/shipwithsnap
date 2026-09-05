import { notFound } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { ArrowIcon, Button, Chip, Input, RateRow } from "@/components/ui";
import { formatCents } from "@/lib/money";

/**
 * Development-only mock of the Ship screen with sample data, used to capture the product
 * screenshots on the landing page (see scripts/screenshots.sh). 404s in production.
 */
export const dynamic = "force-dynamic";

const RATES = [
  { carrier: "USPS", service: "Ground Advantage", eta: "Mon, Sep 7", days: 3, tag: "Cheapest", retail: 1080, price: 568 },
  { carrier: "FedEx", service: "Ground Economy", eta: "Wed, Sep 9", days: 4, retail: null, price: 749 },
  { carrier: "USPS", service: "Priority Mail", eta: "Sat, Sep 5", days: 2, tag: "Fastest", retail: 1195, price: 807 },
  { carrier: "UPS", service: "Ground Saver", eta: "Tue, Sep 8", days: 4, retail: 1132, price: 716 },
  { carrier: "FedEx", service: "Ground", eta: "Tue, Sep 8", days: 3, retail: null, price: 1526 },
];

export default async function DevScreens({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { view = "ship" } = await searchParams;
  const sorted = [...RATES].sort((a, b) => a.price - b.price);
  const selected = sorted[0];

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <AppNav />
      <main className="grid flex-1 grid-cols-[560px_minmax(0,1fr)]">
        <div className="flex flex-col gap-[22px] border-r-2 border-ink px-10 py-7">
          <h1 className="disp text-[40px]">Ship it cheaper.</h1>
          <section className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between"><div className="lbl">Ship to</div><div className="lbl text-electric">Type it in fields instead</div></div>
            <Input aria-label="Recipient name" defaultValue="Maya Chen" readOnly />
            <div className="flex items-end gap-3"><Input aria-label="Address" defaultValue="418 Bergen St, Brooklyn, NY 11217" readOnly className="flex-1" /><Button variant="outline" size="sm">Verify</Button></div>
            <Input aria-label="Recipient email" defaultValue="maya@example.com" readOnly />
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.8px] text-electric">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 8 3 3 7-7" /></svg>
              <span>Verified · Residential · 418 Bergen St, Brooklyn, NY 11217</span>
            </div>
          </section>
          <section className="flex flex-col gap-1.5">
            <div className="lbl">Ship from</div>
            <div className="flex items-center justify-between gap-4 text-sm"><div>Snap Goods · 20 Jay St, Ste 200, Brooklyn, NY 11201</div><div className="lbl text-electric">Change</div></div>
          </section>
          <section className="flex flex-col gap-3">
            <div className="lbl">Package</div>
            <div className="flex gap-2"><Chip selected>Box</Chip><Chip>Poly mailer</Chip><Chip>Flat rate</Chip></div>
            <div className="grid grid-cols-4 gap-4">
              <Input label="Length" unit="in" defaultValue="12" readOnly /><Input label="Width" unit="in" defaultValue="9" readOnly /><Input label="Height" unit="in" defaultValue="4" readOnly />
              <Input label="Weight" unit="lb" defaultValue="1.8" readOnly className="[&_label]:text-electric [&_input]:border-electric" />
            </div>
            <div className="text-xs text-muted">29 oz · Not sure? Round up — carriers re-weigh and bill the difference.</div>
          </section>
          <section className="flex flex-col gap-2.5">
            <div className="lbl">Extras</div>
            <div className="flex gap-2"><Chip>Insure for $100</Chip><Chip>Signature required</Chip></div>
          </section>
        </div>

        {view === "label" ? (
          <div className="flex flex-col gap-6 bg-ink px-8 py-7 text-paper">
            <div className="flex flex-col gap-1.5"><div className="lbl text-lime">Label bought</div><div className="disp text-[44px]">Ready to print.</div></div>
            <div className="grid grid-cols-[300px_minmax(0,1fr)] gap-7">
              <div className="box-border h-[400px] bg-paper p-2">
                <svg viewBox="0 0 288 384" className="h-full w-full bg-surface" xmlns="http://www.w3.org/2000/svg">
                  <text x="16" y="34" fontFamily="Archivo, Arial" fontSize="18" fontWeight="700">USPS GROUND ADVANTAGE™</text>
                  <line x1="16" y1="44" x2="272" y2="44" stroke="#111" strokeWidth="2" />
                  <text x="16" y="70" fontFamily="Archivo, Arial" fontSize="10">SNAP GOODS · 20 JAY ST STE 200 · BROOKLYN NY 11201</text>
                  <text x="16" y="120" fontFamily="Archivo, Arial" fontSize="9">SHIP TO</text>
                  <text x="16" y="142" fontFamily="Archivo, Arial" fontSize="15" fontWeight="700">MAYA CHEN</text>
                  <text x="16" y="160" fontFamily="Archivo, Arial" fontSize="15" fontWeight="700">418 BERGEN ST</text>
                  <text x="16" y="178" fontFamily="Archivo, Arial" fontSize="15" fontWeight="700">BROOKLYN NY 11217-2010</text>
                  <rect x="16" y="230" width="256" height="90" fill="#111" />
                  <rect x="24" y="238" width="240" height="74" fill="url(#bars)" />
                  <defs><pattern id="bars" width="7" height="74" patternUnits="userSpaceOnUse"><rect width="3" height="74" fill="#fff" /></pattern></defs>
                  <text x="16" y="350" fontFamily="Archivo, Arial" fontSize="11" letterSpacing="2">9434 6002 0819 2109 5520 59</text>
                </svg>
              </div>
              <div className="flex flex-col gap-[18px]">
                <div className="flex flex-col gap-2.5 text-sm">
                  {[["Service", "USPS Ground Advantage"], ["Tracking", "9434600208192109552059"], ["Charged", <span key="c" className="disp text-lg text-lime">$5.68</span>], ["Retail would be", <span key="r" className="line-through text-muted-on-ink">$10.80</span>]].map(([k, v], i) => (
                    <div key={i} className="flex items-center justify-between border-b border-ink-2 pb-2"><div className="text-muted-on-ink">{k}</div><div>{v}</div></div>
                  ))}
                </div>
                <div className="flex gap-2.5"><Button variant="onInk">Print</Button><Button variant="onInkOutline">Download</Button></div>
                <p className="text-[13px] leading-[1.5] text-muted-on-ink">Changed your mind? Void it from Shipments within 28 days — the full amount comes back once the carrier approves.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-col">
            <div className="flex items-baseline justify-between px-8 pb-2.5 pt-[22px]"><div className="lbl">{sorted.length} rates · 1.8 lb · sorted by price</div><div className="lbl text-ink">Retail → You pay</div></div>
            <div className="flex flex-col border-t-2 border-ink">
              {sorted.map((r) => (
                <RateRow key={r.carrier + r.service} carrier={r.carrier} service={r.service} eta={r.eta} days={r.days} tag={r.tag} retailCents={r.retail} priceCents={r.price} selected={r === selected} />
              ))}
            </div>
            <div className="mt-auto flex items-center justify-between border-t-2 border-ink px-8 py-[22px]">
              <div className="flex flex-col gap-0.5">
                <div className="lbl">USPS Ground Advantage · you save {formatCents(selected.retail! - selected.price)} vs retail</div>
                <div className="text-[13px] text-muted">Label ready in about 2 seconds · void within 28 days for a full refund</div>
              </div>
              <Button size="lg" icon={<ArrowIcon />}>Buy label — {formatCents(selected.price)}</Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
