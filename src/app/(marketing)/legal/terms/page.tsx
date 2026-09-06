import type { Metadata } from "next";
import Link from "next/link";
import { Bullets, Callout, LegalPage, Term, type LegalSection } from "@/components/marketing/LegalPage";
import { addressLine, company, governingLawPhrase, hasAddress } from "@/lib/company";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The agreement between you and ${company.legalName} for using ${company.brand} to compare rates and buy USPS, UPS, FedEx and DHL shipping labels.`,
  alternates: { canonical: "/legal/terms" },
};

const sections: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who you are agreeing with",
    body: (
      <>
        <p>
          {company.brand} is operated by <strong>{company.legalName}</strong>, a United States limited liability company
          {hasAddress() ? ` with its registered office at ${addressLine()}` : ""}. In these Terms, &ldquo;we&rdquo;, &ldquo;us&rdquo; and &ldquo;Snap&rdquo; mean {company.legalName}, and &ldquo;you&rdquo; means the person or business using the service.
        </p>
        <p>
          By creating an account or buying a label, you accept these Terms. If you are agreeing on behalf of a company, you confirm you are authorised to bind it.
        </p>
      </>
    ),
  },
  {
    id: "what-we-do",
    title: "What the service is",
    body: (
      <>
        <p>
          We are a shipping software platform. We show you rates from carriers including USPS, UPS, FedEx and DHL, we buy the label you choose, and we pass the carrier&apos;s tracking back to you.
        </p>
        <Callout>
          <strong>We are not a carrier.</strong> We do not collect, transport, or deliver your packages, and we never take physical custody of them. The carrier you select is the party that performs the shipment, and its own terms and tariff govern how it handles your package.
        </Callout>
      </>
    ),
  },
  {
    id: "account",
    title: "Your account",
    body: (
      <>
        <p>You need an account to buy labels. You agree to:</p>
        <Bullets
          items={[
            "Give accurate information and keep it current.",
            "Keep your password and API keys secret. Anything done with your credentials is treated as done by you.",
            "Be at least 18 years old and legally able to enter a contract.",
            "Tell us promptly at " + company.email.support + " if you believe your account has been used without your permission.",
          ]}
        />
        <p>
          You may invite team members. You remain responsible for what they do in your account, including the labels they buy.
        </p>
      </>
    ),
  },
  {
    id: "pricing",
    title: "Prices, postage and payment",
    body: (
      <>
        <Term term="What you pay">
          The postage price shown on the rate you select, and nothing else. There is no monthly fee, no per-label fee, and no minimum volume. See our <Link href="/lowest-price-guarantee">Lowest Price Guarantee</Link>.
        </Term>
        <Term term="When you pay">
          Your saved card is charged when a label is purchased. Buying a batch produces a single charge for that batch. A receipt is emailed to you for every charge.
        </Term>
        <Term term="Carrier adjustments">
          Carriers weigh and measure packages after collection. If the carrier finds your package heavier or larger than you declared, or that it needed a surcharge you did not select, the carrier bills the difference and we pass that adjustment to your card. We show you every adjustment with the carrier&apos;s own reason.
        </Term>
        <Term term="Taxes and duties">
          Prices exclude any duties, taxes or import fees charged by a destination country. Those are settled between the recipient, the carrier and the relevant customs authority.
        </Term>
        <p>
          Failed payments may pause your ability to buy new labels until the balance is settled.
        </p>
      </>
    ),
  },
  {
    id: "your-shipments",
    title: "What you ship is your responsibility",
    body: (
      <>
        <p>You are responsible for the contents, packaging, labelling and legality of everything you ship. In particular you agree:</p>
        <Bullets
          items={[
            "Not to ship anything the selected carrier prohibits, or anything illegal to send, possess or export.",
            "To declare weight, dimensions and contents accurately.",
            "To complete customs declarations truthfully for international shipments.",
            "To follow the rules for restricted goods — hazardous materials, lithium batteries, alcohol, perishables and dry ice all carry carrier-specific requirements you must meet before shipping.",
          ]}
        />
        <p>
          Our <Link href="/legal/acceptable-use">Acceptable Use Policy</Link> lists what may not be shipped or done through Snap. Breaking it can end your account immediately.
        </p>
      </>
    ),
  },
  {
    id: "labels-refunds",
    title: "Labels, voids and refunds",
    body: (
      <>
        <p>
          An unused label can be voided and refunded, subject to the carrier&apos;s own window and approval. Full detail, including timing, is on our <Link href="/legal/refunds">Refunds &amp; Voided Labels</Link> page.
        </p>
        <p>
          Once a carrier scans a label, it is in use and cannot be voided. Refunds are always subject to the carrier confirming the label went unused.
        </p>
      </>
    ),
  },
  {
    id: "claims",
    title: "Loss, damage and insurance",
    body: (
      <>
        <p>
          Every shipment carries whatever liability the selected carrier&apos;s tariff provides, which is usually limited and often small. You may add declared-value coverage when you buy a label.
        </p>
        <p>
          If an insured package is lost, damaged or stolen, you can file a claim from your shipment. Claims are assessed and paid by the carrier or the underwriting insurer under their terms, not by us. We submit and track the claim on your behalf; we do not decide it and we do not guarantee its outcome.
        </p>
      </>
    ),
  },
  {
    id: "availability",
    title: "Availability and changes",
    body: (
      <>
        <p>
          We aim to keep Snap available at all times, but we depend on carrier systems that go down or slow without warning. We do not promise uninterrupted service and we are not liable for a carrier&apos;s outage.
        </p>
        <p>
          We may change or discontinue features. Where a change materially reduces what you get, we will tell you by email before it takes effect.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    title: "Limits on our liability",
    body: (
      <>
        <p>
          The service is provided &ldquo;as is&rdquo;. To the fullest extent the law allows, we disclaim implied warranties of merchantability, fitness for a particular purpose and non-infringement.
        </p>
        <p>
          We are not liable for indirect, incidental, special or consequential damages, or for lost profits, lost sales or lost goodwill. Our total liability for any claim relating to the service is limited to the greater of the fees you paid us in the three months before the claim, or one hundred US dollars.
        </p>
        <Callout>
          Nothing here limits liability that cannot be limited by law, and nothing here restricts the claim you may bring against a <strong>carrier</strong> for a shipment it lost or damaged.
        </Callout>
      </>
    ),
  },
  {
    id: "termination",
    title: "Ending the agreement",
    body: (
      <>
        <p>
          You can close your account at any time by emailing <a href={`mailto:${company.email.support}`}>{company.email.support}</a>. Charges already incurred remain payable, and labels already bought stay valid.
        </p>
        <p>
          We may suspend or close an account that breaks these Terms or the Acceptable Use Policy, that is used for fraud, or that we are required to close by law or by a carrier.
        </p>
      </>
    ),
  },
  {
    id: "law",
    title: "Governing law and disputes",
    body: (
      <>
        <p>
          These Terms are governed by the laws of {governingLawPhrase()} and the United States, without regard to conflict-of-law rules.
        </p>
        <p>
          Before starting formal proceedings, please write to <a href={`mailto:${company.email.legal}`}>{company.email.legal}</a>. Most disputes are resolved faster that way, and we commit to responding within {company.responseTime}.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to these Terms",
    body: (
      <p>
        We may update these Terms. The date at the top always reflects the latest version. If a change materially affects your rights, we will email account holders before it takes effect. Continuing to use Snap after that date means you accept the updated Terms.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      summary={`The agreement between you and ${company.legalName} when you use ${company.brand} to compare rates and buy shipping labels. Written to be read, not skimmed past.`}
      sections={sections}
    />
  );
}
