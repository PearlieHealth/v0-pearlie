import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/clinic/", "/patient/", "/api/", "/auth/", "/booking/"],
      },
      {
        userAgent: "GPTBot",
        allow: ["/", "/llms.txt"],
        disallow: ["/admin/", "/clinic/", "/patient/", "/api/", "/auth/", "/booking/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/llms.txt"],
      },
      {
        userAgent: "ClaudeBot",
        allow: ["/", "/llms.txt"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/llms.txt"],
      },
      {
        userAgent: "Applebot-Extended",
        allow: ["/", "/llms.txt"],
      },
    ],
    sitemap: "https://pearlie.org/sitemap.xml",
  }
}
