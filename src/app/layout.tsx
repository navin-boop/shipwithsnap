import type { Metadata } from "next";
import { Nunito, Sora } from "next/font/google";
import "./globals.css";
import { JsonLd, organizationSchema, softwareSchema, websiteSchema } from "@/components/marketing/JsonLd";
import { company } from "@/lib/company";

const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(company.url),
  title: {
    default: `${company.brand} — cheap USPS, UPS & FedEx shipping labels`,
    template: `%s · ${company.brand}`,
  },
  description:
    "Compare USPS, UPS, FedEx and DHL rates on one list and print the label in a minute. No monthly fee, no per-label fee — you pay postage at commercial rates, guaranteed lowest.",
  applicationName: company.brand,
  keywords: [
    "discount shipping labels",
    "USPS commercial pricing",
    "cheap USPS labels",
    "UPS discount rates",
    "FedEx shipping software",
    "shipping software for small business",
    "compare shipping rates",
    "print shipping labels online",
  ],
  authors: [{ name: company.legalName, url: company.url }],
  creator: company.legalName,
  publisher: company.legalName,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: company.brand,
    url: company.url,
    title: `${company.brand} — ship for seriously less`,
    description:
      "Commercial USPS, UPS, FedEx and DHL rates for small sellers. No monthly fee, no markup, lowest price guaranteed.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${company.brand} — ship for seriously less`,
    description: "Commercial carrier rates with no monthly fee. Compare USPS, UPS, FedEx and DHL and print in a minute.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  category: "business",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sora.variable} ${nunito.variable}`}>
      <body>
        <JsonLd data={[organizationSchema(), websiteSchema(), softwareSchema()]} />
        {children}
      </body>
    </html>
  );
}
