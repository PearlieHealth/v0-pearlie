import type { Metadata } from "next"
import { Shield, ShieldCheck, CheckCircle2, Heart, Users, MessageCircle, BadgeCheck } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import Image from "next/image"
import { MainNav } from "@/components/main-nav"
import { ClinicNetworkCarousel } from "@/components/clinic-network-carousel"
import { SiteFooter } from "@/components/site-footer"
import { BreadcrumbSchema } from "@/components/breadcrumb-schema"
import { TrustBadgeStrip } from "@/components/trust-badge-strip"

export const metadata: Metadata = {
  title: "About Pearlie - Independent Dental Clinic Matching",
  description: "Pearlie is an independent dental matching platform founded by Dr Grei Muskaj. We help patients find trusted, GDC-registered clinics — free, transparent, and without pressure.",
  alternates: {
    canonical: "https://pearlie.org/about",
  },
  openGraph: {
    title: "About Pearlie - Independent Dental Clinic Matching",
    description: "Pearlie is an independent dental matching platform helping patients find trusted, GDC-registered clinics across the UK.",
    url: "https://pearlie.org/about",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Pearlie - Independent Dental Clinic Matching",
    description: "Pearlie is an independent dental matching platform helping patients find trusted, GDC-registered clinics across the UK.",
  },
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbSchema items={[
        { name: "Home", url: "https://pearlie.org" },
        { name: "About", url: "https://pearlie.org/about" },
      ]} />
      <MainNav />

      <main>
        {/* Hero Section — dark teal background, distinct from landing page's warm beige */}
        <section className="pt-32 pb-16 sm:pb-24 md:pt-32 md:pb-32 bg-[#0d1019]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-3xl sm:text-5xl md:text-7xl font-heading font-bold tracking-[-0.03em] mb-6 sm:mb-8 text-white text-balance">
                Built to bring clarity to dental care
              </h1>
              <p className="text-xl md:text-2xl text-white/75 leading-relaxed max-w-3xl mx-auto">
                Pearlie is an independent dental matching platform founded in London by a dentist who saw how difficult
                it was for patients to navigate private dental care with confidence.
              </p>
            </div>
          </div>
        </section>

        <TrustBadgeStrip />

        {/* Our Clinic Network — two-row carousel */}
        <section className="py-12 sm:py-20 md:py-24 bg-card">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-[-0.03em] mb-6 text-foreground">
                Our clinic network
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Pearlie partners with independent, trusted dental clinics across the UK. All clinics are verified,{" "}
                <a href="https://www.gdc-uk.org/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">GDC-registered</a>,
                and committed to providing quality patient care.
              </p>
            </div>
          </div>

          {/* Full-width carousel — no container constraint */}
          <ClinicNetworkCarousel />
        </section>

        {/* What Pearlie Does — cream background with richer descriptions */}
        <section className="py-12 sm:py-20 md:py-28 bg-secondary">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12 sm:mb-16">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-[-0.03em] mb-6 text-foreground">
                  What Pearlie does
                </h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-6 lg:gap-8">
                <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-3 text-foreground">Match you with the right clinics</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Pearlie considers your treatment goals, location, budget, and personal preferences — recommending
                    clinics without bias.
                  </p>
                </div>

                <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-3 text-foreground">Provide transparent clinic profiles</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    We partner only with trusted, GDC-registered dentists across the UK and give you clear information
                    on availability and suitability.
                  </p>
                </div>

                <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                    <Heart className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-3 text-foreground">Let you compare and connect</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Review your options and message clinics directly — book only if you're ready, without obligation.
                  </p>
                </div>

                <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                    <Shield className="w-5 h-5 text-primary" />
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
        <section className="py-12 sm:py-20 md:py-28 bg-card">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-[-0.03em] mb-10 sm:mb-14 text-center text-foreground">
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

              {/* Founder quote — GEO: citable pull quote with attribution */}
              <blockquote className="mt-10 sm:mt-14 border-l-4 border-primary pl-6 py-2 max-w-3xl mx-auto">
                <p className="text-lg sm:text-xl text-foreground italic leading-relaxed">
                  &ldquo;Private dentistry should be transparent, accessible, and centred around patient confidence. Pearlie was created to bridge the gap between high-quality clinicians and patients who value clarity and trust.&rdquo;
                </p>
                <footer className="mt-3 text-sm text-muted-foreground">
                  — Dr Grei Muskaj, BDS, PGCert, Founder of Pearlie
                </footer>
              </blockquote>

              {/* Founder signature */}
              <div className="mt-12 sm:mt-16 text-center">
                <Image
                  src="/dr-grei-mustaj-signature.png"
                  alt="Dr Grei Muskaj signature"
                  width={400}
                  height={100}
                  className="h-12 w-auto opacity-80 mx-auto"
                />
                <p className="text-base font-semibold text-foreground mt-3">Dr Grei Muskaj, BDS, PGCert</p>
                <p className="text-sm text-muted-foreground mt-1">Founder &amp; CEO, Pearlie</p>
              </div>
            </div>
          </div>
        </section>

        {/* Our Commitment — cream background */}
        <section className="py-12 sm:py-20 md:py-28 bg-secondary">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-[-0.03em] mb-6 text-foreground">
                Our commitment
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                All clinics listed on Pearlie are independently verified and confirmed as registered with the{" "}
                <a href="https://www.gdc-uk.org/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">General Dental Council (GDC)</a>,
                ensuring they meet UK regulatory and professional standards. There are no hidden fees, no paid placements,
                and no misleading rankings. We continuously refine our matching so that every recommendation is based
                on fit — not advertising spend.
              </p>
            </div>
          </div>
        </section>

        {/* Our Promise: Pearlie Guarantee — dark teal background */}
        <section id="pearlie-guarantee" className="py-12 sm:py-20 md:py-28 bg-[#0d1019]">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: [
                  {
                    "@type": "Question",
                    name: "What does the Pearlie Guarantee cover?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "The Pearlie Guarantee covers two things: first, that every clinic listed on our platform has been verified for quality care and GDC registration. Second, if your experience with a Pearlie-matched clinic doesn't meet your expectations, we'll cover the cost of your next consultation or check-up at another clinic.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "How do I claim the Satisfaction Promise?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "Simply contact us at hello@pearlie.org within 30 days of your appointment. Let us know what happened and we'll arrange your next consultation or check-up fee at no cost to you.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "Does the guarantee apply to all treatments?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "The Satisfaction Promise applies to your initial consultation or check-up booked through Pearlie. It does not cover the outcome of specific clinical treatments, which are the responsibility of the treating clinic. However, every clinic on Pearlie must meet our quality standards.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "How are clinics verified?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "We check that every clinic is GDC-registered, has positive patient feedback, and offers transparent pricing. Clinics that don't meet our standards are not listed. We review our network on an ongoing basis to maintain quality.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "Is there a cost to use the Pearlie Guarantee?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "No. The Pearlie Guarantee is included for every patient who books through our platform. There are no hidden fees or extra charges.",
                    },
                  },
                ],
              }),
            }}
          />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              {/* Section header */}
              <div className="text-center mb-12 sm:mb-16">
                <div className="inline-flex items-center gap-2.5 mb-5">
                  <ShieldCheck className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-[-0.03em] mb-6 text-white">
                  Our promise: Pearlie Guarantee
                </h2>
                <p className="text-lg sm:text-xl text-white/75 max-w-3xl mx-auto leading-relaxed">
                  Every clinic on Pearlie is held to our quality standards — and backed by our promise to you.
                </p>
              </div>

              {/* Guarantee cards */}
              <div className="grid sm:grid-cols-3 gap-6 lg:gap-8 mb-14 sm:mb-20">
                <div className="bg-card/10 rounded-2xl p-6 sm:p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-5">
                    <BadgeCheck className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-3 text-white">Verified for Quality</h3>
                  <p className="text-sm text-white/70 leading-relaxed">
                      Every clinic is verified by Pearlie for{" "}
                    <a href="https://www.cqc.org.uk/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white">quality care</a>,
                    transparent pricing, and GDC registration.
                  </p>
                </div>

                <div className="bg-card/10 rounded-2xl p-6 sm:p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-5">
                    <Heart className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-3 text-white">Satisfaction Promise</h3>
                  <p className="text-sm text-white/70 leading-relaxed">
                    If your new Pearlie dentist doesn&apos;t meet your expectations, we&apos;ll cover your next consultation or check-up fee.
                  </p>
                </div>

                <div className="bg-card/10 rounded-2xl p-6 sm:p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-5">
                    <MessageCircle className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-3 text-white">Ongoing Support</h3>
                  <p className="text-sm text-white/70 leading-relaxed">
                    Our team is here to help before, during, and after your booking. You&apos;re never left on your own.
                  </p>
                </div>
              </div>

              {/* FAQ-style answers about the guarantee */}
              <div className="max-w-3xl mx-auto">
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-6">
                  Questions about the guarantee
                </h3>
                <Accordion type="single" collapsible className="space-y-3">
                  <AccordionItem value="g-1" className="border-none rounded-lg px-4 sm:px-6 bg-white/10">
                    <AccordionTrigger className="text-left text-base font-semibold hover:no-underline text-white">
                      What does the Pearlie Guarantee cover?
                    </AccordionTrigger>
                    <AccordionContent className="text-white/70 leading-relaxed">
                      The Pearlie Guarantee covers two things: first, that every clinic listed on our platform has been
                      verified for quality care and GDC registration. Second, if your experience with a Pearlie-matched
                      clinic doesn&apos;t meet your expectations, we&apos;ll cover the cost of your next consultation or check-up
                      at another clinic.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="g-2" className="border-none rounded-lg px-4 sm:px-6 bg-white/10">
                    <AccordionTrigger className="text-left text-base font-semibold hover:no-underline text-white">
                      How do I claim the Satisfaction Promise?
                    </AccordionTrigger>
                    <AccordionContent className="text-white/70 leading-relaxed">
                      Simply contact us at{" "}
                      <a href="mailto:hello@pearlie.org" className="text-primary hover:underline">hello@pearlie.org</a>{" "}
                      within 30 days of your appointment. Let us know what happened and we&apos;ll arrange your next
                      consultation or check-up fee at no cost to you.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="g-3" className="border-none rounded-lg px-4 sm:px-6 bg-white/10">
                    <AccordionTrigger className="text-left text-base font-semibold hover:no-underline text-white">
                      Does the guarantee apply to all treatments?
                    </AccordionTrigger>
                    <AccordionContent className="text-white/70 leading-relaxed">
                      The Satisfaction Promise applies to your initial consultation or check-up booked through Pearlie.
                      It does not cover the outcome of specific clinical treatments, which are the responsibility of the
                      treating clinic. However, every clinic on Pearlie must meet our quality standards.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="g-4" className="border-none rounded-lg px-4 sm:px-6 bg-white/10">
                    <AccordionTrigger className="text-left text-base font-semibold hover:no-underline text-white">
                      How are clinics verified?
                    </AccordionTrigger>
                    <AccordionContent className="text-white/70 leading-relaxed">
                      We check that every clinic is GDC-registered, has positive patient feedback, and offers transparent
                      pricing. Clinics that don&apos;t meet our standards are not listed. We review our network on an ongoing
                      basis to maintain quality.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="g-5" className="border-none rounded-lg px-4 sm:px-6 bg-white/10">
                    <AccordionTrigger className="text-left text-base font-semibold hover:no-underline text-white">
                      Is there a cost to use the Pearlie Guarantee?
                    </AccordionTrigger>
                    <AccordionContent className="text-white/70 leading-relaxed">
                      No. The Pearlie Guarantee is included for every patient who books through our platform. There are
                      no hidden fees or extra charges.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          </div>
        </section>

        {/* Pearlie in Numbers — concrete stats */}
        <section className="py-12 sm:py-20 md:py-28 bg-card">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-[-0.03em] mb-6 text-foreground">
                Pearlie in numbers
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mt-10">
                <div>
                  <div className="text-3xl md:text-4xl font-bold text-primary">500+</div>
                  <p className="text-sm text-muted-foreground mt-2">Practices across London</p>
                </div>
                <div>
                  <div className="text-3xl md:text-4xl font-bold text-primary">98%</div>
                  <p className="text-sm text-muted-foreground mt-2">Patient satisfaction</p>
                </div>
                <div>
                  <div className="text-3xl md:text-4xl font-bold text-primary">60s</div>
                  <p className="text-sm text-muted-foreground mt-2">Average booking time</p>
                </div>
                <div>
                  <div className="text-3xl md:text-4xl font-bold text-primary">10+</div>
                  <p className="text-sm text-muted-foreground mt-2">Treatment categories available</p>
                </div>
              </div>
              <p className="text-muted-foreground mt-8 max-w-2xl mx-auto leading-relaxed">
                Pearlie is building one of the most transparent private dental networks in the UK — combining verified
                clinicians, direct messaging, and structured patient matching.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section — cream background, single clear action */}
        <section className="py-12 sm:py-20 md:py-28 bg-secondary">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-[-0.03em] mb-6 text-foreground">
                Ready to find your clinic match?
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground mb-10 leading-relaxed">
                Answer a few questions about your dental needs and get matched with clinics that are right for you.
              </p>
              <Button
                size="lg"
                className="text-lg px-10 py-6 h-auto bg-primary hover:bg-[var(--primary-hover)] text-white rounded-full font-normal transition-all"
                asChild
              >
                <Link href="/intake">Get my clinic matches</Link>
              </Button>
              <div className="flex flex-wrap gap-3 justify-center mt-6">
                <Button size="lg" variant="outline" className="rounded-full border-border text-foreground" asChild>
                  <Link href="/faq">Read our FAQ</Link>
                </Button>
                <Button size="lg" variant="outline" className="rounded-full border-border text-foreground" asChild>
                  <Link href="/our-mission">Our Mission</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
