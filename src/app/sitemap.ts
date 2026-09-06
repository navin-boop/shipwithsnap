import type { MetadataRoute } from "next";
import { CARRIERS } from "@/lib/carriers-content";
import { company } from "@/lib/company";

// Only public, indexable pages. Signed-in app routes and the token-based
// tracking pages are excluded here and disallowed in robots.ts.

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (path: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]) => ({
    url: `${company.url}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  });

  return [
    page("", 1, "weekly"),
    page("/pricing", 0.9, "monthly"),
    page("/how-it-works", 0.9, "monthly"),
    page("/lowest-price-guarantee", 0.9, "monthly"),
    page("/rates", 0.8, "weekly"),
    page("/carriers", 0.8, "monthly"),
    ...CARRIERS.map((c) => page(`/carriers/${c.slug}`, 0.8, "monthly" as const)),
    page("/faq", 0.7, "monthly"),
    page("/about", 0.6, "yearly"),
    page("/contact", 0.6, "yearly"),
    page("/docs", 0.6, "monthly"),
    page("/signup", 0.5, "yearly"),
    page("/login", 0.3, "yearly"),
    page("/legal/terms", 0.4, "yearly"),
    page("/legal/privacy", 0.4, "yearly"),
    page("/legal/refunds", 0.4, "yearly"),
    page("/legal/acceptable-use", 0.4, "yearly"),
    page("/legal/cookies", 0.3, "yearly"),
  ];
}
