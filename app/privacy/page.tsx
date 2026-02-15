import type { Metadata } from "next"
import Link from "next/link"
import { MobileNavMenu } from "@/components/mobile-nav-menu"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Pearlie privacy policy — how we collect, use, and protect your personal data.",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      <header className="border-b border-stone-200 bg-white sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="text-2xl font-semibold tracking-tight text-stone-900">Pearlie</div>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/about" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">
                About
              </Link>
              <Link href="/faq" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">
                FAQ
              </Link>
              <Link href="/for-clinics" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">
                For Clinics
              </Link>
            </nav>
            <MobileNavMenu />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-stone-900 mb-2">Privacy Policy</h1>
          <p className="text-stone-500 mb-10">
            Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>

          <p className="text-stone-700 leading-relaxed mb-10">
            Pearlie respects your privacy and is committed to protecting your personal data. This Privacy Policy
            explains how we collect, use, store, and share information when you use our platform.
          </p>

          <div className="space-y-10">
            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">Who we are</h2>
              <p className="text-stone-600 leading-relaxed">
                Pearlie is a digital platform that helps patients find dental clinics that match their preferences,
                needs, and circumstances. We do not provide medical advice, diagnosis, or treatment.
              </p>
              <p className="text-stone-600 leading-relaxed mt-3">
                For the purposes of UK data protection law, Pearlie is the data controller.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">What data we collect</h2>
              <p className="text-stone-600 leading-relaxed mb-3">When you use Pearlie, we may collect:</p>

              <h3 className="text-base font-medium text-stone-800 mb-2">Information you provide</h3>
              <ul className="list-disc pl-6 space-y-1.5 text-stone-600 mb-4">
                <li>Treatment interests (e.g. Invisalign, implants)</li>
                <li>Preferences and priorities (e.g. location, timing, concerns)</li>
                <li>Postcode or general location</li>
                <li>Budget range or affordability preferences</li>
                <li>Free-text notes you choose to share</li>
                <li>Contact details (name, email, phone number)</li>
              </ul>

              <h3 className="text-base font-medium text-stone-800 mb-2">Automatically collected information</h3>
              <ul className="list-disc pl-6 space-y-1.5 text-stone-600">
                <li>Pages viewed and interactions on the site</li>
                <li>Which clinics you view or contact</li>
                <li>Whether you book or call a clinic</li>
                <li>Device and browser information (via analytics)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">Why we collect your data</h2>
              <p className="text-stone-600 leading-relaxed mb-3">We use your data to:</p>
              <ul className="list-disc pl-6 space-y-1.5 text-stone-600">
                <li>Match you with suitable dental clinics</li>
                <li>Explain why clinics were matched to you</li>
                <li>Share your enquiry with clinics only when you choose to contact them</li>
                <li>Improve our matching system and user experience</li>
                <li>Generate anonymised insights about patient preferences and trends</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">How clinic notifications work</h2>
              <p className="text-stone-600 leading-relaxed mb-3">Clinics are only notified when you:</p>
              <ul className="list-disc pl-6 space-y-1.5 text-stone-600 mb-3">
                <li>Click "Book consultation"</li>
                <li>Click "Call clinic"</li>
              </ul>
              <p className="text-stone-600 leading-relaxed">
                Clinics do not see your details simply because they appear in your match results.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">Analytics & insights</h2>
              <p className="text-stone-600 leading-relaxed mb-3">
                We analyse user behaviour in an aggregated and anonymised way to understand:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-stone-600 mb-3">
                <li>Popular treatments</li>
                <li>Common patient concerns</li>
                <li>Conversion behaviour</li>
                <li>Platform performance</li>
              </ul>
              <p className="text-stone-600 leading-relaxed">
                These insights may be shared with clinics or partners, but never in a way that identifies you
                personally.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">Legal basis for processing</h2>
              <p className="text-stone-600 leading-relaxed mb-3">We process your data under:</p>
              <ul className="list-disc pl-6 space-y-1.5 text-stone-600 mb-3">
                <li>
                  <strong>Consent</strong> – when you submit your details
                </li>
                <li>
                  <strong>Legitimate interests</strong> – to operate and improve the platform
                </li>
                <li>
                  <strong>Legal obligations</strong> – where required by law
                </li>
              </ul>
              <p className="text-stone-600 leading-relaxed">You may withdraw consent at any time.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">How long we keep your data</h2>
              <ul className="list-disc pl-6 space-y-1.5 text-stone-600">
                <li>Lead data is retained only as long as necessary to provide the service</li>
                <li>Aggregated analytics may be retained longer for reporting and improvement</li>
                <li>You may request deletion at any time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">Who we share data with</h2>
              <p className="text-stone-600 leading-relaxed mb-3">We may share data with:</p>
              <ul className="list-disc pl-6 space-y-1.5 text-stone-600 mb-3">
                <li>Dental clinics you choose to contact</li>
                <li>Secure service providers (hosting, analytics, email)</li>
              </ul>
              <p className="text-stone-600 leading-relaxed font-medium">We never sell personal data.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">International data transfers</h2>
              <p className="text-stone-600 leading-relaxed">
                Some service providers may process data outside the UK. Where this happens, we ensure appropriate
                safeguards are in place.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">Your rights</h2>
              <p className="text-stone-600 leading-relaxed mb-3">You have the right to:</p>
              <ul className="list-disc pl-6 space-y-1.5 text-stone-600 mb-3">
                <li>Access your data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion</li>
                <li>Restrict or object to processing</li>
                <li>Lodge a complaint with the ICO</li>
              </ul>
              <p className="text-stone-600 leading-relaxed">
                To exercise these rights, contact:{" "}
                <a href="mailto:privacy@pearlie.org" className="text-teal-600 hover:underline">
                  privacy@pearlie.org
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">Contact us</h2>
              <p className="text-stone-600 leading-relaxed">
                If you have questions about this policy or your data:
                <br />
                Email:{" "}
                <a href="mailto:privacy@pearlie.org" className="text-teal-600 hover:underline">
                  privacy@pearlie.org
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
