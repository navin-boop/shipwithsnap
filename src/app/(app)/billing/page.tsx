import type { Metadata } from "next";

export const metadata: Metadata = { title: "Billing · Ship with Snap" };

// Phase 4 (Stripe) builds the Billing screen from design/Wallet.dc.html.
export default function BillingPage() {
  return (
    <main className="flex flex-1 flex-col gap-3 px-6 py-7 sm:px-10">
      <div className="lbl">Billing</div>
      <h1 className="disp text-[40px]">Pay as you go.</h1>
      <p className="max-w-[560px] text-sm text-muted">Card billing arrives with the Stripe integration. Until then labels are bought in test mode and nothing is charged.</p>
    </main>
  );
}
