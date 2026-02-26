import type { MetadataRoute } from "next"
import { LONDON_AREAS, LONDON_REGIONS } from "@/lib/locations/london"

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://pearlie.org"

  const locationPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/find`, lastModified: "2026-02-26", changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/find/dentist-near-me`, lastModified: "2026-02-26", changeFrequency: "weekly", priority: 0.8 },
    ...LONDON_REGIONS.map((region) => ({
      url: `${baseUrl}/find/${region.slug}`,
      lastModified: "2026-02-26" as string,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    })),
    ...LONDON_AREAS.map((area) => ({
      url: `${baseUrl}/find/${area.slug}`,
      lastModified: "2026-02-26" as string,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ]

  return [
    { url: baseUrl, lastModified: "2026-02-23", changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/intake`, lastModified: "2026-02-23", changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: "2026-02-23", changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/faq`, lastModified: "2026-02-23", changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/for-clinics`, lastModified: "2026-02-23", changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/our-mission`, lastModified: "2026-02-23", changeFrequency: "monthly", priority: 0.5 },
    ...locationPages,
    { url: `${baseUrl}/privacy`, lastModified: "2025-01-15", changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: "2025-01-15", changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/cookies`, lastModified: "2025-01-15", changeFrequency: "yearly", priority: 0.2 },
  ]
}
