import type { Metadata } from "next"
import { MainNav } from "@/components/main-nav"
import { SiteFooter } from "@/components/site-footer"
import { BreadcrumbSchema } from "@/components/breadcrumb-schema"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Pearlie terms of service — the rules and guidelines for using our dental clinic matching platform.",
  alternates: {
    canonical: "https://pearlie.org/terms",
  },
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbSchema items={[
        { name: "Home", url: "https://pearlie.org" },
        { name: "Terms of Service", url: "https://pearlie.org/terms" },
      ]} />
      <MainNav />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-28">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Terms of Use</h1>
          <p className="text-muted-foreground mb-8">Last updated: 15/01/2025</p>

          <div className="prose prose-slate max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-3">1. About Our Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                Pearlie is a dental clinic matching platform. We connect patients with dental clinics based on treatment
                needs, location, and preferences. We are not a dental provider and do not offer medical or dental
                services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">2. No Medical Advice</h2>
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
                <p className="text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Important:</strong> Pearlie does not provide medical, dental, or
                  healthcare advice. The information on our platform is for informational purposes only and should not
                  be used as a substitute for professional medical advice, diagnosis, or treatment. Always seek the
                  advice of qualified healthcare providers with any questions you may have regarding dental conditions
                  or treatments.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">3. Clinic Independence</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                All dental clinics on our platform are independent healthcare providers. Pearlie:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Does not employ or control the clinics or their staff</li>
                <li>Is not responsible for the quality, safety, or outcomes of any treatment you receive</li>
                <li>Does not set clinic prices or determine their treatment protocols</li>
                <li>Cannot guarantee clinic availability or specific treatment outcomes</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Each clinic is responsible for their own clinical care, regulatory compliance, and patient
                relationships.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">4. Booking and Contracts</h2>
              <p className="text-muted-foreground leading-relaxed">
                When you contact or book with a clinic through our platform, you are entering into a direct relationship
                with that clinic. Pearlie is not a party to any contract between you and the clinic. Any disputes,
                cancellations, refunds, or issues with treatment must be resolved directly with the clinic.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">5. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                To the fullest extent permitted by law, Pearlie shall not be liable for:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Any dental treatment, diagnosis, or advice provided by clinics</li>
                <li>Clinic errors, negligence, or malpractice</li>
                <li>Inaccurate or outdated clinic information on our platform</li>
                <li>Unavailability of clinics or treatments</li>
                <li>Indirect, consequential, or incidental damages arising from use of our service</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Our total liability for any direct damages shall not exceed £100 or the amount you paid to use our
                service (if any), whichever is greater.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">6. Acceptable Use</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">You agree not to:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Provide false or misleading information</li>
                <li>Use our service for any unlawful purpose</li>
                <li>Attempt to disrupt or interfere with our platform</li>
                <li>Scrape or copy content without permission</li>
                <li>Impersonate any person or entity</li>
                <li>Upload viruses or malicious code</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">7. Accuracy of Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                While we strive to keep clinic information accurate and up-to-date, we cannot guarantee the accuracy,
                completeness, or timeliness of information provided by clinics. Clinic details such as prices, opening
                hours, and available treatments may change without notice. We recommend confirming details directly with
                the clinic before booking.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">8. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                All content on the Pearlie platform, including text, graphics, logos, and software, is owned by Pearlie
                or our licensors and is protected by copyright and other intellectual property laws. You may not
                reproduce, distribute, or create derivative works without our written permission.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">9. Changes to Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify, suspend, or discontinue our service at any time without prior notice. We
                may also update these Terms of Use periodically. Continued use of our service after changes constitutes
                acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">10. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms of Use are governed by the laws of England and Wales. Any disputes arising from these terms
                or your use of our service shall be subject to the exclusive jurisdiction of the courts of England and
                Wales.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">11. Contact</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about these Terms of Use, please contact us at:{" "}
                <a href="mailto:support@pearlie.org" className="text-primary hover:underline">
                  support@pearlie.org
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
