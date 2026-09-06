import type { Metadata } from "next";
import Link from "next/link";
import { Bullets, Callout, LegalPage, Term, type LegalSection } from "@/components/marketing/LegalPage";
import { company } from "@/lib/company";

export const metadata: Metadata = {
  title: "Refunds & Voided Labels",
  description: "How to void an unused shipping label, when the money comes back, and what happens with carrier adjustments and lost packages.",
  alternates: { canonical: "/legal/refunds" },
};

const sections: LegalSection[] = [
  {
    id: "short-version",
    title: "The short version",
    body: (
      <Callout>
        Bought a label you did not use? Void it and you get the full postage back. There is no fee from us for voiding a label, and no limit on how many you void. The carrier has to confirm the label went unused first, which is what makes it take days rather than seconds.
      </Callout>
    ),
  },
  {
    id: "how-to-void",
    title: "How to void a label",
    body: (
      <>
        <p>Open <strong>Shipments</strong>, select the label, and choose <strong>Void &amp; refund</strong>. You can void several at once by selecting them together.</p>
        <p>You can void a label as long as the carrier has not scanned it. Once a carrier scans a package, the label is in use and can no longer be voided.</p>
      </>
    ),
  },
  {
    id: "timing",
    title: "When the money comes back",
    body: (
      <>
        <Term term="USPS">
          Void within 30 days of buying the label. USPS reviews the request and usually approves it within 14 days.
        </Term>
        <Term term="UPS and FedEx">
          Void within 30 days. These carriers typically confirm within 7 to 10 days.
        </Term>
        <p>
          When the carrier approves, the refund goes back to the card that paid for the label. Your bank then takes its own time, usually 5 to 10 business days, before it appears on your statement.
        </p>
        <p>
          A label shows as <em>refund pending</em> from the moment you void it until the carrier decides. We update it automatically; you do not need to chase us.
        </p>
      </>
    ),
  },
  {
    id: "rejected",
    title: "When a refund is refused",
    body: (
      <>
        <p>A carrier can refuse a void request. The usual reasons:</p>
        <Bullets
          items={[
            "The package was already scanned into the carrier's network.",
            "The request came after the carrier's 30-day window.",
            "The label was already refunded.",
          ]}
        />
        <p>
          If a refusal looks wrong to you, email <a href={`mailto:${company.email.billing}`}>{company.email.billing}</a> with the tracking number and we will take it up with the carrier.
        </p>
      </>
    ),
  },
  {
    id: "adjustments",
    title: "Carrier adjustments",
    body: (
      <>
        <p>
          Carriers re-weigh and re-measure packages after they collect them. If your package is heavier or larger than declared, or needed a surcharge that was not selected, the carrier charges the difference and we pass it to your card.
        </p>
        <p>
          Every adjustment shows the carrier&apos;s own reason and its measurements. If you believe the carrier measured wrong, tell us within 30 days and we will dispute it for you. Carrier decisions on adjustments are final once their own dispute window closes.
        </p>
      </>
    ),
  },
  {
    id: "lost-damaged",
    title: "Lost, damaged or stolen packages",
    body: (
      <>
        <p>
          A void refund covers postage on a label you did not use. It does not cover the value of goods a carrier lost or damaged. That is what insurance is for.
        </p>
        <p>
          If you added declared-value coverage when buying the label, file a claim from the shipment. Claims are decided and paid by the carrier or the underwriting insurer, and typically resolve in 30 to 60 days. Damage and theft claims need photographs; lost-package claims usually require a wait of about 15 days from the last carrier scan.
        </p>
        <p>
          Without coverage, you are limited to whatever the carrier&apos;s tariff provides by default, which is usually very little.
        </p>
      </>
    ),
  },
  {
    id: "software",
    title: "Software charges",
    body: (
      <p>
        There are none. {company.brand} has no subscription, no per-label fee and no minimum, so there is nothing to cancel and no software charge to refund. You are only ever charged for postage. See <Link href="/pricing">Pricing</Link>.
      </p>
    ),
  },
  {
    id: "help",
    title: "Getting help with a refund",
    body: (
      <p>
        Email <a href={`mailto:${company.email.billing}`}>{company.email.billing}</a> with the tracking number and what you expected to happen. We reply within {company.responseTime} during {company.supportHours}.
      </p>
    ),
  },
];

export default function RefundsPage() {
  return (
    <LegalPage
      title="Refunds & voided labels"
      summary="Postage on a label you never used comes back in full. Here is exactly how voiding works, how long each carrier takes, and what happens when a carrier adjusts a charge."
      sections={sections}
    />
  );
}
