import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { MapPin, Search } from "lucide-react"
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
      title: "Dentist Near Me in London | Pearlie",
      description:
        "Find a dentist near you in London. Enter your postcode to get matched with trusted, GDC-registered dental clinics — free on Pearlie.",
      alternates: { canonical: "https://pearlie.org/find/dentist-near-me" },
      openGraph: {
        title: "Dentist Near Me in London | Pearlie",
        description: "Find a dentist near you in London. Enter your postcode to get matched with trusted dental clinics.",
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
        {/* Hero */}
        <section className="pt-28 pb-16 sm:pt-32 sm:pb-20 md:pt-36 md:pb-24 bg-[#004443]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-heading font-bold tracking-[-0.03em] mb-6 text-white text-balance">
                Dentist Near Me
              </h1>
              <p className="text-lg sm:text-xl text-white/75 leading-relaxed max-w-2xl mx-auto mb-10">
                Enter your postcode below and we&apos;ll find trusted, GDC-registered dental clinics close to you.
              </p>
              <div id="hero-postcode-search">
                <HeroPostcodeSearch variant="hero" />
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 sm:py-20 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] mb-10 text-[#004443] text-center">
                How it works
              </h2>
              <div className="grid gap-8 sm:grid-cols-3">
                {[
                  { step: "1", title: "Enter your postcode", desc: "Tell us where you are and we'll find clinics nearby." },
                  { step: "2", title: "Answer a few questions", desc: "Tell us about your treatment needs, preferences, and schedule." },
                  { step: "3", title: "Get matched", desc: "We'll match you with verified clinics that fit your needs." },
                ].map((item) => (
                  <div key={item.step} className="text-center">
                    <div className="w-12 h-12 rounded-full bg-[#0fbcb0] text-white font-bold text-lg flex items-center justify-center mx-auto mb-4">
                      {item.step}
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Browse regions */}
        <section className="py-16 sm:py-20 bg-[#faf9f6]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] mb-8 text-[#004443] text-center">
                Or browse by area
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {LONDON_REGIONS.map((region) => (
                  <Link
                    key={region.slug}
                    href={`/find/${region.slug}`}
                    className="group flex items-center gap-3 p-4 rounded-xl bg-white border border-border/50 hover:border-[#0fbcb0]/40 hover:shadow-md transition-all"
                  >
                    <MapPin className="w-5 h-5 text-[#0fbcb0] flex-shrink-0" />
                    <span className="font-medium text-foreground group-hover:text-[#004443]">
                      Dentists in {region.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-12 sm:py-16 bg-[#faf3e6]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] mb-8 text-[#004443]">
                Common questions
              </h2>
              <Accordion type="single" collapsible className="space-y-3">
                {[
                  {
                    q: "How does Pearlie find dentists near me?",
                    a: "Enter your postcode and we use your location to match you with verified, GDC-registered dental clinics in your area. We factor in your treatment needs, preferences, and schedule — not just distance.",
                  },
                  {
                    q: "Is Pearlie free to use?",
                    a: "Yes — Pearlie is completely free for patients. We help you find and compare dental clinics at no cost. There are no hidden fees or charges.",
                  },
                  {
                    q: "What areas of London does Pearlie cover?",
                    a: "Pearlie covers dental clinics across all of London — Central, North, South, East, and West. We're continuously expanding our network of verified clinics.",
                  },
                  {
                    q: "Are the dentists on Pearlie verified?",
                    a: "Every clinic on Pearlie is independently verified and GDC-registered. We check credentials, reviews, and clinic standards before listing any practice.",
                  },
                ].map((item, i) => (
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
