import type { Metadata } from "next";
import { Nunito, Sora } from "next/font/google";
import "./globals.css";

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
  title: "Ship with Snap",
  description:
    "The cheapest USPS, UPS and FedEx rates for small sellers. No monthly fee — pay postage only.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sora.variable} ${nunito.variable}`}>
      <body>{children}</body>
    </html>
  );
}
