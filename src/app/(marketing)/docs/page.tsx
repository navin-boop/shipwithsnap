import type { Metadata } from "next";

export const metadata: Metadata = { title: "API docs · Ship with Snap" };

type Row = [string, string, string];

const SECTIONS: Array<{ title: string; rows: Row[] }> = [
  {
    title: "Rates and labels",
    rows: [
      ["POST", "/api/v1/rates", "Verify an address, create a shipment, return every rate. Body: { to, from?, parcel | parcels[], insurance_cents?, options?, customs?, is_return? }. Send parcels[] for a multi-box shipment: one rate covers every box. Rates expire in 10 minutes."],
      ["POST", "/api/v1/labels", "Buy a rate: { shipment_id, rate_id }. Requires an Idempotency-Key header — a retry with the same key returns the same label, never a second charge."],
      ["GET", "/api/v1/labels/{id}/file", "The label file (PDF, or ZPL if your account is set to ZPL)."],
      ["POST", "/api/v1/labels/{id}/convert", "Re-render an existing label: { format: pdf_4x6 | pdf_letter | zpl }."],
      ["POST", "/api/v1/labels/{id}/void", "Request a refund. The card refund follows the carrier's approval."],
      ["GET", "/api/v1/shipments?status=&q=", "Your labels, newest first."],
    ],
  },
  {
    title: "Tracking",
    rows: [
      ["GET", "/api/v1/tracking/{tracking_number}", "Canonical status (label_created · accepted · in_transit · out_for_delivery · delivered · exception · returned) and events for a label you bought."],
      ["POST", "/api/v1/trackers", "Track any package, ours or not: { tracking_number, carrier?, nickname? }."],
      ["GET", "/api/v1/trackers", "Every package you're tracking, with its events."],
      ["POST", "/api/v1/delivery-estimates", "How long each service really takes between two ZIPs: { from_zip, to_zip, planned_ship_date? } → per-service delivery date and days-in-transit at the 50th–99th percentile."],
    ],
  },
  {
    title: "Pickups, manifests, claims",
    rows: [
      ["POST", "/api/v1/pickups", "Ask the carriers to collect a package: { label_id, min_datetime, max_datetime, instructions? } → pickup rates."],
      ["POST", "/api/v1/pickups/{id}/buy", "Confirm one of those rates: { carrier, service }."],
      ["POST", "/api/v1/pickups/{id}/cancel", "Call off a scheduled pickup."],
      ["POST", "/api/v1/manifests", "End-of-day manifest (SCAN form) for a stack of labels from one carrier: { label_ids: [...] }."],
      ["GET", "/api/v1/manifests", "Manifests you've built, with a link to each form."],
      ["POST", "/api/v1/claims", "File an insurance claim on an insured label: { label_id, type: damage | loss | theft, amount_cents, description, contact_email, evidence?: [base64] }."],
      ["GET", "/api/v1/claims", "Your claims and where each one stands."],
    ],
  },
  {
    title: "Reference data",
    rows: [["GET", "/api/v1/carriers?carriers=usps,ups", "Every service code and predefined package you can name in a rate request, with weight limits."]],
  },
];

const OPTIONS: Array<[string, string]> = [
  ["signature", "none · signature · adult · indirect"],
  ["saturday_delivery, hold_for_pickup", "Weekend delivery; hold at the carrier's counter"],
  ["label_date", "YYYY-MM-DD, up to a week out"],
  ["print_custom_1, print_custom_2, invoice_number", "Printed on the label"],
  ["hazmat, dry_ice, alcohol, perishable", "Restricted contents — see the carrier's rules"],
  ["special_rates_eligibility", "USPS.MEDIAMAIL · USPS.LIBRARYMAIL"],
  ["certified_mail, registered_mail, return_receipt", "USPS accountable mail"],
  ["endorsement, machinable, additional_handling, carbon_neutral", "Handling and undeliverable-mail instructions"],
];

export default function DocsPage() {
  return (
    <main className="flex flex-col gap-10 px-6 py-12 sm:px-16">
      <div className="flex flex-col gap-4">
        <h1 className="disp text-[44px] leading-[0.95] sm:text-[64px]">API</h1>
        <p className="max-w-[640px] text-lg leading-[1.45] text-ink-2">The same endpoints the app uses. JSON in, JSON out, errors as <code>application/problem+json</code>. Create a key under Settings → API &amp; webhooks and send it as <code>Authorization: Bearer sk_…</code>.</p>
      </div>

      {SECTIONS.map((s) => (
        <div key={s.title} className="flex flex-col gap-3">
          <div className="lbl">{s.title}</div>
          <div className="flex flex-col border-t-2 border-line">
            {s.rows.map(([m, p, d]) => (
              <div key={p + m} className="grid grid-cols-1 gap-2 border-b border-line py-4 md:grid-cols-[80px_320px_1fr] md:gap-4">
                <div className="font-mono text-xs font-semibold">{m}</div>
                <div className="font-mono text-[13px]">{p}</div>
                <div className="text-sm text-ink-2">{d}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-3">
        <div className="lbl">Shipment options</div>
        <p className="max-w-[640px] text-sm leading-[1.55] text-ink-2">Pass any of these inside <code>options</code> on a rate request. They change the price, so they belong on the rate call, not the buy.</p>
        <div className="flex flex-col border-t-2 border-line">
          {OPTIONS.map(([k, v]) => (
            <div key={k} className="grid grid-cols-1 gap-2 border-b border-line py-3 md:grid-cols-[400px_1fr] md:gap-4">
              <div className="font-mono text-[13px]">{k}</div>
              <div className="text-sm text-ink-2">{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="lbl">Example — buy a label</div>
        <pre className="overflow-x-auto bg-ink p-5 text-xs leading-[1.6] text-paper">{`curl -X POST https://shipwithsnap.com/api/v1/rates \\
  -H "Authorization: Bearer sk_test_…" -H "Content-Type: application/json" \\
  -d '{"to":{"name":"Maya Chen","street1":"418 Bergen St","city":"Brooklyn","state":"NY","zip":"11217"},
       "parcel":{"length_in":12,"width_in":9,"height_in":4,"weight_oz":29},
       "insurance_cents":10000,
       "options":{"signature":"adult","print_custom_1":"Order 1042"}}'

curl -X POST https://shipwithsnap.com/api/v1/labels \\
  -H "Authorization: Bearer sk_test_…" -H "Idempotency-Key: order-1042" -H "Content-Type: application/json" \\
  -d '{"shipment_id":"…","rate_id":"…"}'`}</pre>
      </div>

      <div className="flex flex-col gap-3">
        <div className="lbl">Example — international</div>
        <p className="max-w-[640px] text-sm leading-[1.55] text-ink-2">Anything leaving the US needs a <code>customs</code> object. Every item carries a description, quantity, value, weight and country of origin.</p>
        <pre className="overflow-x-auto bg-ink p-5 text-xs leading-[1.6] text-paper">{`{"to":{"name":"Léa Martin","street1":"12 Rue de Rivoli","city":"Paris","state":"Île-de-France","zip":"75004","country":"FR"},
 "parcel":{"length_in":10,"width_in":8,"height_in":3,"weight_oz":20},
 "customs":{"customs_signer":"Sam Ortiz","contents_type":"merchandise",
   "items":[{"description":"Cotton T-shirt","quantity":2,"value_cents":2400,"weight_oz":8,
             "hs_tariff_number":"6109.10","origin_country":"US"}]}}`}</pre>
      </div>

      <div className="flex flex-col gap-3">
        <div className="lbl">Webhooks</div>
        <p className="max-w-[640px] text-sm leading-[1.55] text-ink-2">Add an https endpoint under Settings → API &amp; webhooks. Events: label.created, label.voided, label.refunded, tracking.updated, tracking.delivered, tracking.exception, batch.completed, batch.partial, pickup.scheduled, pickup.canceled, manifest.created, claim.submitted, claim.updated. Each POST carries <code>x-snap-signature: sha256=HMAC-SHA256(body, secret)</code> and is retried up to 8 times over 24 hours.</p>
      </div>
    </main>
  );
}
