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
        allow: ["/", "/llms.txt", "/blog/", "/treatments/", "/london/", "/faq", "/about", "/our-mission"],
        disallow: ["/admin/", "/clinic/", "/patient/", "/api/", "/auth/", "/booking/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/llms.txt", "/blog/", "/treatments/", "/london/", "/faq", "/about", "/our-mission"],
      },
      {
        userAgent: "ClaudeBot",
        allow: ["/", "/llms.txt", "/blog/", "/treatments/", "/london/", "/faq", "/about", "/our-mission"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/llms.txt", "/blog/", "/treatments/", "/london/", "/faq", "/about", "/our-mission"],
      },
      {
        userAgent: "Applebot-Extended",
        allow: ["/", "/llms.txt", "/blog/", "/treatments/", "/london/", "/faq", "/about", "/our-mission"],
      },
    ],
    sitemap: "https://pearlie.org/sitemap.xml",
  }
}
