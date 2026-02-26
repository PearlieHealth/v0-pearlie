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
        allow: ["/", "/llms.txt", "/blog/"],
        disallow: ["/admin/", "/clinic/", "/patient/", "/api/", "/auth/", "/booking/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/llms.txt", "/blog/"],
      },
      {
        userAgent: "ClaudeBot",
        allow: ["/", "/llms.txt", "/blog/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/llms.txt", "/blog/"],
      },
      {
        userAgent: "Applebot-Extended",
        allow: ["/", "/llms.txt", "/blog/"],
      },
    ],
    sitemap: "https://pearlie.org/sitemap.xml",
  }
}
