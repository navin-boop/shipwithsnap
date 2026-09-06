import Link from "next/link";
import type { ReactNode } from "react";
import { company } from "@/lib/company";

// Shared shell for legal and policy pages: a calm reading column, a jump list,
// and typography tuned for long text rather than for the marketing pages.

export type LegalSection = { id: string; title: string; body: ReactNode };

export function LegalPage({ title, summary, sections, updated }: { title: string; summary: string; sections: LegalSection[]; updated?: string }) {
  return (
    <main className="relative flex flex-col px-6 py-12 sm:px-16 lg:py-16">
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-10">
        <header className="flex flex-col gap-4">
          <Link href="/" className="text-[13px] font-extrabold text-muted hover:text-ink">← Back to {company.brand}</Link>
          <h1 className="disp text-[40px] leading-[1.02] sm:text-[56px]">{title}</h1>
          <p className="max-w-[640px] text-[17px] font-semibold leading-[1.6] text-ink-2">{summary}</p>
          <div className="text-[13px] font-extrabold text-muted">Last updated {updated ?? company.legalUpdated} · {company.legalName}</div>
        </header>

        <nav aria-label="On this page" className="card-quiet flex flex-col gap-3 p-5">
          <div className="lbl">On this page</div>
          <ol className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
            {sections.map((s, i) => (
              <li key={s.id} className="flex gap-2.5 text-[15px] font-bold">
                <span className="text-muted">{i + 1}.</span>
                <a href={`#${s.id}`} className="text-ink-2 hover:text-coral">{s.title}</a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex flex-col gap-9">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="flex scroll-mt-8 flex-col gap-3">
              <h2 className="disp text-[26px] leading-[1.15] sm:text-[30px]">
                <span className="pr-2 text-muted">{i + 1}.</span>{s.title}
              </h2>
              {/* Held to a readable measure — long-form text past ~75 characters a line is hard to track. */}
              <div className="prose-snap flex max-w-[620px] flex-col gap-3.5">{s.body}</div>
            </section>
          ))}
        </div>

        <footer className="flex flex-col gap-2 border-t-2 border-hairline pt-6 text-[15px] font-semibold text-ink-2">
          <p>
            Questions about this page? Email <a href={`mailto:${company.email.legal}`} className="font-extrabold text-coral">{company.email.legal}</a> or use our <Link href="/contact" className="font-extrabold text-coral">contact page</Link>.
          </p>
          <p className="text-[14px] text-muted">This page explains how {company.brand} works. It is not legal advice.</p>
        </footer>
      </div>
    </main>
  );
}

/** Bulleted list with the spacing the reading column expects. */
export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-2 pl-1">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3 text-[16px] font-semibold leading-[1.6] text-ink-2">
          <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-pill bg-coral" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

/** A short definition or key-value row inside a policy. */
export function Term({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-l-2 border-hairline pl-4">
      <div className="text-[15px] font-extrabold text-ink">{term}</div>
      <div className="text-[16px] font-semibold leading-[1.6] text-ink-2">{children}</div>
    </div>
  );
}

/** Pulls a rule out of the flow when readers must not miss it. */
export function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="card-quiet bg-surface p-4 text-[16px] font-semibold leading-[1.6] text-ink-2">{children}</div>
  );
}
