import type { Metadata } from "next";
import Link from "next/link";
import { Bullets, Callout, LegalPage, Term, type LegalSection } from "@/components/marketing/LegalPage";
import { addressLine, company, hasAddress } from "@/lib/company";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `What ${company.legalName} collects when you ship with ${company.brand}, why we need it, which carriers and processors receive it, and how to get it deleted.`,
  alternates: { canonical: "/legal/privacy" },
};

const sections: LegalSection[] = [
  {
    id: "scope",
    title: "Who this covers",
    body: (
      <>
        <p>
          This policy explains how <strong>{company.legalName}</strong> handles personal information on {company.domain} and in the {company.brand} application. We are the controller of that information.
        </p>
        <p>
          It covers two groups of people: the sellers who hold accounts with us, and the recipients whose addresses those sellers enter in order to send them a package.
        </p>
      </>
    ),
  },
  {
    id: "what-we-collect",
    title: "What we collect",
    body: (
      <>
        <Term term="Account information">
          Your name, email address, business name, password (stored only as a cryptographic hash), and role. If you sign in with Google, we receive your Google account identifier, name and email.
        </Term>
        <Term term="Shipping information">
          The addresses you ship from and to, including recipient name, street address, and where you provide them, email address and phone number. Package dimensions, weight and contents descriptions. Customs declarations for international shipments.
        </Term>
        <Term term="Payment information">
          Our payment processor handles card details. We never see or store your full card number — we keep only the last four digits, the card brand, and the processor&apos;s token so we can charge the card you saved.
        </Term>
        <Term term="Usage information">
          Log data such as IP address, browser type, pages viewed and timestamps, used to keep the service secure and working.
        </Term>
        <Callout>
          We do not sell personal information, and we do not share it with advertisers or data brokers.
        </Callout>
      </>
    ),
  },
  {
    id: "why",
    title: "Why we use it",
    body: (
      <>
        <Bullets
          items={[
            "To buy the labels you ask for. Carriers require the sender and recipient address to print a label — this is the core of the service.",
            "To verify addresses so packages arrive and you are not charged a carrier correction fee.",
            "To charge your card for postage and to send you receipts.",
            "To send tracking updates to your recipients, when you turn that on.",
            "To answer your support requests.",
            "To detect fraud and abuse and to keep accounts secure.",
            "To meet legal and customs obligations.",
          ]}
        />
        <p>
          Where the law requires a legal basis, ours is performance of our contract with you, our legitimate interest in operating and securing the service, and compliance with legal obligations.
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "Who we share it with",
    body: (
      <>
        <p>We share only what each party needs to do its job:</p>
        <Term term="Carriers">
          USPS, UPS, FedEx, DHL and any carrier you select receive the sender and recipient details needed to carry and deliver the package. They handle that information under their own privacy policies.
        </Term>
        <Term term="Our shipping platform">
          We connect to carriers through a shipping API provider, which processes address, parcel and tracking data on our behalf.
        </Term>
        <Term term="Payment processor">
          Card data is collected and stored by our payment processor. We receive only a token and the last four digits.
        </Term>
        <Term term="Infrastructure and email">
          Our hosting, database and transactional email providers process data on our instructions under written agreements.
        </Term>
        <p>
          We may also disclose information when the law requires it, to protect our rights or someone&apos;s safety, or as part of a merger or acquisition — in which case we will say so before your information moves.
        </p>
      </>
    ),
  },
  {
    id: "recipients",
    title: "If you received a package",
    body: (
      <>
        <p>
          If you are a recipient rather than a seller, we hold your address because a seller entered it to send you something. The seller decides what to do with that information; we process it for them.
        </p>
        <p>
          Our public tracking pages are reachable only through a long random link. They show the shipment&apos;s status, the destination city and state, and the store&apos;s name. They do not show your full street address, and they are not indexed by search engines.
        </p>
        <p>
          To ask about the information a seller holds, contact the seller. To ask about our own handling of it, write to <a href={`mailto:${company.email.privacy}`}>{company.email.privacy}</a>.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long we keep it",
    body: (
      <>
        <Bullets
          items={[
            "Account records: for as long as your account is open, then up to 90 days after you close it.",
            "Shipment and label records: at least seven years, because they are financial and customs records we are required to retain.",
            "Support messages: three years.",
            "Server logs: 30 days, other than logs kept for a security investigation.",
          ]}
        />
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights",
    body: (
      <>
        <p>Depending on where you live, you can ask us to:</p>
        <Bullets
          items={[
            "Give you a copy of the personal information we hold about you.",
            "Correct information that is wrong.",
            "Delete information we no longer need to keep.",
            "Restrict or object to certain processing.",
            "Export your data in a portable format.",
          ]}
        />
        <p>
          California residents have these rights under the CCPA and CPRA, including the right not to be discriminated against for exercising them. We do not sell or share personal information as those laws define the terms.
        </p>
        <p>
          Email <a href={`mailto:${company.email.privacy}`}>{company.email.privacy}</a> and we will respond within 30 days. We may need to verify your identity first. Some records, such as customs and financial records, we must keep even after a deletion request.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "How we protect it",
    body: (
      <>
        <p>
          Traffic is encrypted in transit with TLS. Passwords are hashed, never stored in readable form. API keys are stored only as hashes, so a copy of our database does not reveal them. Access to production data is limited to the people who need it.
        </p>
        <p>
          No system is perfectly secure. If a breach affects your personal information, we will notify you and any required regulator without undue delay.
        </p>
      </>
    ),
  },
  {
    id: "transfers",
    title: "Where your data is processed",
    body: (
      <p>
        We operate in the United States, and our providers may process data there and in other countries. Where information moves out of the UK, EEA or Switzerland, we rely on standard contractual clauses or another approved transfer mechanism.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        {company.brand} is a business tool and is not directed at children. We do not knowingly collect personal information from anyone under 16. If you believe a child has given us information, write to <a href={`mailto:${company.email.privacy}`}>{company.email.privacy}</a> and we will delete it.
      </p>
    ),
  },
  {
    id: "cookies",
    title: "Cookies",
    body: (
      <p>
        We use a small number of cookies, almost all of them strictly necessary. Our <Link href="/legal/cookies">Cookie Policy</Link> lists each one and what it does.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact us",
    body: (
      <>
        <p>
          Privacy questions go to <a href={`mailto:${company.email.privacy}`}>{company.email.privacy}</a>. Everything else is on our <Link href="/contact">contact page</Link>.
        </p>
        {hasAddress() && <p>{company.legalName}, {addressLine()}.</p>}
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      summary={`What ${company.legalName} collects when you ship with us, why we need it, who else sees it, and how to get it back or have it deleted.`}
      sections={sections}
    />
  );
}
