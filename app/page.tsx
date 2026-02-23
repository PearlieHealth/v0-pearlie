import { Button } from "@/components/ui/button"
import { Star, CheckCircle2, ArrowRight, Shield, Sparkles, MapPin, CalendarCheck, MessageCircle } from "lucide-react"
import Link from "next/link"
import { MainNav } from "@/components/main-nav"
import { ComparisonTable } from "@/components/comparison-table"
import { Badge } from "@/components/ui/badge"
import ClinicCarousel from "@/components/clinic-carousel"
import { ScrollingMarquee } from "@/components/scrolling-marquee"
import { SiteFooter } from "@/components/site-footer"
import { HeroSection } from "@/components/homepage/hero-section"
import { PatientExperiences } from "@/components/homepage/patient-experiences"
import { FindClinicButton } from "@/components/homepage/find-clinic-button"

const marqueeItems = [
  { text: "Trusted UK Clinics", icon: <Shield className="w-3.5 h-3.5" /> },
  { text: "Free to Use", icon: <Sparkles className="w-3.5 h-3.5" /> },
  { text: "Independent Platform", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  { text: "Live Chat with Clinics", icon: <MessageCircle className="w-3.5 h-3.5" /> },
  { text: "Book Directly Online", icon: <CalendarCheck className="w-3.5 h-3.5" /> },
]

export default function Home() {
  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: "How to Find the Right Dental Clinic with Pearlie",
            description: "Match with trusted, GDC-registered dental clinics in London and the UK in three simple steps.",
            step: [
              {
                "@type": "HowToStep",
                position: 1,
                name: "Tell us what you're looking for",
                text: "Answer a few simple questions about your treatment, budget, location, and preferences. It only takes a minute.",
              },
              {
                "@type": "HowToStep",
                position: 2,
                name: "We match you with the right clinics",
                text: "Based on your answers, we suggest carefully reviewed clinics in London that meet our standards for quality and transparency.",
              },
              {
                "@type": "HowToStep",
                position: 3,
                name: "Compare, chat, and book",
                text: "Compare clinics side-by-side, chat directly with them, and book online when you're ready. All in one place.",
              },
            ],
          }),
        }}
      />
      <MainNav />

      {/* Hero section — client island (loading animation, video, localStorage, motion) */}
      <HeroSection />

      {/* Scrolling Marquee */}
      <ScrollingMarquee items={marqueeItems} speed={35} />

      {/* How it works section — fully server-rendered */}
      <section id="how-it-works" className="py-16 md:pt-8 md:pb-11 lg:pt-10 lg:pb-13 bg-white relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Section header */}
            <div className="text-center mb-12 md:mb-8">
              <h2 className="text-[2rem] sm:text-[2.6rem] md:text-[2.6rem] lg:text-[3.25rem] font-heading font-bold tracking-[-0.03em] text-[#004443]">
                How It Works
              </h2>
            </div>

            {/* Step 1 - Image Left, Text Right */}
            <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-8 mb-14 md:mb-10">
              {/* Illustration */}
              <div className="flex-1 flex justify-center lg:justify-end">
                <div className="relative w-full max-w-[280px] lg:max-w-[230px] scale-[0.7] lg:scale-100 origin-top -mb-[80px] lg:mb-0">
                  <span className="absolute -top-6 -left-2 lg:-left-8 text-8xl lg:text-8xl font-bold text-[#004443]/20 select-none leading-none z-0">01</span>
                  <div className="relative bg-gradient-to-br from-secondary/50 to-secondary rounded-[32px] p-4 lg:p-3 shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-border">
                    <div className="bg-white rounded-2xl p-4 lg:p-3 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-primary/20 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="h-3 w-32 bg-border/50 rounded-full" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border/60">
                          <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                          </div>
                          <span className="text-sm text-primary font-medium">Dental Implants</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-border/60">
                          <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                          <span className="text-sm text-muted-foreground">Cosmetic Dentistry</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-border/60">
                          <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                          <span className="text-sm text-muted-foreground">General Checkup</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 text-center lg:text-left">
                <h3 className="text-xl sm:text-2xl md:text-2xl font-bold mb-2 text-[#004443]">
                  Tell us what you&apos;re looking for
                </h3>
                <p className="text-base md:text-[0.9rem] text-muted-foreground leading-snug max-w-md mx-auto lg:mx-0">
                  Answer a few simple questions about your treatment, budget, location, and preferences. It only takes a minute.
                </p>
              </div>
            </div>

            {/* Step 2 - Text Left, Image Right */}
            <div className="flex flex-col lg:flex-row-reverse items-center gap-6 lg:gap-8 mb-14 md:mb-10">
              <div className="flex-1 flex justify-center lg:justify-start">
                <div className="relative w-full max-w-[280px] lg:max-w-[230px] scale-[0.7] lg:scale-100 origin-top -mb-[80px] lg:mb-0">
                  <span className="absolute -top-6 -right-2 lg:-right-8 text-8xl lg:text-8xl font-bold text-[#004443]/20 select-none leading-none z-0">02</span>
                  <div className="relative bg-gradient-to-br from-secondary/50 to-secondary rounded-[32px] p-6 lg:p-3 shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-border">
                    <div className="space-y-4 lg:space-y-2">
                      <div className="bg-white rounded-2xl p-4 shadow-sm border border-border/60">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary to-primary/20 flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="h-3 w-28 bg-foreground rounded-full mb-2" />
                            <div className="flex items-center gap-1 mb-1">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <Star
                                  key={i}
                                  className="w-3 h-3 fill-amber-400 text-amber-400"
                                />
                              ))}
                            </div>
                            <div className="h-2 w-20 bg-muted rounded-full" />
                          </div>
                          <Badge className="bg-secondary text-primary text-xs">98%</Badge>
                        </div>
                      </div>
                      <div className="bg-white rounded-2xl p-4 shadow-sm border border-border/60">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary to-primary/20 flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="h-3 w-24 bg-foreground rounded-full mb-2" />
                            <div className="flex items-center gap-1 mb-1">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <Star
                                  key={i}
                                  className="w-3 h-3 fill-amber-400 text-amber-400"
                                />
                              ))}
                            </div>
                            <div className="h-2 w-16 bg-muted rounded-full" />
                          </div>
                          <Badge className="bg-secondary text-primary text-xs">94%</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 text-center lg:text-left">
                <h3 className="text-xl sm:text-2xl md:text-2xl font-bold mb-2 text-[#004443]">
                  We match you with the right clinics
                </h3>
                <p className="text-base md:text-[0.9rem] text-muted-foreground leading-snug max-w-md mx-auto lg:mx-0">
                  Based on your answers, we suggest carefully reviewed clinics in London that meet our standards for quality and transparency — so you&apos;re not overwhelmed with endless searching.
                </p>
              </div>
            </div>

            {/* Step 3 - Image Left, Text Right */}
            <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-8">
              <div className="flex-1 flex justify-center lg:justify-end">
                <div className="relative w-full max-w-[280px] lg:max-w-[230px] scale-[0.7] lg:scale-100 origin-top -mb-[80px] lg:mb-0">
                  <span className="absolute -top-6 -left-2 lg:-left-8 text-8xl lg:text-8xl font-bold text-[#004443]/20 select-none leading-none z-0">03</span>
                  <div className="relative bg-gradient-to-br from-secondary/50 to-secondary rounded-[32px] p-6 lg:p-3 shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-border">
                    <div className="bg-white rounded-2xl p-5 lg:p-3 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <CalendarCheck className="w-5 h-5 text-primary" />
                          <span className="text-sm font-semibold text-foreground">Choose your time</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-7 gap-1 mb-4">
                        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                          <div key={i} className="text-center text-xs text-muted-foreground py-1">
                            {d}
                          </div>
                        ))}
                        {[...Array(14)].map((_, i) => (
                          <div
                            key={i}
                            className={`aspect-square rounded-lg flex items-center justify-center text-xs ${
                              i === 8
                                ? "bg-primary text-white font-semibold"
                                : i === 5 || i === 6 || i === 12 || i === 13
                                  ? "bg-secondary/50 text-muted-foreground"
                                  : "bg-secondary text-primary"
                            }`}
                          >
                            {i + 10}
                          </div>
                        ))}
                      </div>
                      <Button className="w-full bg-primary hover:bg-[var(--primary-hover)] text-white rounded-xl h-10 text-sm" asChild>
                        <Link href="/intake">Request appointment</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 text-center lg:text-left">
                <h3 className="text-xl sm:text-2xl md:text-2xl font-bold mb-2 text-[#004443]">
                  Compare. Chat. Book.
                </h3>
                <p className="text-base md:text-[0.9rem] text-muted-foreground leading-snug max-w-md mx-auto lg:mx-0">
                  Compare clinics side-by-side, chat directly with them, and book online when you&apos;re ready. All in one place.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted clinics section — server-rendered text with client carousel */}
      <section className="py-16 md:pt-20 md:pb-28 lg:pt-24 lg:pb-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              <ClinicCarousel />

              <div className="lg:pl-4">
                <span className="inline-block text-xs font-extrabold tracking-[0.08em] uppercase text-[#004443] mb-4">
                  Quality &amp; Trust
                </span>

                <h2 className="text-3xl sm:text-4xl md:text-[3rem] font-heading font-bold tracking-[-0.03em] mb-6 text-[#004443] leading-[1.05]">
                  We shortlist.<br />You decide.<br /><span className="text-[#0fbcb0]">With confidence.</span>
                </h2>

                <p className="text-lg text-muted-foreground leading-snug mb-4">
                  Whether you&apos;re considering Invisalign, dental implants, composite bonding, veneers, teeth whitening, or
                  emergency dental care — Pearlie matches you with verified private dental clinics across London.
                </p>
                <p className="text-lg text-muted-foreground leading-snug mb-8">
                  Every clinic is carefully reviewed for clinical standards, transparency, and patient experience. All clinics are verified as{" "}
                  <a href="https://www.gdc-uk.org/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[#004443]">GDC-registered</a>.
                  Our network includes 20+ verified clinics across 20+ London boroughs — and we focus on quality over quantity.
                </p>

                <div className="space-y-3 mb-10">
                  {[
                    "Personally reviewed by Pearlie",
                    "Transparent pricing & clear communication",
                    "Highly rated for patient care and results",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-[#0fbcb0] flex-shrink-0" />
                      <span className="text-foreground font-medium">{item}</span>
                    </div>
                  ))}
                </div>

                <FindClinicButton />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison table — client component */}
      <ComparisonTable />

      {/* Patient Experiences — client island */}
      <PatientExperiences />

      {/* CTA section — server-rendered with client button */}
      <section className="py-24 md:pt-24 md:pb-32 lg:pt-28 lg:pb-36 bg-[#004443] text-white relative overflow-hidden">
        <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-white/[0.03] blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full bg-[#0fbcb0]/[0.08] blur-2xl pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-heading font-bold tracking-[-0.03em] mb-6 text-balance">
              Ready to find the right dental clinic for you?
            </h2>
            <p className="text-lg md:text-xl mb-10 opacity-90 leading-snug">
              Answer a few quick questions and we&apos;ll match you with trusted clinics near you.
            </p>
            <FindClinicButton
              size="lg"
              className="text-base px-10 h-16 bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full transition-all duration-700 ease-[cubic-bezier(0.66,0,0.1,1)] text-lg font-normal border-0"
            >
              Find my clinic
              <ArrowRight className="ml-2 w-5 h-5" />
            </FindClinicButton>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
