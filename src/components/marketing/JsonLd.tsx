import { company } from "@/lib/company";

// Structured data for search engines and AI answer engines.
// Rendered as a script tag; the payload is our own static content, never user input.

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${company.url}/#organization`,
    name: company.brand,
    legalName: company.legalName,
    url: company.url,
    logo: `${company.url}/icon.svg`,
    foundingDate: company.founded,
    description: `${company.brand} gives small sellers commercial USPS, UPS, FedEx and DHL shipping rates with no monthly fee.`,
    contactPoint: [
      { "@type": "ContactPoint", contactType: "customer support", email: company.email.support, availableLanguage: "English" },
      { "@type": "ContactPoint", contactType: "billing support", email: company.email.billing, availableLanguage: "English" },
    ],
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${company.url}/#website`,
    url: company.url,
    name: company.brand,
    publisher: { "@id": `${company.url}/#organization` },
  };
}

/** The product itself, priced so rich results can show "free software, pay postage". */
export function softwareSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: company.brand,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: company.url,
    publisher: { "@id": `${company.url}/#organization` },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free shipping software. You pay carrier postage at commercial rates with no markup.",
    },
  };
}

export function faqSchema(items: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: i.a },
    })),
  };
}

export function breadcrumbSchema(trail: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: `${company.url}${t.path}`,
    })),
  };
}
