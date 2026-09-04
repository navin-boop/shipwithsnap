// Placeholder shell so the first Vercel deploy is on-brand.
// The real landing page is built from design/Landing.dc.html in phase 1.
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-between border-b-2 border-ink px-16">
        <div className="disp text-2xl uppercase">
          Snap<span className="text-electric">.</span>
        </div>
        <div className="lbl text-ink">Coming soon</div>
      </header>
      <section className="flex flex-1 flex-col justify-center gap-8 px-16 py-24">
        <h1 className="disp max-w-4xl text-[96px] leading-[0.9]">
          The cheapest USPS &amp; UPS rates.
          <br />
          <span className="text-electric">No monthly fee.</span>
        </h1>
        <p className="max-w-xl text-xl leading-relaxed text-ink-2">
          Paste an address, pick a rate, print. Pay postage only.
        </p>
      </section>
      <footer className="flex items-center justify-between px-16 py-8 text-xs text-muted">
        <div>© 2026 Ship with Snap</div>
      </footer>
    </main>
  );
}
