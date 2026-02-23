import type { MetadataRoute } from "next"

// Dashboard segments under /clinic/ that should NOT be crawled.
// Public clinic profiles (/clinic/<slug-or-uuid>) remain crawlable.
const CLINIC_DASHBOARD_DISALLOW = [
  "/clinic/profile",
  "/clinic/leads",
  "/clinic/inbox",
  "/clinic/appointments",
  "/clinic/bookings",
  "/clinic/insights",
  "/clinic/settings",
  "/clinic/team",
  "/clinic/providers",
  "/clinic/login",
  "/clinic/demo",
  "/clinic/forgot-password",
  "/clinic/reset-password",
  "/clinic/set-password",
  "/clinic/accept-invite",
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/clinic/"],
        disallow: ["/admin/", ...CLINIC_DASHBOARD_DISALLOW, "/patient/", "/api/", "/auth/", "/booking/"],
      },
      {
        userAgent: "GPTBot",
        allow: ["/", "/llms.txt", "/clinic/"],
        disallow: ["/admin/", ...CLINIC_DASHBOARD_DISALLOW, "/patient/", "/api/", "/auth/", "/booking/"],
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
