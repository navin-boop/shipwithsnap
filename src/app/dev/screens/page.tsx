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
  { carrier: "USPS", service: "Ground Advantage", eta: "Monday", days: 3, tag: "Cheapest", retail: 1080, price: 568 },
  { carrier: "FedEx", service: "Ground Economy", eta: "Wednesday", days: 4, retail: null, price: 749 },
  { carrier: "USPS", service: "Priority Mail", eta: "Saturday", days: 2, tag: "Fastest", retail: 1195, price: 807 },
  { carrier: "UPS", service: "Ground Saver", eta: "Tuesday", days: 4, retail: 1132, price: 716 },
  { carrier: "FedEx", service: "Ground", eta: "Tuesday", days: 3, retail: null, price: 1526 },
];

export default async function DevScreens({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { view = "ship" } = await searchParams;
  const sorted = [...RATES].sort((a, b) => a.price - b.price);
  const selected = sorted[0];

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <AppNav cardLabel="Visa ·· 4242" />
      <main className="flex flex-1 flex-col gap-4 px-10 pb-8 pt-2">
        <div className="flex flex-col gap-2">
          <h1 className="disp text-[40px]">Let&apos;s ship something.</h1>
          <div className="flex gap-5 text-[14px] font-extrabold">
            <span className="flex items-center gap-2"><span className="flex h-[26px] w-[26px] items-center justify-center rounded-pill border-2 border-teal bg-teal text-[13px] text-white">✓</span>Where to</span>
            <span className="flex items-center gap-2"><span className="flex h-[26px] w-[26px] items-center justify-center rounded-pill border-2 border-teal bg-teal text-[13px] text-white">✓</span>Package</span>
            <span className="flex items-center gap-2"><span className="flex h-[26px] w-[26px] items-center justify-center rounded-pill border-2 border-ink bg-ink text-[13px] text-yellow">3</span>Pick a rate</span>
          </div>
        </div>
        <div className="grid flex-1 grid-cols-[540px_minmax(0,1fr)] gap-6">
          <div className="flex flex-col gap-5">
            <section className="card flex flex-col gap-3.5 p-6">
              <div className="flex items-center justify-between"><div className="lbl">Who&apos;s it for?</div><div className="text-[13px] font-extrabold text-coral">Type it in fields</div></div>
              <Input aria-label="Recipient name" defaultValue="Maya Chen" readOnly />
              <div className="flex items-start gap-3"><Input aria-label="Address" defaultValue="418 Bergen St, Brooklyn, NY 11217" readOnly className="flex-1" /><Button variant="outline" size="lg" className="h-[50px]">Verify</Button></div>
              <Input aria-label="Recipient email" defaultValue="maya@example.com" readOnly />
              <div className="flex items-center gap-2 text-[13px] font-bold text-ink-2"><span className="rounded-pill bg-teal px-3 py-1 text-[12px] font-extrabold text-white">✓ Verified</span><span>Residential · 418 Bergen St, Brooklyn, NY 11217</span></div>
              <div className="border-t-2 border-hairline pt-3 text-[13px] font-bold text-muted">Shipping from <b className="text-ink">Snap Goods, Brooklyn 11201</b> · <span className="font-extrabold text-coral">change</span></div>
            </section>
            <section className="card flex flex-col gap-3.5 p-6">
              <div className="lbl">What&apos;s in the box?</div>
              <div className="flex gap-2"><Chip size="md" selected>Box</Chip><Chip size="md">Poly mailer</Chip><Chip size="md">Flat rate</Chip></div>
              <div className="grid grid-cols-4 gap-3">
                <Input label="Length" unit="in" defaultValue="12" readOnly /><Input label="Width" unit="in" defaultValue="9" readOnly /><Input label="Height" unit="in" defaultValue="4" readOnly />
                <Input label="Weight" unit="lb" defaultValue="1.8" readOnly className="[&_label]:text-coral [&_input]:border-coral [&_input]:bg-coral-soft" />
              </div>
              <div className="text-[13px] font-bold text-muted">29 oz · Not sure? Round up — carriers re-weigh and bill the difference.</div>
              <div className="flex gap-2 border-t-2 border-hairline pt-3"><Chip>+ Insure for $100</Chip><Chip>+ Signature required</Chip></div>
            </section>
          </div>

          {view === "label" ? (
            <div className="card relative flex flex-col gap-6 self-start bg-yellow p-7">
              <div className="absolute -top-4 left-6 -rotate-3 rounded-pill border-2 border-ink bg-coral px-4 py-1.5 text-[13px] font-extrabold text-white">Label bought!</div>
              <div className="disp pt-2 text-[44px]">Ready to print.</div>
              <div className="grid grid-cols-[300px_minmax(0,1fr)] gap-6">
                <div className="box-border h-[400px] rounded-[16px] border-2 border-ink bg-surface p-2">
                  <svg viewBox="0 0 288 384" className="h-full w-full rounded-[10px] bg-surface" xmlns="http://www.w3.org/2000/svg">
                    <text x="16" y="34" fontFamily="Nunito, Arial" fontSize="18" fontWeight="800">USPS GROUND ADVANTAGE™</text>
                    <line x1="16" y1="44" x2="272" y2="44" stroke="#2b2320" strokeWidth="2" />
                    <text x="16" y="70" fontFamily="Nunito, Arial" fontSize="10" fontWeight="700">SNAP GOODS · 20 JAY ST STE 200 · BROOKLYN NY 11201</text>
                    <text x="16" y="120" fontFamily="Nunito, Arial" fontSize="9" fontWeight="700">SHIP TO</text>
                    <text x="16" y="142" fontFamily="Nunito, Arial" fontSize="15" fontWeight="800">MAYA CHEN</text>
                    <text x="16" y="160" fontFamily="Nunito, Arial" fontSize="15" fontWeight="800">418 BERGEN ST</text>
                    <text x="16" y="178" fontFamily="Nunito, Arial" fontSize="15" fontWeight="800">BROOKLYN NY 11217-2010</text>
                    <rect x="16" y="230" width="256" height="90" fill="#2b2320" />
                    <rect x="24" y="238" width="240" height="74" fill="url(#bars)" />
                    <defs><pattern id="bars" width="7" height="74" patternUnits="userSpaceOnUse"><rect width="3" height="74" fill="#fff" /></pattern></defs>
                    <text x="16" y="350" fontFamily="Nunito, Arial" fontSize="11" fontWeight="700" letterSpacing="2">9434 6002 0819 2109 5520 59</text>
                  </svg>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2 text-[15px] font-bold">
                    {[["Service", "USPS Ground Advantage"], ["Tracking", "9434600208192109552059"], ["Charged", <span key="c" className="disp text-[22px]">$5.68</span>], ["At the counter", <span key="r" className="line-through">$10.80</span>]].map(([k, v], i) => (
                      <div key={i} className="flex items-center justify-between border-b-2 border-ink/15 pb-2"><div className="text-ink-2">{k}</div><div>{v}</div></div>
                    ))}
                  </div>
                  <div className="flex gap-2.5"><Button variant="secondary">Print</Button><Button variant="outline">Download</Button></div>
                  <p className="text-[13px] font-bold leading-[1.5] text-ink-2">Changed your mind? Void it from Shipments within 28 days — the full amount comes back once the carrier approves.</p>
                </div>
              </div>
              <Button size="lg" icon={<ArrowIcon />} className="self-start">Ship another</Button>
            </div>
          ) : (
            <div className="flex min-h-0 flex-col gap-3.5">
              <div className="flex items-baseline justify-between px-1"><div className="disp text-[24px]">Pick a rate</div><div className="text-[14px] font-extrabold text-muted">11 options · cheapest first</div></div>
              <div className="flex flex-col gap-3 pt-2">
                {sorted.map((r) => (
                  <RateRow key={r.carrier + r.service} carrier={r.carrier} service={r.service} eta={r.eta} days={r.days} tag={r.tag} retailCents={r.retail} priceCents={r.price} selected={r === selected} />
                ))}
                <div className="self-center py-1 text-[14px] font-extrabold text-coral">Show 6 more</div>
              </div>
              <div className="mt-auto flex items-center justify-between gap-4 pt-3">
                <div className="text-[14px] font-bold text-muted">Charged to Visa ·· 4242 · label ready in seconds · void within 28 days</div>
                <Button size="lg" icon={<ArrowIcon />}>Buy label · {formatCents(selected.price)}</Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
