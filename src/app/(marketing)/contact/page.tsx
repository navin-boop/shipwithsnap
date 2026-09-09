import type { Metadata } from "next";
import Link from "next/link";
import { addressLine, company, hasAddress } from "@/lib/company";

export const metadata: Metadata = {
  title: "Contact us — support, billing and privacy",
  description: `How to reach ${company.legalName} about ${company.brand} — support, billing, privacy and legal, answered within one business day.`,
  alternates: { canonical: "/contact" },
};

const ROUTES = [
  { label: "Support", email: company.email.support, blurb: "A label that will not print, a rate that looks wrong, a carrier problem, or anything about using the app." },
  { label: "Billing and refunds", email: company.email.billing, blurb: "Charges, receipts, carrier adjustments and voided labels." },
  { label: "Privacy", email: company.email.privacy, blurb: "Access, correction or deletion of personal data, and questions about how we handle it." },
  { label: "Legal", email: company.email.legal, blurb: "Terms, acceptable use, law enforcement requests and anything else for the company's records." },
];

/**
 * Several topics can share one inbox — today they all do. Grouping by address means the page shows
 * one card per real mailbox rather than the same address four times, and splitting them out later
 * needs nothing here but a change in company.ts.
 */
const MAILBOXES = ROUTES.reduce<Array<{ email: string; topics: typeof ROUTES }>>((acc, route) => {
  const existing = acc.find((m) => m.email === route.email);
  if (existing) existing.topics.push(route);
  else acc.push({ email: route.email, topics: [route] });
  return acc;
}, []);

const FAST = [
  ["Include the tracking number", "It lets us pull the carrier's own record of your package straight away."],
  ["Say what you expected", "One line about what should have happened saves a round trip of questions."],
  ["Screenshots help", "Especially for a rate that looked different from the charge."],
];

export default function ContactPage() {
  return (
    <main className="relative flex flex-col overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute right-[-120px] top-[60px] hidden h-[360px] w-[360px] rounded-pill bg-yellow/70 lg:block" />

      <section className="relative flex flex-col gap-5 px-6 pb-12 pt-12 sm:px-16 lg:pt-16">
        <div className="lbl">Contact</div>
        <h1 className="disp max-w-[760px] text-[44px] leading-[1] sm:text-[60px]">Talk to a person.</h1>
        <p className="max-w-[600px] text-[18px] font-semibold leading-[1.55] text-ink-2 sm:text-[20px]">
          We answer within {company.responseTime}, {company.supportHours}. Write in your own words — there is no ticket form to fight.
        </p>
      </section>

      <section className={`relative grid grid-cols-1 gap-6 px-6 pb-16 sm:px-16 ${MAILBOXES.length > 1 ? "md:grid-cols-2" : ""}`}>
        {MAILBOXES.map((box) => (
          <a key={box.email} href={`mailto:${box.email}`} className="card flex flex-col gap-4 p-6 hover:text-ink sm:p-8">
            <div className="flex flex-col gap-1">
              <div className="lbl">{box.topics.length > 1 ? "Email us" : box.topics[0].label}</div>
              <div className="disp text-[26px] text-coral sm:text-[32px]">{box.email}</div>
            </div>
            <div className="flex flex-col gap-3 border-t-2 border-hairline pt-4">
              {box.topics.map((t) => (
                <div key={t.label} className="flex flex-col gap-0.5">
                  <div className="text-[15px] font-extrabold">{t.label}</div>
                  <p className="text-[15px] font-semibold leading-[1.55] text-ink-2">{t.blurb}</p>
                </div>
              ))}
            </div>
          </a>
        ))}
      </section>

      <section className="relative grid grid-cols-1 gap-8 bg-surface px-6 py-14 sm:px-16 lg:grid-cols-[1fr_1fr] lg:py-16">
        <div className="flex flex-col gap-4">
          <h2 className="disp text-[28px] leading-[1.1] sm:text-[34px]">Getting a fast answer</h2>
          <div className="flex flex-col gap-4">
            {FAST.map(([t, d]) => (
              <div key={t} className="flex flex-col gap-0.5">
                <div className="text-[16px] font-extrabold">{t}</div>
                <div className="text-[15px] font-semibold leading-[1.55] text-ink-2">{d}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card-quiet flex flex-col gap-5 self-start p-6">
          <div className="flex flex-col gap-1">
            <div className="lbl">Company</div>
            <div className="text-[17px] font-extrabold">{company.legalName}</div>
            {hasAddress() ? (
              <div className="text-[15px] font-semibold leading-[1.55] text-ink-2">{addressLine()}</div>
            ) : (
              <div className="text-[15px] font-semibold leading-[1.55] text-ink-2">United States</div>
            )}
            {company.phone && <div className="text-[15px] font-semibold text-ink-2">{company.phone}</div>}
          </div>
          <div className="flex flex-col gap-2 border-t-2 border-hairline pt-4 text-[15px] font-semibold text-ink-2">
            <p>Looking for something specific?</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 font-extrabold text-coral">
              <Link href="/faq">Common questions</Link>
              <Link href="/legal/refunds">Refund a label</Link>
              <Link href="/docs">API docs</Link>
              <Link href="/pricing">Pricing</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
