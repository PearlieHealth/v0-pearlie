import type { MetadataRoute } from "next"
import { LONDON_AREAS, LONDON_REGIONS } from "@/lib/locations/london"
import { getAllBlogPosts } from "@/lib/content/blog"
import { getAllGuides } from "@/lib/content/guides"
import { getAllTreatments } from "@/lib/content/treatments"

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

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: "2026-02-23", changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/intake`, lastModified: "2026-02-23", changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: "2026-02-23", changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/blog`, lastModified: new Date().toISOString().split("T")[0], changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/treatments`, lastModified: new Date().toISOString().split("T")[0], changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/guides`, lastModified: new Date().toISOString().split("T")[0], changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/faq`, lastModified: "2026-02-23", changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/for-clinics`, lastModified: "2026-02-26", changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/our-mission`, lastModified: "2026-02-23", changeFrequency: "monthly", priority: 0.5 },
    ...locationPages,
    { url: `${baseUrl}/privacy`, lastModified: "2025-01-15", changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: "2025-01-15", changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/cookies`, lastModified: "2025-01-15", changeFrequency: "yearly", priority: 0.2 },
  ]

  // Blog posts
  const blogPosts: MetadataRoute.Sitemap = getAllBlogPosts().map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt || post.publishedAt,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))

  // Treatment pages
  const treatmentPages: MetadataRoute.Sitemap = getAllTreatments().map((t) => ({
    url: `${baseUrl}/treatments/${t.slug}`,
    lastModified: t.updatedAt || t.publishedAt,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }))

  // Guides
  const guides: MetadataRoute.Sitemap = getAllGuides().map((guide) => ({
    url: `${baseUrl}/guides/${guide.slug}`,
    lastModified: guide.updatedAt || guide.publishedAt,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }))

  return [...staticPages, ...treatmentPages, ...blogPosts, ...guides]
}
