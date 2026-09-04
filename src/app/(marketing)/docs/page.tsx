import type { Metadata } from "next";

export const metadata: Metadata = { title: "API docs · Ship with Snap" };

const ENDPOINTS: Array<[string, string, string]> = [
  ["POST", "/api/v1/rates", "Verify an address, create a shipment, return every rate. Body: { to, from?, parcel: { length_in, width_in, height_in, weight_oz }, insurance_cents?, signature? }. Rates expire in 10 minutes."],
  ["POST", "/api/v1/labels", "Buy a rate: { shipment_id, rate_id }. Requires an Idempotency-Key header — a retry with the same key returns the same label, never a second charge."],
  ["GET", "/api/v1/labels/{id}/file", "The label file (PDF, or ZPL if your account is set to ZPL)."],
  ["POST", "/api/v1/labels/{id}/void", "Request a refund. The card refund follows the carrier's approval."],
  ["GET", "/api/v1/tracking/{tracking_number}", "Canonical status (label_created · accepted · in_transit · out_for_delivery · delivered · exception · returned) and events."],
  ["GET", "/api/v1/shipments?status=&q=", "Your labels, newest first."],
];

export default function DocsPage() {
  return (
    <main className="flex flex-col gap-10 px-6 py-12 sm:px-16">
      <div className="flex flex-col gap-4">
        <h1 className="disp text-[44px] leading-[0.95] sm:text-[64px]">API</h1>
        <p className="max-w-[640px] text-lg leading-[1.45] text-ink-2">The same endpoints the app uses. JSON in, JSON out, errors as <code>application/problem+json</code>. Create a key under Settings → API &amp; webhooks and send it as <code>Authorization: Bearer sk_…</code>.</p>
      </div>
      <div className="flex flex-col border-t-2 border-ink">
        {ENDPOINTS.map(([m, p, d]) => (
          <div key={p} className="grid grid-cols-1 gap-2 border-b border-ink py-4 md:grid-cols-[80px_320px_1fr] md:gap-4">
            <div className="font-mono text-xs font-semibold">{m}</div>
            <div className="font-mono text-[13px]">{p}</div>
            <div className="text-sm text-ink-2">{d}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <div className="lbl">Example — buy a label</div>
        <pre className="overflow-x-auto bg-ink p-5 text-xs leading-[1.6] text-paper">{`curl -X POST https://shipwithsnap.com/api/v1/rates \\
  -H "Authorization: Bearer sk_test_…" -H "Content-Type: application/json" \\
  -d '{"to":{"name":"Maya Chen","street1":"418 Bergen St","city":"Brooklyn","state":"NY","zip":"11217"},
       "parcel":{"length_in":12,"width_in":9,"height_in":4,"weight_oz":29}}'

curl -X POST https://shipwithsnap.com/api/v1/labels \\
  -H "Authorization: Bearer sk_test_…" -H "Idempotency-Key: order-1042" -H "Content-Type: application/json" \\
  -d '{"shipment_id":"…","rate_id":"…"}'`}</pre>
      </div>
      <div className="flex flex-col gap-3">
        <div className="lbl">Webhooks</div>
        <p className="max-w-[640px] text-sm leading-[1.55] text-ink-2">Add an https endpoint under Settings → API &amp; webhooks. Events: label.created, label.voided, tracking.updated, tracking.delivered, tracking.exception, batch.completed, batch.partial. Each POST carries <code>x-snap-signature: sha256=HMAC-SHA256(body, secret)</code> and is retried up to 8 times over 24 hours.</p>
      </div>
    </main>
  );
}
