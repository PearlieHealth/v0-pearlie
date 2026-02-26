import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { MapPin, Search, Shield, CheckCircle2, Lock, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { MainNav } from "@/components/main-nav"
import { SiteFooter } from "@/components/site-footer"
import { BreadcrumbSchema } from "@/components/breadcrumb-schema"
import { LocationClinicCard } from "@/components/find/location-clinic-card"
import { LocationJsonLd } from "@/components/find/location-jsonld"
import { LocationMap } from "@/components/find/location-map"
import { HeroPostcodeSearch } from "@/components/find/hero-postcode-search"
import { StickyPostcodeBar } from "@/components/find/sticky-postcode-bar"
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
    q: "How does Pearlie choose which clinics to show me?",
    a: "We match you based on your postcode, treatment needs, preferences, and schedule — not just distance. Every clinic is independently verified and GDC-registered before appearing on Pearlie.",
  },
  {
    q: "Are all dentists on Pearlie GDC registered?",
    a: "Yes. Every dental clinic listed on Pearlie is verified against the General Dental Council register. We check credentials, patient reviews, and clinical standards before listing any practice.",
  },
  {
    q: "Is Pearlie free to use?",
    a: "Completely free. Pearlie is a free service for patients — there are no hidden fees, no subscription, and no obligation. You can compare private dentists, message clinics, and book appointments at no cost.",
  },
  {
    q: "Do I pay Pearlie anything?",
    a: "No. Pearlie is free for patients. We are funded by dental clinics who pay a small fee to be listed. This means you get unbiased comparisons and access to verified practices without paying a penny.",
  },
  {
    q: "Can I find NHS dentists on Pearlie?",
    a: "Pearlie focuses on private dental clinics in London. For NHS dental services, we recommend using the NHS Find a Dentist tool. However, some clinics listed on Pearlie may also accept NHS patients for certain treatments.",
  },
  {
    q: "How quickly will clinics respond to my enquiry?",
    a: "Most clinics on Pearlie respond within a few hours during working days. You'll receive a notification when a clinic messages you back, and you can reply directly through our secure messaging system.",
  },
  {
    q: "What treatments can I search for on Pearlie?",
    a: "You can search for a wide range of dental treatments including check-ups, teeth whitening, Invisalign, veneers, dental implants, composite bonding, root canals, emergency dental care, and more. Tell us what you need and we'll find clinics that specialise in it.",
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
                <HeroPostcodeSearch variant="hero" hideSkip />
              </div>
            </div>
          </div>
        </section>

        {/* How it works — horizontal layout */}
        <section className="py-16 sm:py-20 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] mb-12 text-[#004443] text-center">
                How it works
              </h2>
              <div className="grid gap-10 sm:grid-cols-3">
                {[
                  {
                    step: "1",
                    icon: MapPin,
                    title: "Enter your postcode",
                    desc: "We find nearby trusted clinics.",
                  },
                  {
                    step: "2",
                    icon: MessageSquare,
                    title: "Tell us what you need",
                    desc: "Share your treatment goals and availability.",
                  },
                  {
                    step: "3",
                    icon: CheckCircle2,
                    title: "Get matched & message clinics",
                    desc: "Compare, chat and book confidently.",
                  },
                ].map((item) => (
                  <div key={item.step} className="text-center">
                    <div className="relative mx-auto mb-5">
                      <div className="w-16 h-16 rounded-2xl bg-[#0fbcb0]/10 flex items-center justify-center mx-auto">
                        <item.icon className="w-7 h-7 text-[#0fbcb0]" />
                      </div>
                      <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#004443] text-white text-xs font-bold flex items-center justify-center">
                        {item.step}
                      </span>
                    </div>
                    <h3 className="font-semibold text-foreground text-lg mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                ))}
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

        {/* Clinic Cards */}
        {clinics.length > 0 && (
          <section className="py-10 sm:py-14 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-5xl mx-auto">
                <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] mb-8 text-[#004443]">
                  Dental clinics in {region.name}
                </h2>
                <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                  {clinics.map((clinic) => (
                    <LocationClinicCard key={clinic.id} clinic={clinic} />
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Map */}
        {clinics.length > 0 && (
          <section className="py-10 sm:py-14 bg-[#faf9f6]">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-5xl mx-auto">
                <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] mb-6 text-[#004443]">
                  Clinics on the map
                </h2>
                <LocationMap
                  clinics={clinics}
                  center={region.center}
                  zoom={region.mapZoom}
                />
              </div>
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

        {/* Clinic Cards */}
        <section className="py-10 sm:py-14 bg-[#faf9f6]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] mb-8 text-[#004443]">
                Dental clinics near {area.name}
              </h2>
              <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                {clinics.map((clinic) => (
                  <LocationClinicCard key={clinic.id} clinic={clinic} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Map */}
        <section className="py-10 sm:py-14 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] mb-6 text-[#004443]">
                Clinics on the map
              </h2>
              <LocationMap
                clinics={clinics}
                center={area.center}
                zoom={area.mapZoom}
              />
            </div>
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
