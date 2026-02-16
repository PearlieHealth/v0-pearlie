import { Shield, CheckCircle2, Award, TrendingUp } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { MainNav } from "@/components/main-nav"
import { ClinicNetworkGrid } from "@/components/clinic-network-grid"
import { CookieSettingsButton } from "@/components/cookie-settings-button"

export const metadata = {
  title: "About Pearlie | Independent Dental Matching Platform",
  description:
    "Learn about Pearlie, an independent dental matching platform helping patients find the right dental clinic quickly, transparently, and without pressure.",
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <MainNav />

      <main>
        {/* Hero Section */}
        <section className="py-12 sm:py-20 md:py-28 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6 sm:mb-8 text-balance">
                Find the right dental clinic for you
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                Pearlie is an independent dental matching platform designed to help people find the right dental clinic
                for their needs — quickly, transparently, and without pressure.
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section - BetterHelp style */}
        <section className="py-16 bg-background border-y border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
              <div className="text-center">
                <div className="text-4xl md:text-6xl font-bold text-foreground mb-3">500+</div>
                <div className="text-lg text-muted-foreground">Verified dental clinics</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-6xl font-bold text-foreground mb-3">10k+</div>
                <div className="text-lg text-muted-foreground">Patients matched</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-6xl font-bold text-foreground mb-3">92%</div>
                <div className="text-lg text-muted-foreground">Match satisfaction rate</div>
              </div>
            </div>
          </div>
        </section>

        {/* Our Clinics Section - matching BetterHelp therapist grid */}
        <section className="py-12 sm:py-20 md:py-28 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Our clinic network</h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                  Pearlie partners with independent, trusted dental clinics across the UK. All clinics are verified,
                  GDC-registered, and committed to providing quality patient care.
                </p>
              </div>

              <ClinicNetworkGrid />

              <div className="text-center">
                <Button size="lg" variant="outline" asChild>
                  <Link href="/intake">Get my clinic matches</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* How we help - matching BetterHelp's approach section */}
        <section className="py-12 sm:py-20 md:py-28 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                  We help patients find clinics they love working with
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                  We use a structured matching approach to recommend clinics based on fit — not advertising spend. Our
                  platform considers your treatment needs, location, budget, and personal preferences.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                <div className="bg-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-6 h-6 text-foreground" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4">What Pearlie does</h3>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-foreground mt-0.5 flex-shrink-0" />
                      <span>Find dental clinics that match your treatment needs</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-foreground mt-0.5 flex-shrink-0" />
                      <span>Compare options based on location, availability, and suitability</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-foreground mt-0.5 flex-shrink-0" />
                      <span>Book directly with clinics, without obligation</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <Shield className="w-6 h-6 text-foreground" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4">Our independence</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Pearlie is an independent platform. We do not own dental clinics, employ dentists, or provide dental
                    treatment.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    While clinics may pay for introductions, this does not influence clinical decision-making or
                    rankings. Our role is to support informed choice — not to replace professional advice.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why we built Pearlie - story section matching BetterHelp team */}
        <section className="py-12 sm:py-20 md:py-28 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Our story</h2>
              </div>
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="relative flex items-center justify-center order-2 lg:order-1">
                  <div className="rounded-3xl overflow-hidden shadow-2xl w-full max-w-md">
                    <Image
                      src="/images/1a10ce26-17f8-4c8f-b825.png"
                      alt="Dentist in modern dental office"
                      width={600}
                      height={800}
                      className="w-full h-auto object-cover"
                    />
                  </div>
                </div>
                <div className="space-y-6 text-muted-foreground leading-relaxed text-lg order-1 lg:order-2">
                  <p className="text-xl font-medium text-foreground">Why we built Pearlie</p>
                  <p>Over time, we noticed something again and again.</p>
                  <p>
                    Patients often understand the treatment during an appointment — but the decision itself rarely feels
                    finished there. There are still important things to weigh up: whether the option feels right,
                    whether it fits their life, whether the cost makes sense, and whether they feel ready to move
                    forward.
                  </p>
                  <p>
                    At the same time, they're navigating too many options, mixed opinions, and unclear pricing. Pearlie
                    was built to bring clarity to that moment.
                  </p>
                  <p>
                    Instead of leaving patients to piece everything together afterward, Pearlie helps you understand
                    what matters to you first — so conversations with clinics feel clearer, more focused, and easier to
                    navigate.
                  </p>
                  <div className="mt-8">
                    <Image
                      src="/dr-grei-mustaj-signature.png"
                      alt="Dr. Grei Muskaj signature"
                      width={400}
                      height={100}
                      className="h-12 w-auto opacity-80"
                    />
                    <p className="text-sm text-muted-foreground mt-2">Dr. Grei Muskaj, Founder and CEO</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Impact Section - matching BetterHelp social impact */}
        <section className="py-12 sm:py-20 md:py-28 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Our commitment</h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                  We believe everyone deserves access to quality dental care. Pearlie is committed to making the
                  decision-making process transparent, accessible, and patient-centered.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="bg-white rounded-2xl p-5 sm:p-8 text-center shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Award className="w-8 h-8 text-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Quality First</h3>
                  <p className="text-muted-foreground">All clinics are verified and GDC-registered professionals</p>
                </div>

                <div className="bg-white rounded-2xl p-5 sm:p-8 text-center shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Shield className="w-8 h-8 text-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Transparent Matching</h3>
                  <p className="text-muted-foreground">No hidden fees, paid placements, or misleading rankings</p>
                </div>

                <div className="bg-white rounded-2xl p-5 sm:p-8 text-center shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <TrendingUp className="w-8 h-8 text-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Always Improving</h3>
                  <p className="text-muted-foreground">We continuously refine our matching to better serve patients</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 sm:py-20 md:py-28 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Ready to find your clinic match?</h2>
              <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
                Answer a few questions about your dental needs and get matched with clinics that are right for you.
              </p>
              <Button size="lg" className="text-lg px-10 py-6 h-auto" asChild>
                <Link href="/intake">Get my clinic matches</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-white py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-8">
              <div className="md:col-span-1">
                <div className="text-2xl font-semibold mb-4">Pearlie</div>
                <p className="text-sm text-muted-foreground">Independent dental matching platform</p>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Platform</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <Link href="/about" className="hover:text-foreground transition-colors">
                      About
                    </Link>
                  </li>
                  <li>
                    <Link href="/faq" className="hover:text-foreground transition-colors">
                      FAQ
                    </Link>
                  </li>
                  <li>
                    <Link href="/for-clinics" className="hover:text-foreground transition-colors">
                      For Clinics
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Legal</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <Link href="/privacy" className="hover:text-foreground transition-colors">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms" className="hover:text-foreground transition-colors">
                      Terms of Use
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Contact</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <Link href="/contact" className="hover:text-foreground transition-colors">
                      Contact Us
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="pt-8 border-t border-border">
              <p className="text-xs text-muted-foreground leading-relaxed max-w-4xl">
                Pearlie is an independent dental matching platform and does not provide medical or dental advice. All
                diagnosis and treatment decisions are made by independent dental clinics. Pearlie is not affiliated with
                or endorsed by the NHS.
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">© 2026 Pearlie. All rights reserved.</span>
                <CookieSettingsButton />
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
