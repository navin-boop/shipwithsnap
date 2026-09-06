import type { NextConfig } from "next";

/**
 * Security headers applied to every response.
 *
 * No Content-Security-Policy yet: the app router inlines hydration scripts and Stripe Elements
 * loads js.stripe.com in an iframe, so a policy strict enough to be worth having needs nonce
 * plumbing through the root layout. These headers are the parts that carry no such risk.
 */
const securityHeaders = [
  // Never let a browser guess a content type — label files are streamed from a carrier.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // The only frames we use are our own label previews.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Don't leak the path of an internal page (or a tracking token) to third parties.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Two years, including subdomains, and eligible for preload.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Keeps the dev badge out of product screenshots (scripts/screenshots.sh).
  devIndicators: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Customer tracking links are private URLs; keep them out of search results entirely.
      { source: "/t/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] },
    ];
  },
};

export default nextConfig;
