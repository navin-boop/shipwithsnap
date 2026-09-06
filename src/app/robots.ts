import type { MetadataRoute } from "next";
import { company } from "@/lib/company";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The app itself is behind a login, and /t/ pages are private customer
        // tracking links that should never appear in a search result.
        disallow: ["/api/", "/ship", "/shipments", "/batch", "/pickups", "/manifests", "/claims", "/track", "/reports", "/billing", "/settings", "/addresses", "/t/", "/invite/", "/dev/", "/styleguide"],
      },
    ],
    sitemap: `${company.url}/sitemap.xml`,
    host: company.url,
  };
}
