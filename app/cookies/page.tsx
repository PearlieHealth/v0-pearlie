import type { Metadata } from "next"
import Link from "next/link"
import { MainNav } from "@/components/main-nav"
import { SiteFooter } from "@/components/site-footer"

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "Manage your cookie preferences on Pearlie.",
  alternates: {
    canonical: "https://pearlie.org/cookies",
  },
}

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-background">
      <MainNav />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-28">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Cookie Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: 15/01/2025</p>

          <div className="prose prose-slate max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-3">What Are Cookies?</h2>
              <p className="text-muted-foreground leading-relaxed">
                Cookies are small text files that are placed on your device when you visit a website. They help websites
                remember your preferences, recognize you on return visits, and improve your overall experience. Cookies
                can also help us understand how visitors use our site so we can make improvements.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">How We Use Cookies</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use cookies to provide our matching service, remember your preferences, and analyze how our platform
                is used. Some cookies are essential for the website to function, while others are optional and require
                your consent under UK privacy regulations (PECR).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">Types of Cookies We Use</h2>

              <div className="space-y-6 mt-4">
                <div className="border rounded-lg p-4">
                  <h3 className="text-xl font-semibold mb-2">Essential Cookies (Always Active)</h3>
                  <p className="text-muted-foreground leading-relaxed mb-2">
                    These cookies are necessary for the website to function properly and cannot be disabled.
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Session management and security</li>
                    <li>Form submissions and user preferences</li>
                    <li>Cookie consent preferences</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="text-xl font-semibold mb-2">Analytics Cookies (Optional)</h3>
                  <p className="text-muted-foreground leading-relaxed mb-2">
                    These cookies help us understand how visitors interact with our website by collecting anonymous
                    information about pages visited, time spent, and navigation patterns.
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Google Analytics (if implemented)</li>
                    <li>Page view tracking</li>
                    <li>User journey analysis</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="text-xl font-semibold mb-2">Marketing Cookies (Optional)</h3>
                  <p className="text-muted-foreground leading-relaxed mb-2">
                    These cookies are used to deliver personalized advertisements and measure the effectiveness of
                    marketing campaigns.
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Meta Pixel (if implemented)</li>
                    <li>Advertising campaign tracking</li>
                    <li>Retargeting and personalization</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">Managing Your Cookie Preferences</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                You have full control over which optional cookies we use. You can manage your preferences in several
                ways:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Use the cookie banner when you first visit our website</li>
                <li>Click the "Cookie Settings" link in the footer at any time to change your preferences</li>
                <li>Configure your browser to block or delete cookies (though this may affect site functionality)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">Third-Party Cookies</h2>
              <p className="text-muted-foreground leading-relaxed">
                Some cookies on our site are set by third-party services we use, such as analytics providers. These
                third parties have their own privacy policies governing how they use information. We only use reputable
                third-party services and ensure they comply with UK data protection laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">Cookie Duration</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Cookies can be either session cookies (deleted when you close your browser) or persistent cookies
                (remain for a set period). The duration varies:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>
                  <strong>Essential cookies:</strong> Session-based or up to 12 months
                </li>
                <li>
                  <strong>Analytics cookies:</strong> Up to 24 months
                </li>
                <li>
                  <strong>Marketing cookies:</strong> Up to 12 months
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed">
                Under UK GDPR and PECR, you have the right to refuse non-essential cookies and to change your mind at
                any time. Refusing cookies will not prevent you from using our website, though some features may not
                work as smoothly.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">More Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                For more information about how we handle your personal data, please see our{" "}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                . If you have questions about our use of cookies, contact us at:{" "}
                <a href="mailto:privacy@pearlie.org" className="text-primary hover:underline">
                  privacy@pearlie.org
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
