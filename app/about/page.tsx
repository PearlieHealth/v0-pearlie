import { Shield, CheckCircle2, Heart, Users } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { MainNav } from "@/components/main-nav"
import { ClinicNetworkCarousel } from "@/components/clinic-network-carousel"
import { SiteFooter } from "@/components/site-footer"

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
        {/* Hero Section — dark teal background, distinct from landing page's warm beige */}
        <section className="py-16 sm:py-24 md:py-32 bg-[#004443]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6 sm:mb-8 text-white text-balance">
                Find the right dental clinic for you
              </h1>
              <p className="text-xl md:text-2xl text-white/75 leading-relaxed max-w-3xl mx-auto">
                Pearlie is an independent dental matching platform designed to help people find the right dental clinic
                for their needs — quickly, transparently, and without pressure.
              </p>
            </div>
          </div>
        </section>

        {/* Our Clinic Network — two-row carousel */}
        <section className="py-12 sm:py-20 md:py-24 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6 text-[#004443]">
                Our clinic network
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Pearlie partners with independent, trusted dental clinics across the UK. All clinics are verified,
                GDC-registered, and committed to providing quality patient care.
              </p>
            </div>
          </div>

          {/* Full-width carousel — no container constraint */}
          <ClinicNetworkCarousel />
        </section>

        {/* What Pearlie Does — cream background with richer descriptions */}
        <section className="py-12 sm:py-20 md:py-28 bg-[#F8F1E7]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12 sm:mb-16">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6 text-[#004443]">
                  What Pearlie does
                </h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-6 lg:gap-8">
                <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                  <div className="w-11 h-11 rounded-full bg-[#0fbcb0]/10 flex items-center justify-center mb-5">
                    <Users className="w-5 h-5 text-[#0fbcb0]" />
                  </div>
                  <h3 className="text-lg font-semibold mb-3 text-foreground">Match you with the right clinics</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Pearlie considers your treatment goals, location, budget, and personal preferences — recommending
                    clinics without bias.
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                  <div className="w-11 h-11 rounded-full bg-[#0fbcb0]/10 flex items-center justify-center mb-5">
                    <CheckCircle2 className="w-5 h-5 text-[#0fbcb0]" />
                  </div>
                  <h3 className="text-lg font-semibold mb-3 text-foreground">Provide transparent clinic profiles</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    We partner only with trusted, GDC-registered dentists across the UK and give you clear information
                    on availability and suitability.
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                  <div className="w-11 h-11 rounded-full bg-[#0fbcb0]/10 flex items-center justify-center mb-5">
                    <Heart className="w-5 h-5 text-[#0fbcb0]" />
                  </div>
                  <h3 className="text-lg font-semibold mb-3 text-foreground">Let you compare and connect</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Review your options and message clinics directly — book only if you're ready, without obligation.
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                  <div className="w-11 h-11 rounded-full bg-[#0fbcb0]/10 flex items-center justify-center mb-5">
                    <Shield className="w-5 h-5 text-[#0fbcb0]" />
                  </div>
                  <h3 className="text-lg font-semibold mb-3 text-foreground">Remain independent</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    We don't own clinics or offer treatment. Clinics paying for introductions do not influence our
                    rankings or recommendations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why we built Pearlie — story section on white */}
        <section className="py-12 sm:py-20 md:py-28 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-10 sm:mb-14 text-center text-[#004443]">
                Why we built Pearlie
              </h2>
              <div className="space-y-6 text-muted-foreground leading-relaxed text-lg max-w-3xl mx-auto">
                <p>
                  Patients often understand the treatment during an appointment — but the decision itself rarely feels
                  finished there. There are still important things to weigh up: whether the option feels right, whether
                  it fits their life, whether the cost makes sense, and whether they feel ready to move forward.
                </p>
                <p>
                  At the same time, they're navigating too many options, mixed opinions, and unclear pricing.
                </p>
                <p>
                  Pearlie was built to bring clarity and confidence to that moment. Instead of leaving patients to piece
                  everything together afterward, we help you understand what matters to you first — so conversations
                  with clinics feel clearer, more focused, and easier to navigate.
                </p>
              </div>

              {/* Founder signature */}
              <div className="mt-12 sm:mt-16 text-center">
                <Image
                  src="/dr-grei-mustaj-signature.png"
                  alt="Founder signature"
                  width={400}
                  height={100}
                  className="h-12 w-auto opacity-80 mx-auto"
                />
                <p className="text-sm text-muted-foreground mt-3">Founder &amp; CEO</p>
              </div>
            </div>
          </div>
        </section>

        {/* Our Commitment — consolidated, dark teal background */}
        <section className="py-12 sm:py-20 md:py-28 bg-[#004443]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6 text-white">
                Our commitment
              </h2>
              <p className="text-lg sm:text-xl text-white/75 leading-relaxed max-w-3xl mx-auto">
                Every clinic on Pearlie is verified and GDC-registered. There are no hidden fees, no paid placements,
                and no misleading rankings. We continuously refine our matching so that every recommendation is based
                on fit — not advertising spend.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section — cream background, single clear action */}
        <section className="py-12 sm:py-20 md:py-28 bg-[#F8F1E7]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6 text-[#004443]">
                Ready to find your clinic match?
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground mb-10 leading-relaxed">
                Answer a few questions about your dental needs and get matched with clinics that are right for you.
              </p>
              <Button
                size="lg"
                className="text-lg px-10 py-6 h-auto bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full shadow-md hover:shadow-lg transition-all"
                asChild
              >
                <Link href="/intake">Get my clinic matches</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
