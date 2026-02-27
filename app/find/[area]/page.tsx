import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { MapPin, Search, Shield, CheckCircle2, Lock, MessageSquare, Sparkles, Star, CalendarCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { MainNav } from "@/components/main-nav"
import { SiteFooter } from "@/components/site-footer"
import { BreadcrumbSchema } from "@/components/breadcrumb-schema"
import { LocationClinicCard } from "@/components/find/location-clinic-card"
import { LocationJsonLd } from "@/components/find/location-jsonld"
import { HeroPostcodeSearch } from "@/components/find/hero-postcode-search"
import { StickyPostcodeBar } from "@/components/find/sticky-postcode-bar"
import { QuickFacts } from "@/components/find/quick-facts"
import {
  LONDON_AREAS,
  LONDON_REGIONS,
  getAreaBySlug,
  getRegionBySlug,
  getAreasForRegion,
  getAllRegionSlugs,
} from "@/lib/locations/london"
import { getClinicsNearArea, getClinicsNearRegion } from "@/lib/locations/queries"

export const revalidate = 3600

interface PageProps {
  params: Promise<{ area: string }>
}

export async function generateStaticParams() {
  const areaSlugs = LONDON_AREAS.map((area) => ({ area: area.slug }))
  const regionSlugs = getAllRegionSlugs().map((slug) => ({ area: slug }))
  return [...areaSlugs, ...regionSlugs, { area: "dentist-near-me" }]
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { area: slug } = await params

  // Dentist near me
  if (slug === "dentist-near-me") {
    return {
      title: "Dentist Near Me | Find Trusted Local Dentists | Pearlie",
      description:
        "Find trusted, GDC-registered dentists near you. Enter your postcode, compare clinics and get matched in minutes. Free, secure and no obligation.",
      alternates: { canonical: "https://pearlie.org/find/dentist-near-me" },
      openGraph: {
        title: "Dentist Near Me | Find Trusted Local Dentists | Pearlie",
        description: "Find trusted, GDC-registered dentists near you. Enter your postcode, compare clinics and get matched in minutes.",
        url: "https://pearlie.org/find/dentist-near-me",
      },
    }
  }

  // Region
  const region = getRegionBySlug(slug)
  if (region) {
    return {
      title: region.metaTitle + " | Pearlie",
      description: region.metaDescription,
      alternates: { canonical: `https://pearlie.org/find/${region.slug}` },
      openGraph: {
        title: region.metaTitle,
        description: region.metaDescription,
        url: `https://pearlie.org/find/${region.slug}`,
      },
    }
  }

  // Area
  const area = getAreaBySlug(slug)
  if (!area) return {}

  return {
    title: area.metaTitle,
    description: area.metaDescription,
    alternates: { canonical: `https://pearlie.org/find/${area.slug}` },
    openGraph: {
      title: area.metaTitle,
      description: area.metaDescription,
      url: `https://pearlie.org/find/${area.slug}`,
    },
  }
}

// ─── "Dentist Near Me" Page ──────────────────────────────────────

const TRUST_ITEMS = [
  {
    icon: CheckCircle2,
    title: "GDC-registered clinics only",
    desc: "Every dental practice on Pearlie is verified against the General Dental Council register.",
  },
  {
    icon: Search,
    title: "Verified profiles & transparent pricing",
    desc: "See real reviews, treatment lists, and indicative pricing before you book.",
  },
  {
    icon: Lock,
    title: "Secure messaging",
    desc: "Message clinics directly through Pearlie. Your data stays protected.",
  },
  {
    icon: Shield,
    title: "No spam. No pressure.",
    desc: "We only share your details with clinics you choose. No cold calls, no marketing lists.",
  },
]

const DENTIST_NEAR_ME_FAQ = [
  {
    q: "How much does a private dentist cost in London?",
    a: "A standard private dental check-up in London typically costs between £60 and £150. Common treatments range widely: teeth whitening from £250–£1,000, Invisalign from £2,500–£5,500, composite bonding from £150–£400 per tooth, veneers from £400–£1,200 per tooth, and dental implants from £2,000–£6,000 per implant. Costs vary by area — Central London practices tend to charge 30–50% more than outer boroughs.",
  },
  {
    q: "What should I look for when choosing a dentist?",
    a: "Start by checking they're registered with the General Dental Council (GDC) — this is the minimum standard for any dentist in the UK. Beyond that, look at patient reviews, the range of treatments offered, pricing transparency, and whether their hours fit your schedule. If you need specialist treatment, check whether the dentist has specific qualifications or accreditations in that area. Pearlie lets you compare all of this side-by-side for verified clinics.",
  },
  {
    q: "How often should I visit the dentist?",
    a: "The NHS recommends dental check-ups at intervals ranging from 3 months to 24 months, depending on your oral health. Most dentists advise a check-up every 6 to 12 months for adults. Regular visits help catch issues like decay, gum disease, and oral cancer early — when they're far easier and cheaper to treat.",
  },
  {
    q: "What's the difference between an NHS dentist and a private dentist?",
    a: "NHS dentistry covers essential treatments at fixed Band 1–3 prices (£26.80–£306.10 in England), but availability is severely limited — 5.6 million people in England tried and failed to get an NHS appointment in 2024. Private dentists offer faster access, more treatment options (especially cosmetic), longer appointments, and continuity of care, but at higher prices. Some clinics offer both NHS and private services.",
  },
  {
    q: "How do I find an emergency dentist near me?",
    a: "For a dental emergency — severe toothache, a knocked-out tooth, swelling, or a broken tooth — call NHS 111 for urgent advice. If you need same-day treatment, many private clinics offer emergency appointments. Emergency consultations in London typically cost £50–£150. For life-threatening situations (heavy bleeding, difficulty breathing), call 999 or go to A&E.",
  },
  {
    q: "What happens during a dental check-up?",
    a: "A standard check-up usually takes 20–30 minutes. Your dentist will examine your teeth, gums, and mouth for signs of decay, gum disease, and other issues. They may take X-rays to check for problems below the surface. Many dentists also include an oral cancer screening. You'll leave with a treatment plan if anything needs attention, and advice on maintaining your oral health.",
  },
  {
    q: "Can I find a dentist for nervous patients?",
    a: "Yes — many dental practices in London specialise in treating nervous or anxious patients. Look for clinics that offer sedation dentistry (oral sedation or IV sedation), longer appointment times, and a patient-first approach. Some clinics on Pearlie specifically highlight their experience with dental anxiety. Don't let fear keep you from getting care — modern dentistry has come a long way.",
  },
  {
    q: "How much does Invisalign cost in London?",
    a: "Invisalign in London typically costs between £2,500 and £5,500 depending on complexity. Invisalign Lite (for minor corrections) starts around £2,500, while Invisalign Comprehensive (for more complex cases) ranges from £3,500–£5,500. Many clinics offer 0% finance over 12–24 months. Treatment usually takes 6–18 months.",
  },
  {
    q: "Is Pearlie free to use?",
    a: "Completely free. Pearlie is a free service for patients — there are no hidden fees, no subscription, and no obligation to book. You can compare private dentists, message clinics, and book appointments at no cost. Pearlie is funded by participating clinics, not by patients.",
  },
  {
    q: "What are the most common dental problems?",
    a: "The most common dental issues are tooth decay (cavities), gum disease (gingivitis and periodontitis), tooth sensitivity, and cracked or chipped teeth. In the UK, around 31% of adults have visible tooth decay, and nearly half of adults show signs of gum disease. Most of these are preventable with regular check-ups, good brushing habits, and limiting sugary foods and drinks.",
  },
  {
    q: "Can I find a dentist open on Saturdays?",
    a: "Yes. Many private dental clinics in London offer Saturday appointments, and some are open on Sundays. Weekend availability varies by area — clinics in busier areas like Canary Wharf, Clapham, and Shoreditch are more likely to offer weekend hours. You can specify your preferred days when using Pearlie and we'll prioritise clinics that match.",
  },
  {
    q: "How do I know if a dentist is qualified?",
    a: "Every practising dentist in the UK must be registered with the General Dental Council (GDC). You can verify any dentist's registration at gdc-uk.org. Look for 'BDS' (Bachelor of Dental Surgery) or 'BChD' after their name — these are the standard UK dental qualifications. For specialist treatments, check for additional qualifications like MSc, PGDip, or membership of relevant specialist societies. All dentists on Pearlie are independently verified against the GDC register.",
  },
]

function DentistNearMePage() {
  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://pearlie.org" },
          { name: "Find a Dentist", url: "https://pearlie.org/find" },
          { name: "Dentist Near Me", url: "https://pearlie.org/find/dentist-near-me" },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: DENTIST_NEAR_ME_FAQ.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: {
                "@type": "Answer",
                text: item.a,
              },
            })),
          }),
        }}
      />
      <MainNav />
      <StickyPostcodeBar />

      <main>
        {/* Hero — matches main landing page gradient */}
        <section className="relative pt-28 pb-16 sm:pt-32 sm:pb-20 md:pt-36 md:pb-24 bg-gradient-to-b from-[#004443] via-[#00524f] to-[#004443] overflow-hidden">
          {/* Subtle background glow */}
          <div
            className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-10 pointer-events-none blur-[120px] hidden md:block"
            style={{ background: "radial-gradient(circle, rgba(15, 188, 176, 0.4) 0%, transparent 70%)" }}
          />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-heading font-bold tracking-[-0.03em] mb-6 text-white text-balance">
                Dentist Near You — Trusted, GDC-Registered Clinics
              </h1>
              <p className="text-lg sm:text-xl text-white/75 leading-relaxed max-w-2xl mx-auto mb-10">
                Enter your postcode and we&apos;ll match you with verified dental clinics based on your treatment needs and availability.
              </p>
              <div id="hero-postcode-search">
                <HeroPostcodeSearch variant="hero" />
              </div>
            </div>
          </div>
        </section>

        {/* How it works — horizontal with illustrations */}
        <section className="py-16 sm:py-20 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] mb-12 text-[#004443] text-center">
                How it works
              </h2>
              <div className="grid gap-8 sm:grid-cols-3">
                {/* Step 1 — Tell us what you need */}
                <div className="text-center">
                  <div className="relative mx-auto mb-6 max-w-[180px]">
                    <span className="absolute -top-4 -left-2 text-6xl font-bold text-[#004443]/10 select-none leading-none z-0">01</span>
                    <div className="relative bg-gradient-to-br from-secondary/50 to-secondary rounded-[24px] p-3 shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-border">
                      <div className="bg-white rounded-xl p-3 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-secondary to-primary/20 flex items-center justify-center">
                            <Sparkles className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div className="h-2.5 w-20 bg-border/50 rounded-full" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 border border-border/60">
                            <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-primary" />
                            </div>
                            <span className="text-[10px] text-primary font-medium">Dental Implants</span>
                          </div>
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-white border border-border/60">
                            <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                            <span className="text-[10px] text-muted-foreground">Cosmetic Dentistry</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <h3 className="font-semibold text-foreground text-lg mb-2">Tell us what you need</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">Answer a few simple questions about your treatment, budget, and preferences.</p>
                </div>

                {/* Step 2 — We match you */}
                <div className="text-center">
                  <div className="relative mx-auto mb-6 max-w-[180px]">
                    <span className="absolute -top-4 -left-2 text-6xl font-bold text-[#004443]/10 select-none leading-none z-0">02</span>
                    <div className="relative bg-gradient-to-br from-secondary/50 to-secondary rounded-[24px] p-3 shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-border">
                      <div className="space-y-2">
                        <div className="bg-white rounded-xl p-3 shadow-sm border border-border/60">
                          <div className="flex items-start gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-secondary to-primary/20 flex items-center justify-center flex-shrink-0">
                              <MapPin className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="h-2.5 w-16 bg-foreground rounded-full mb-1.5" />
                              <div className="flex items-center gap-0.5 mb-1">
                                {[1, 2, 3, 4, 5].map((i) => (
                                  <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                ))}
                              </div>
                              <div className="h-2 w-12 bg-muted rounded-full" />
                            </div>
                          </div>
                        </div>
                        <div className="bg-white rounded-xl p-3 shadow-sm border border-border/60">
                          <div className="flex items-start gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-secondary to-primary/20 flex items-center justify-center flex-shrink-0">
                              <MapPin className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="h-2.5 w-14 bg-foreground rounded-full mb-1.5" />
                              <div className="flex items-center gap-0.5 mb-1">
                                {[1, 2, 3, 4, 5].map((i) => (
                                  <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                ))}
                              </div>
                              <div className="h-2 w-10 bg-muted rounded-full" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <h3 className="font-semibold text-foreground text-lg mb-2">We match you with the right clinics</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">Verified, GDC-registered clinics selected based on your needs — not just the nearest.</p>
                </div>

                {/* Step 3 — Compare, chat, book */}
                <div className="text-center">
                  <div className="relative mx-auto mb-6 max-w-[180px]">
                    <span className="absolute -top-4 -left-2 text-6xl font-bold text-[#004443]/10 select-none leading-none z-0">03</span>
                    <div className="relative bg-gradient-to-br from-secondary/50 to-secondary rounded-[24px] p-3 shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-border">
                      <div className="bg-white rounded-xl p-3 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1.5">
                            <CalendarCheck className="w-3.5 h-3.5 text-primary" />
                            <span className="text-[10px] font-semibold text-foreground">Choose your time</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-7 gap-0.5 mb-3">
                          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                            <div key={i} className="text-center text-[8px] text-muted-foreground py-0.5">{d}</div>
                          ))}
                          {[...Array(7)].map((_, i) => (
                            <div
                              key={i}
                              className={`aspect-square rounded flex items-center justify-center text-[8px] ${
                                i === 3 ? "bg-primary text-white font-semibold" : "bg-secondary text-primary"
                              }`}
                            >
                              {i + 10}
                            </div>
                          ))}
                        </div>
                        <div className="w-full bg-primary text-white text-[10px] font-medium py-1.5 rounded-lg text-center">
                          Request appointment
                        </div>
                      </div>
                    </div>
                  </div>
                  <h3 className="font-semibold text-foreground text-lg mb-2">Compare. Chat. Book.</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">Compare clinics side-by-side, chat directly, and book when you&apos;re ready.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why patients trust Pearlie */}
        <section className="py-16 sm:py-20 bg-[#faf9f6]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] mb-12 text-[#004443] text-center">
                Why patients trust Pearlie
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {TRUST_ITEMS.map((item) => (
                  <div
                    key={item.title}
                    className="p-6 rounded-2xl bg-white border border-border/40 text-center"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#0fbcb0]/10 flex items-center justify-center mx-auto mb-4">
                      <item.icon className="w-6 h-6 text-[#0fbcb0]" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2 text-sm">{item.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Frequently asked questions */}
        <section className="py-16 sm:py-20 bg-[#faf3e6]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] mb-10 text-[#004443]">
                Frequently asked questions
              </h2>
              <Accordion type="single" collapsible className="space-y-3">
                {DENTIST_NEAR_ME_FAQ.map((item, i) => (
                  <AccordionItem
                    key={i}
                    value={`faq-${i}`}
                    className="border-none rounded-lg px-4 sm:px-6 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
                  >
                    <AccordionTrigger className="text-left text-base font-semibold hover:no-underline text-foreground">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* Quick Facts */}
        <QuickFacts
          areaName="London"
          clinicCount={20}
          content="London has over 4,500 registered dental practices — more than any other city in the UK — yet finding the right one remains a challenge for most patients. According to the British Dental Association, 5.6 million people in England tried but failed to get an NHS dental appointment in 2024, and 69% of those turned to private care. The average private check-up in London costs £60–£150, with costs varying significantly by area: Central London practices charge 30–50% more than outer boroughs. Cosmetic treatments are a major driver of private dental growth, with Invisalign, teeth whitening, and composite bonding accounting for the fastest-rising categories of dental spend across the capital."
        />

        {/* Bottom CTA */}
        <section className="py-16 sm:py-24 bg-[#004443]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl sm:text-4xl font-heading font-bold tracking-[-0.03em] mb-6 text-white">
                Ready to find your dentist?
              </h2>
              <p className="text-lg text-white/75 mb-8 leading-relaxed">
                Answer a few questions and get matched with clinics that are right for you — free and fast.
              </p>
              <Button
                size="lg"
                className="text-lg px-10 py-6 h-auto bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full font-normal transition-all"
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

// ─── Region Page ─────────────────────────────────────────────────

async function RegionPage({ slug }: { slug: string }) {
  const region = getRegionBySlug(slug)
  if (!region) notFound()

  const clinics = await getClinicsNearRegion(region)
  const subAreas = getAreasForRegion(region)

  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://pearlie.org" },
          { name: "Find a Dentist", url: "https://pearlie.org/find" },
          { name: region.name, url: `https://pearlie.org/find/${region.slug}` },
        ]}
      />
      <LocationJsonLd area={region} clinics={clinics} />
      <MainNav />
      <StickyPostcodeBar />

      <main>
        {/* Hero */}
        <section className="pt-28 pb-14 sm:pt-32 sm:pb-18 md:pt-36 md:pb-20 bg-[#004443]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-heading font-bold tracking-[-0.03em] mb-6 text-white text-balance">
                Find a Dentist in {region.name}
              </h1>
              <p className="text-lg sm:text-xl text-white/75 leading-relaxed max-w-3xl mx-auto mb-4">
                {region.intro}
              </p>
              <p className="text-sm text-white/50 mb-8">
                {clinics.length} verified {clinics.length === 1 ? "clinic" : "clinics"} in {region.name}
              </p>
              <div id="hero-postcode-search">
                <HeroPostcodeSearch variant="hero" />
              </div>
            </div>
          </div>
        </section>

        {/* Description */}
        <section className="py-10 sm:py-14 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                {region.description}
              </p>
              <Button
                size="lg"
                className="bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full font-normal transition-all"
                asChild
              >
                <Link href="/intake">
                  <Search className="w-4 h-4 mr-2" />
                  Get matched with a clinic in {region.name}
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Sub-areas */}
        {subAreas.length > 0 && (
          <section className="py-10 sm:py-14 bg-[#faf9f6]">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-5xl mx-auto">
                <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] mb-8 text-[#004443]">
                  Neighbourhoods in {region.name}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {subAreas.map((area) => (
                    <Link
                      key={area.slug}
                      href={`/find/${area.slug}`}
                      className="group flex items-start gap-4 p-5 rounded-xl bg-white border border-border/50 hover:border-[#0fbcb0]/40 hover:shadow-md transition-all"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#0fbcb0]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#0fbcb0]/20 transition-colors">
                        <MapPin className="w-5 h-5 text-[#0fbcb0]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground group-hover:text-[#004443] transition-colors">
                          Dentists in {area.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">{area.intro}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Clinic Cards — horizontal scroll */}
        {clinics.length > 0 && (
          <section className="py-10 sm:py-14 bg-white overflow-hidden">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-5xl mx-auto">
                <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] mb-8 text-[#004443]">
                  Dental clinics in {region.name}
                </h2>
              </div>
            </div>
            <div className="flex gap-4 md:gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide px-4 sm:px-6 lg:px-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] pb-4 -mb-4">
              {clinics.map((clinic) => (
                <LocationClinicCard key={clinic.id} clinic={clinic} />
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        {region.faq.length > 0 && (
          <section className="py-10 sm:py-14 bg-[#faf3e6]">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] mb-8 text-[#004443]">
                  Common questions about dentists in {region.name}
                </h2>
                <Accordion type="single" collapsible className="space-y-3">
                  {region.faq.map((item, i) => (
                    <AccordionItem
                      key={i}
                      value={`faq-${i}`}
                      className="border-none rounded-lg px-4 sm:px-6 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
                    >
                      <AccordionTrigger className="text-left text-base font-semibold hover:no-underline text-foreground">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </section>
        )}

        {/* Other regions */}
        <section className="py-10 sm:py-14 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] mb-6 text-[#004443]">
                Explore other areas of London
              </h2>
              <div className="flex flex-wrap gap-3">
                {LONDON_REGIONS.filter((r) => r.slug !== region.slug).map((r) => (
                  <Link
                    key={r.slug}
                    href={`/find/${r.slug}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-border/60 hover:border-[#0fbcb0]/40 hover:bg-[#0fbcb0]/5 text-sm font-medium text-foreground transition-all"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#0fbcb0]" />
                    Dentists in {r.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Quick Facts */}
        <QuickFacts areaName={region.name} clinicCount={clinics.length} content={region.quickFacts} />

        {/* Bottom CTA */}
        <section className="py-12 sm:py-20 bg-[#004443]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl sm:text-4xl font-heading font-bold tracking-[-0.03em] mb-6 text-white">
                Ready to find your dentist in {region.name}?
              </h2>
              <p className="text-lg text-white/75 mb-8 leading-relaxed">
                Answer a few questions about your dental needs and get matched with clinics that are right for you.
              </p>
              <Button
                size="lg"
                className="text-lg px-10 py-6 h-auto bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full font-normal transition-all"
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

// ─── Area Page (original) ────────────────────────────────────────

async function AreaPage({ slug }: { slug: string }) {
  const area = getAreaBySlug(slug)
  if (!area) notFound()

  const clinics = await getClinicsNearArea(area)
  if (clinics.length === 0) notFound()

  const nearbyAreas = area.nearbyAreas
    .map((s) => getAreaBySlug(s))
    .filter((a): a is NonNullable<typeof a> => a !== undefined)

  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://pearlie.org" },
          { name: "Find a Dentist", url: "https://pearlie.org/find" },
          { name: area.name, url: `https://pearlie.org/find/${area.slug}` },
        ]}
      />
      <LocationJsonLd area={area} clinics={clinics} />
      <MainNav />
      <StickyPostcodeBar />

      <main>
        {/* Hero */}
        <section className="pt-28 pb-14 sm:pt-32 sm:pb-18 md:pt-36 md:pb-20 bg-[#004443]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-heading font-bold tracking-[-0.03em] mb-6 text-white text-balance">
                Find a Dentist in {area.name}
              </h1>
              <p className="text-lg sm:text-xl text-white/75 leading-relaxed max-w-3xl mx-auto mb-4">
                {area.intro}
              </p>
              <p className="text-sm text-white/50 mb-8">
                {clinics.length} verified {clinics.length === 1 ? "clinic" : "clinics"} near {area.name}
              </p>
              <div id="hero-postcode-search">
                <HeroPostcodeSearch variant="hero" />
              </div>
            </div>
          </div>
        </section>

        {/* Description + CTA */}
        <section className="py-10 sm:py-14 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                {area.description}
              </p>
              <Button
                size="lg"
                className="bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full font-normal transition-all"
                asChild
              >
                <Link href="/intake">
                  <Search className="w-4 h-4 mr-2" />
                  Get matched with a clinic in {area.name}
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Clinic Cards — horizontal scroll */}
        <section className="py-10 sm:py-14 bg-[#faf9f6] overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] mb-8 text-[#004443]">
                Dental clinics near {area.name}
              </h2>
            </div>
          </div>
          <div className="flex gap-4 md:gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide px-4 sm:px-6 lg:px-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] pb-4 -mb-4">
            {clinics.map((clinic) => (
              <LocationClinicCard key={clinic.id} clinic={clinic} />
            ))}
          </div>
        </section>

        {/* FAQ */}
        {area.faq.length > 0 && (
          <section className="py-10 sm:py-14 bg-[#faf3e6]">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] mb-8 text-[#004443]">
                  Common questions about dentists in {area.name}
                </h2>
                <Accordion type="single" collapsible className="space-y-3">
                  {area.faq.map((item, i) => (
                    <AccordionItem
                      key={i}
                      value={`faq-${i}`}
                      className="border-none rounded-lg px-4 sm:px-6 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
                    >
                      <AccordionTrigger className="text-left text-base font-semibold hover:no-underline text-foreground">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </section>
        )}

        {/* Nearby Areas */}
        {nearbyAreas.length > 0 && (
          <section className="py-10 sm:py-14 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] mb-6 text-[#004443]">
                  Explore nearby areas
                </h2>
                <div className="flex flex-wrap gap-3">
                  {nearbyAreas.map((nearby) => (
                    <Link
                      key={nearby.slug}
                      href={`/find/${nearby.slug}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-border/60 hover:border-[#0fbcb0]/40 hover:bg-[#0fbcb0]/5 text-sm font-medium text-foreground transition-all"
                    >
                      <MapPin className="w-3.5 h-3.5 text-[#0fbcb0]" />
                      Dentists in {nearby.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Quick Facts */}
        <QuickFacts areaName={area.name} clinicCount={clinics.length} content={area.quickFacts} />

        {/* Bottom CTA */}
        <section className="py-12 sm:py-20 bg-[#004443]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl sm:text-4xl font-heading font-bold tracking-[-0.03em] mb-6 text-white">
                Ready to find your dentist in {area.name}?
              </h2>
              <p className="text-lg text-white/75 mb-8 leading-relaxed">
                Answer a few questions about your dental needs and get matched with clinics that are right for you.
              </p>
              <Button
                size="lg"
                className="text-lg px-10 py-6 h-auto bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full font-normal transition-all"
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

// ─── Router ──────────────────────────────────────────────────────

export default async function FindAreaPage({ params }: PageProps) {
  const { area: slug } = await params

  // "Dentist near me" page
  if (slug === "dentist-near-me") {
    return <DentistNearMePage />
  }

  // Region page (central-london, south-london, etc.)
  const region = getRegionBySlug(slug)
  if (region) {
    return <RegionPage slug={slug} />
  }

  // Neighbourhood area page
  return <AreaPage slug={slug} />
}
