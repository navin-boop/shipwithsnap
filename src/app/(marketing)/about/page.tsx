import type { Metadata } from "next";
import Link from "next/link";
import { ArrowIcon } from "@/components/ui";
import { addressLine, company, hasAddress } from "@/lib/company";

export const metadata: Metadata = {
  title: "About Snap3PL LLC, the company behind Snap",
  description: `${company.brand} is built by ${company.legalName} to give small sellers the same commercial shipping rates that high-volume warehouses have always paid.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main className="relative flex flex-col overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute right-[-140px] top-[100px] hidden h-[400px] w-[400px] rounded-pill bg-yellow/70 lg:block" />

      <section className="relative flex flex-col gap-6 px-6 pb-14 pt-12 sm:px-16 lg:pt-16">
        <div className="lbl">About us</div>
        <h1 className="disp max-w-[860px] text-[44px] leading-[1] sm:text-[60px] xl:text-[68px]">
          Small sellers should pay<br />what big shippers pay.
        </h1>
        <p className="max-w-[640px] text-[18px] font-semibold leading-[1.55] text-ink-2 sm:text-[20px]">
          A warehouse sending fifty thousand parcels a month pays a fraction of what the counter charges. A person sending forty pays full retail. Nothing about the package is different. Only the volume behind it.
        </p>
      </section>

      <section className="relative grid grid-cols-1 gap-8 px-6 pb-16 sm:px-16 lg:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col gap-5 text-[17px] font-semibold leading-[1.65] text-ink-2">
          <p>
            {company.brand} exists to close that gap. We pool the volume of everyone shipping through the platform, which puts commercial rates in reach of an account printing its first label, and then we hand those rates over without taking a cut.
          </p>
          <p>
            That decision shapes the product. There is no plan to upgrade to, so there is no feature we can hold back. Batch shipping, the API, manifests, pickups, claims and reports are on for every account from day one, because a pricing tier would mean charging someone for shipping better.
          </p>
          <p>
            We are not a carrier and we never handle your packages. We are the software layer between you and USPS, UPS, FedEx and DHL: we find the price, buy the label, and follow the parcel until it lands. What we owe you is an honest price, a label that prints, and a straight answer when something goes wrong.
          </p>
        </div>
        <div className="card flex flex-col gap-6 self-start bg-yellow p-8">
          <div className="flex flex-col gap-1.5">
            <div className="lbl text-ink">Company</div>
            <div className="disp text-[26px]">{company.legalName}</div>
          </div>
          <dl className="flex flex-col gap-4 text-[15px] font-semibold text-ink-2">
            <div className="flex flex-col gap-0.5">
              <dt className="text-[13px] font-extrabold text-muted">Product</dt>
              <dd>{company.brand} — {company.domain}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-[13px] font-extrabold text-muted">Founded</dt>
              <dd>{company.founded}</dd>
            </div>
            {hasAddress() && (
              <div className="flex flex-col gap-0.5">
                <dt className="text-[13px] font-extrabold text-muted">Registered office</dt>
                <dd>{addressLine()}</dd>
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              <dt className="text-[13px] font-extrabold text-muted">Support</dt>
              <dd><a href={`mailto:${company.email.support}`} className="font-extrabold text-ink underline underline-offset-2">{company.email.support}</a></dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-[13px] font-extrabold text-muted">Carriers</dt>
              <dd>USPS · UPS · FedEx · DHL</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="relative flex flex-col gap-8 bg-surface px-6 py-16 sm:px-16 lg:py-20">
        <div className="flex flex-col gap-3">
          <div className="lbl">How we work</div>
          <h2 className="disp text-[34px] leading-[1.05] sm:text-[44px]">Four commitments.</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Value title="The price is the price">
            We never mark up postage, and the retail counter price sits next to ours so you can check the claim yourself. If someone beats us, we <Link href="/lowest-price-guarantee" className="font-extrabold text-coral">refund the difference</Link>.
          </Value>
          <Value title="No plan, no gates">
            Every feature is free at every volume. We would rather you ship well than pay us for permission to.
          </Value>
          <Value title="Your data is yours">
            No advertising, no data brokers, no selling addresses. Export or delete it whenever you want — see the <Link href="/legal/privacy" className="font-extrabold text-coral">Privacy Policy</Link>.
          </Value>
          <Value title="Plain answers">
            When a carrier loses a parcel or refuses a refund, we tell you what happened in words you can act on, and we take it up with them on your behalf.
          </Value>
        </div>
      </section>

      <section className="relative px-6 py-16 sm:px-16">
        <div className="card flex flex-col items-start gap-8 bg-coral p-8 text-white sm:p-12 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="disp text-[36px] leading-[1] sm:text-[52px]">Ship your first one<br />in about a minute.</h2>
          <Link href="/signup" className="inline-flex h-16 shrink-0 items-center gap-2.5 rounded-pill border-2 border-ink bg-ink px-9 font-display text-[16px] font-extrabold text-yellow hover:text-yellow">Start free <ArrowIcon /></Link>
        </div>
      </section>
    </main>
  );
}

function Value({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-quiet flex flex-col gap-2 p-6">
      <div className="disp text-[22px]">{title}</div>
      <p className="text-[16px] font-semibold leading-[1.6] text-ink-2">{children}</p>
    </div>
  );
}
