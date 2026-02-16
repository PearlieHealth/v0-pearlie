import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/clinic/", "/patient/", "/api/", "/auth/", "/booking/"],
      },
    ],
    sitemap: "https://pearlie.org/sitemap.xml",
  }
}
