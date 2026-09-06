import type { Metadata } from "next";
import Link from "next/link";
import { ArrowIcon } from "@/components/ui";
import { JsonLd, faqSchema } from "@/components/marketing/JsonLd";
import { company } from "@/lib/company";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description: "Straight answers about what Ship with Snap costs, which carriers you get, how refunds and insurance claims work, and what you need to ship internationally.",
  alternates: { canonical: "/faq" },
};

type Q = { q: string; a: string };
type Group = { title: string; items: Q[] };

const GROUPS: Group[] = [
  {
    title: "Cost",
    items: [
      {
        q: "Is Ship with Snap really free?",
        a: "The software is free. There is no monthly fee, no per-label fee, no minimum volume and no paid tier. You pay carrier postage and nothing else, and we do not mark that postage up.",
      },
      {
        q: "How do you make money if the software is free?",
        a: "Carriers price by volume. Thousands of sellers shipping through one platform reach the rates a single large shipper gets, and the platform earns from the carrier relationship rather than from you. Your price is the carrier's commercial rate, passed through untouched.",
      },
      {
        q: "What if I find a cheaper price somewhere else?",
        a: "Send us the evidence within 14 days and we refund the difference. The full terms, including what counts as a like-for-like comparison, are on the Lowest Price Guarantee page.",
      },
      {
        q: "Do I need a credit card to sign up?",
        a: "No. You can create an account, verify addresses and compare rates without a card. A card is only needed at the moment you buy your first label.",
      },
      {
        q: "Why was I charged more than the rate I picked?",
        a: "Almost always a carrier adjustment. Carriers weigh and measure packages after collection, and if yours is heavier or larger than declared they bill the difference. We show you the carrier's own measurement and reason, and we will dispute it for you if it looks wrong.",
      },
    ],
  },
  {
    title: "Carriers and services",
    items: [
      {
        q: "Which carriers can I use?",
        a: "USPS, UPS, FedEx and DHL, for domestic and international shipments. Every service each carrier offers for your package appears in one list, sorted cheapest first.",
      },
      {
        q: "Is the postage the same as at the post office counter?",
        a: "Same carrier, same service, same network, same delivery time. The only difference is the price, because you are buying at commercial rates rather than retail.",
      },
      {
        q: "Can I use my own UPS or FedEx account?",
        a: "Yes. If you have negotiated your own rates, connect the account under Settings, Carriers and rates. Your negotiated prices then appear in the same list alongside ours and you can pick whichever is cheaper.",
      },
      {
        q: "Can I schedule a pickup instead of going to the post office?",
        a: "Yes. Open Pickups, choose the package, a date and a time window, and the carriers quote for collecting it. USPS pickups are usually free; UPS and FedEx charge a few dollars.",
      },
    ],
  },
  {
    title: "Printing and labels",
    items: [
      {
        q: "Do I need a label printer?",
        a: "No. Print on plain letter paper and tape it to the package. If you ship daily, any 4 by 6 inch thermal printer works out of the box, and you can set your default format once under Settings, Printing.",
      },
      {
        q: "Can I void a label I bought by mistake?",
        a: "Yes, as long as the carrier has not scanned it. Void it from Shipments and the full postage comes back to your card once the carrier confirms it went unused, usually within 14 days.",
      },
      {
        q: "Can I print a return label for a customer?",
        a: "Yes. Open the shipment and choose Create return label. It ships from your customer back to you, and you can email it or include it in the box.",
      },
      {
        q: "What is an end-of-day manifest?",
        a: "A single sheet with one barcode covering every package you are handing over. The driver scans the sheet instead of each parcel, which is much faster once you are shipping more than a handful a day.",
      },
    ],
  },
  {
    title: "Insurance and problems",
    items: [
      {
        q: "How do I insure a package?",
        a: "Enter a declared value when you buy the label. The cost is included in the rate you see before you commit, and coverage runs up to 5,000 dollars per package.",
      },
      {
        q: "A package was lost or damaged. What now?",
        a: "If it was insured, file a claim from the shipment. Damage and theft claims need photographs; lost-package claims usually require about 15 days from the last carrier scan. Claims are decided and paid by the carrier or its insurer, and typically resolve in 30 to 60 days.",
      },
      {
        q: "Can I track a package I did not label here?",
        a: "Yes. Paste any tracking number into the Track page and we will follow it, whatever carrier it came from.",
      },
    ],
  },
  {
    title: "International",
    items: [
      {
        q: "Can I ship internationally?",
        a: "Yes. Choose the destination country on the Ship page and a customs declaration opens. Fill in each item with its description, quantity, value, weight and country of origin, and we generate the CN22 or commercial invoice with the label.",
      },
      {
        q: "Who pays customs duties?",
        a: "By default the recipient pays duties and taxes on arrival, which is the DAP incoterm. You can choose DDP to pay them yourself where the carrier supports it. Duties are set by the destination country and are never part of our price.",
      },
    ],
  },
  {
    title: "Orders, teams and the API",
    items: [
      {
        q: "Can I ship my Shopify or Etsy orders?",
        a: "Import them as a CSV today and they appear in Batch, where you can rate every order at once and buy all the labels in a single charge. Direct store connections are in progress.",
      },
      {
        q: "Can my team have their own logins?",
        a: "Yes, and users are free. Invite anyone as an owner, a shipper or a viewer, so warehouse staff can print labels without seeing billing.",
      },
      {
        q: "Is there an API?",
        a: "Yes, and it is the same one the app uses, with no developer plan or extra cost. Rates, labels, tracking, pickups, manifests, claims and webhooks are all available. See the API documentation.",
      },
    ],
  },
];

const ALL = GROUPS.flatMap((g) => g.items);

export default function FaqPage() {
  return (
    <main className="relative flex flex-col overflow-hidden">
      <JsonLd data={faqSchema(ALL)} />
      <div aria-hidden="true" className="pointer-events-none absolute right-[-140px] top-[80px] hidden h-[380px] w-[380px] rounded-pill bg-yellow/70 lg:block" />

      <section className="relative flex flex-col gap-5 px-6 pb-10 pt-12 sm:px-16 lg:pt-16">
        <div className="lbl">Questions</div>
        <h1 className="disp max-w-[820px] text-[44px] leading-[1] sm:text-[60px]">Everything people ask us.</h1>
        <p className="max-w-[620px] text-[18px] font-semibold leading-[1.55] text-ink-2 sm:text-[20px]">
          If your question is not here, email <a href={`mailto:${company.email.support}`} className="font-extrabold text-coral underline underline-offset-2">{company.email.support}</a> and a person will answer within {company.responseTime}.
        </p>
        <nav aria-label="Question topics" className="flex flex-wrap gap-2 pt-2">
          {GROUPS.map((g) => (
            <a key={g.title} href={`#${slug(g.title)}`} className="inline-flex h-10 items-center rounded-pill border-2 border-ink bg-surface px-4 text-[14px] font-extrabold hover:bg-paper">{g.title}</a>
          ))}
        </nav>
      </section>

      <section className="relative flex flex-col gap-12 px-6 pb-16 sm:px-16">
        {GROUPS.map((g) => (
          <div key={g.title} id={slug(g.title)} className="flex scroll-mt-8 flex-col gap-4">
            <h2 className="disp text-[30px] leading-[1.05] sm:text-[36px]">{g.title}</h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {g.items.map((it) => (
                <div key={it.q} className="card-quiet flex flex-col gap-2 p-6">
                  <h3 className="disp text-[19px] leading-[1.25]">{it.q}</h3>
                  <p className="text-[16px] font-semibold leading-[1.6] text-ink-2">{it.a}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="relative px-6 pb-20 sm:px-16">
        <div className="card flex flex-col items-start gap-8 bg-coral p-8 text-white sm:p-12 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="disp text-[36px] leading-[1] sm:text-[52px]">Still deciding?<br />Price a package.</h2>
          <Link href="/rates" className="inline-flex h-16 shrink-0 items-center gap-2.5 rounded-pill border-2 border-ink bg-ink px-9 font-display text-[16px] font-extrabold text-yellow hover:text-yellow">Free rate calculator <ArrowIcon /></Link>
        </div>
      </section>
    </main>
  );
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
