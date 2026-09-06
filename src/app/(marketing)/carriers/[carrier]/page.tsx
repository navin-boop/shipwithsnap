import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowIcon, CarrierLogo } from "@/components/ui";
import { JsonLd, breadcrumbSchema, faqSchema } from "@/components/marketing/JsonLd";
import { CARRIERS, getCarrier } from "@/lib/carriers-content";

export function generateStaticParams() {
  return CARRIERS.map((c) => ({ carrier: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ carrier: string }> }): Promise<Metadata> {
  const { carrier } = await params;
  const c = getCarrier(carrier);
  if (!c) return { title: "Carrier not found" };
  return {
    title: c.title,
    description: c.metaDescription,
    alternates: { canonical: `/carriers/${c.slug}` },
  };
}

export default async function CarrierPage({ params }: { params: Promise<{ carrier: string }> }) {
  const { carrier } = await params;
  const c = getCarrier(carrier);
  if (!c) notFound();

  return (
    <main className="relative flex flex-col overflow-hidden">
      <JsonLd
        data={[
          faqSchema(c.faqs),
          breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Carriers", path: "/carriers" }, { name: c.name, path: `/carriers/${c.slug}` }]),
        ]}
      />
      <div aria-hidden="true" className="pointer-events-none absolute right-[-140px] top-[80px] hidden h-[380px] w-[380px] rounded-pill bg-yellow/70 lg:block" />

      <section className="relative flex flex-col gap-5 px-6 pb-12 pt-10 sm:px-16 lg:pt-14">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[13px] font-extrabold text-muted">
          <Link href="/carriers" className="hover:text-ink">Carriers</Link>
          <span aria-hidden="true">/</span>
          <span className="text-ink">{c.name}</span>
        </nav>
        <div className="flex items-center gap-4">
          <CarrierLogo carrier={c.name} size={56} />
          <h1 className="disp max-w-[820px] text-[38px] leading-[1.02] sm:text-[52px]">{c.title}</h1>
        </div>
        <p className="max-w-[660px] text-[18px] font-semibold leading-[1.55] text-ink-2 sm:text-[20px]">{c.intro}</p>
        <div className="flex flex-col items-start gap-4 pt-1 sm:flex-row sm:items-center">
          <Link href="/rates" className="inline-flex h-[54px] items-center gap-2.5 rounded-pill border-2 border-ink bg-coral px-6 font-display text-[15px] font-extrabold text-white offset-shadow hover:text-white">
            Price a {c.name} label <ArrowIcon />
          </Link>
          <div className="text-[14px] font-extrabold text-muted">Free · no account needed</div>
        </div>
      </section>

      <section className="relative flex flex-col gap-6 px-6 pb-16 sm:px-16">
        <h2 className="disp text-[30px] leading-[1.05] sm:text-[38px]">{c.name} services</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-ink">
                <th className="lbl pb-2.5 pr-4">Service</th>
                <th className="lbl pb-2.5 pr-4">Typical speed</th>
                <th className="lbl pb-2.5 pr-4">Max weight</th>
                <th className="lbl pb-2.5">Best for</th>
              </tr>
            </thead>
            <tbody>
              {c.services.map((s) => (
                <tr key={s.name} className="border-b border-hairline align-top">
                  <td className="py-3.5 pr-4 text-[16px] font-extrabold">{s.name}</td>
                  <td className="py-3.5 pr-4 text-[15px] font-semibold text-ink-2">{s.speed}</td>
                  <td className="py-3.5 pr-4 text-[15px] font-semibold text-ink-2">{s.maxWeight}</td>
                  <td className="py-3.5 text-[15px] font-semibold leading-[1.55] text-ink-2">{s.best}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[14px] font-semibold text-muted">
          Speeds are the carrier&apos;s own published estimates and are not guaranteed unless the service says so. Prices depend on weight, dimensions and zone — <Link href="/rates" className="font-extrabold text-coral">check yours</Link>.
        </p>
      </section>

      <section className="relative grid grid-cols-1 gap-8 bg-surface px-6 py-16 sm:px-16 lg:grid-cols-2 lg:py-20">
        <div className="flex flex-col gap-4">
          <h2 className="disp text-[28px] leading-[1.08] sm:text-[34px]">Where {c.name} is strong</h2>
          <ul className="flex flex-col gap-3">
            {c.strengths.map((s) => (
              <li key={s} className="flex gap-3 text-[16px] font-semibold leading-[1.6] text-ink-2">
                <span aria-hidden="true" className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-pill border-2 border-teal bg-teal text-white">
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m3 8 3 3 7-7" /></svg>
                </span>
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-4">
          <h2 className="disp text-[28px] leading-[1.08] sm:text-[34px]">What to watch for</h2>
          <ul className="flex flex-col gap-3">
            {c.watchOut.map((s) => (
              <li key={s} className="flex gap-3 text-[16px] font-semibold leading-[1.6] text-ink-2">
                <span aria-hidden="true" className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-pill border-2 border-ink text-ink">
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M8 3v6M8 12v.5" /></svg>
                </span>
                {s}
              </li>
            ))}
          </ul>
          <div className="card-quiet mt-2 p-5 text-[15px] font-semibold leading-[1.6] text-ink-2">
            <strong className="font-extrabold text-ink">Packaging. </strong>{c.packaging}
          </div>
        </div>
      </section>

      <section className="relative flex flex-col gap-6 px-6 py-16 sm:px-16">
        <h2 className="disp text-[30px] leading-[1.05] sm:text-[38px]">{c.name} questions</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {c.faqs.map((f) => (
            <div key={f.q} className="card-quiet flex flex-col gap-2 p-6">
              <h3 className="disp text-[19px] leading-[1.25]">{f.q}</h3>
              <p className="text-[16px] font-semibold leading-[1.6] text-ink-2">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative flex flex-col gap-4 px-6 pb-8 sm:px-16">
        <div className="lbl">Other carriers</div>
        <div className="flex flex-wrap gap-3">
          {CARRIERS.filter((x) => x.slug !== c.slug).map((x) => (
            <Link key={x.slug} href={`/carriers/${x.slug}`} className="inline-flex items-center gap-2.5 rounded-pill border-2 border-ink bg-surface px-4 py-2.5 text-[14px] font-extrabold hover:bg-paper">
              <CarrierLogo carrier={x.name} size={22} />{x.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="relative px-6 pb-20 sm:px-16">
        <div className="card flex flex-col items-start gap-8 bg-coral p-8 text-white sm:p-12 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="disp text-[34px] leading-[1] sm:text-[48px]">See your {c.name} price<br />next to everyone else&apos;s.</h2>
          <Link href="/signup" className="inline-flex h-16 shrink-0 items-center gap-2.5 rounded-pill border-2 border-ink bg-ink px-9 font-display text-[16px] font-extrabold text-yellow hover:text-yellow">Start free <ArrowIcon /></Link>
        </div>
      </section>
    </main>
  );
}
