import type { MetadataRoute } from "next"
import { createAdminClient } from "@/lib/supabase/admin"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://pearlie.org"

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: "2026-02-23", changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/intake`, lastModified: "2026-02-23", changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: "2026-02-23", changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/faq`, lastModified: "2026-02-23", changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/for-clinics`, lastModified: "2026-02-23", changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/our-mission`, lastModified: "2026-02-23", changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: "2025-01-15", changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: "2025-01-15", changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/cookies`, lastModified: "2025-01-15", changeFrequency: "yearly", priority: 0.2 },
  ]

  // Dynamic clinic routes — fetch all live, non-archived clinics
  let clinicRoutes: MetadataRoute.Sitemap = []
  try {
    const supabase = createAdminClient()
    const { data: clinics } = await supabase
      .from("clinics")
      .select("slug, id, updated_at")
      .eq("is_live", true)
      .eq("is_archived", false)

    if (clinics) {
      clinicRoutes = clinics.map((clinic) => ({
        url: `${baseUrl}/clinic/${clinic.slug || clinic.id}`,
        lastModified: clinic.updated_at || "2026-02-23",
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }))
    }
  } catch (error) {
    console.error("Error fetching clinics for sitemap:", error)
  }

  return [...staticRoutes, ...clinicRoutes]
}
