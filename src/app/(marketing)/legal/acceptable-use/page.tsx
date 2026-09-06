import type { Metadata } from "next";
import Link from "next/link";
import { Bullets, Callout, LegalPage, type LegalSection } from "@/components/marketing/LegalPage";
import { company } from "@/lib/company";

export const metadata: Metadata = {
  title: "Acceptable Use Policy",
  description: "What carriers will not carry and what you may not ship through Ship with Snap, plus the ways the platform and its API may not be used.",
  alternates: { canonical: "/legal/acceptable-use" },
};

const sections: LegalSection[] = [
  {
    id: "why",
    title: "Why this exists",
    body: (
      <p>
        Every carrier publishes its own list of what it will not carry, and every one of them can refuse, hold or destroy a package that breaks the rules. This policy sets out what you may not ship through {company.brand} and how you may not use the platform. It sits alongside our <Link href="/legal/terms">Terms of Service</Link>.
      </p>
    ),
  },
  {
    id: "prohibited",
    title: "What you may not ship",
    body: (
      <>
        <p>Do not use Snap to ship:</p>
        <Bullets
          items={[
            "Illegal drugs and controlled substances, including cannabis products where the sender or recipient is in a jurisdiction that prohibits them.",
            "Firearms, ammunition, explosives, fireworks and their component parts.",
            "Live animals.",
            "Human remains or body parts, other than through a carrier programme that explicitly permits them.",
            "Cash, bullion, bearer instruments and negotiable securities.",
            "Counterfeit goods, and anything that infringes a trademark or copyright.",
            "Stolen property.",
            "Child sexual abuse material or any content that sexually exploits a minor.",
            "Hazardous materials, lithium batteries, alcohol, dry ice or perishables where you have not met the carrier's specific requirements and declared them correctly on the shipment.",
            "Anything the destination country prohibits, or anything that would breach export controls or sanctions.",
          ]}
        />
        <Callout>
          Each carrier&apos;s own prohibited-items list applies on top of this one and is the final word. If a carrier will not carry something, we cannot make it.
        </Callout>
      </>
    ),
  },
  {
    id: "declarations",
    title: "Declare accurately",
    body: (
      <>
        <p>
          Under-declaring weight, dimensions or value is not a way to save money. Carriers measure packages themselves and bill the difference, and a false customs declaration can get a shipment seized and expose you to penalties.
        </p>
        <p>
          Restricted goods must be declared using the hazmat, alcohol, dry ice and perishable options when you buy the label, not hidden.
        </p>
      </>
    ),
  },
  {
    id: "platform",
    title: "How you may not use the platform",
    body: (
      <>
        <Bullets
          items={[
            "Do not resell access, share credentials, or run labels for a third party without your own agreement with them.",
            "Do not use the service to defraud anyone, including buying labels with a card you are not authorised to use.",
            "Do not attempt to break, probe, overload or reverse engineer the service or its API.",
            "Do not scrape rates for the purpose of building a competing rate database.",
            "Do not use another person's addresses or customer data without a lawful basis for holding them.",
            "Do not send unsolicited marketing through our tracking emails.",
          ]}
        />
      </>
    ),
  },
  {
    id: "enforcement",
    title: "What happens if you break this",
    body: (
      <>
        <p>
          Depending on what happened, we may warn you, refuse a shipment, suspend label purchasing, close your account, or report the matter to a carrier or to law enforcement. Serious breaches end an account immediately and without notice.
        </p>
        <p>
          You are responsible for costs a carrier charges us because of a shipment you sent in breach of this policy.
        </p>
      </>
    ),
  },
  {
    id: "report",
    title: "Reporting a problem",
    body: (
      <p>
        To report misuse of {company.brand}, email <a href={`mailto:${company.email.legal}`}>{company.email.legal}</a> with as much detail as you can. We investigate every report.
      </p>
    ),
  },
];

export default function AcceptableUsePage() {
  return (
    <LegalPage
      title="Acceptable Use Policy"
      summary="The things carriers will not carry and the ways the platform may not be used. Short, specific, and worth two minutes before your first international shipment."
      sections={sections}
    />
  );
}
