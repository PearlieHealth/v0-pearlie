import type { Metadata } from "next"
import Link from "next/link"
import { MapPin, ArrowRight, Stethoscope } from "lucide-react"
import { MainNav } from "@/components/main-nav"
import { SiteFooter } from "@/components/site-footer"
import { BreadcrumbSchema } from "@/components/breadcrumb-schema"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
import { TrustBadgeStrip } from "@/components/trust-badge-strip"
import { HeroPostcodeCta } from "@/components/treatments/hero-postcode-cta"
import { TreatmentPostcodeCta } from "@/components/treatments/treatment-postcode-cta"
import { StickyMobilePostcode } from "@/components/treatments/sticky-mobile-postcode"
import { TreatmentFAQ } from "@/components/treatments/treatment-faq"
import { PatientTestimonials } from "@/components/find/patient-testimonials"
import {
  LONDON_BOROUGHS,
  getBoroughsByRegion,
  type LondonBorough,
} from "@/lib/data/london-boroughs"
import { getTestimonialsForBasicClinics } from "@/lib/locations/queries"

export const metadata: Metadata = {
  title:
    "Dentists in London — Compare Verified Private & NHS Clinics | Pearlie",
  description:
    "Compare GDC-registered dental clinics across London boroughs. Private & NHS dentists, transparent pricing from Invisalign to dental implants. Real reviews. Free matching.",
  keywords: [
    "dentist London",
    "private dentist London",
    "best dentist London",
    "dental clinic London",
    "cosmetic dentist London",
    "emergency dentist London",
    "dental implants London",
    "Invisalign London",
    "NHS dentist London",
    "teeth whitening London",
    "veneers London",
    "composite bonding London",
  ],
  alternates: {
    canonical: "https://pearlie.org/london",
  },
  openGraph: {
    title:
      "Dentists in London — Compare Verified Private & NHS Clinics | Pearlie",
    description:
      "Compare GDC-registered dental clinics across London boroughs. Private & NHS, transparent pricing, real reviews. Free matching.",
    url: "https://pearlie.org/london",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Dentists in London — Compare Verified Private & NHS Clinics | Pearlie",
    description:
      "Compare GDC-registered dental clinics across London boroughs. Private & NHS, transparent pricing, real reviews.",
  },
}

const REGIONS: LondonBorough["region"][] = [
  "Central",
  "North",
  "South",
  "East",
  "West",
]

/** High-traffic boroughs shown prominently before the full region breakdown. */
const POPULAR_BOROUGH_SLUGS = [
  "westminster",
  "camden",
  "southwark",
  "lambeth",
  "islington",
  "hackney",
  "kensington-and-chelsea",
  "wandsworth",
  "greenwich",
  "hammersmith-and-fulham",
]

const POPULAR_TREATMENTS = [
  {
    slug: "dental-implants",
    name: "Dental Implants",
    price: "From £2,000",
  },
  { slug: "invisalign", name: "Invisalign", price: "From £2,500" },
  {
    slug: "composite-bonding",
    name: "Composite Bonding",
    price: "From £250",
  },
  {
    slug: "teeth-whitening",
    name: "Teeth Whitening",
    price: "From £250",
  },
  { slug: "veneers", name: "Porcelain Veneers", price: "From £700" },
  {
    slug: "emergency-dental",
    name: "Emergency Dentist",
    price: "From £50",
  },
]

const LONDON_FAQS = [
  {
    question: "How much does a private dentist cost in London?",
    answer:
      "A private check-up in London typically costs £50–£150, though Central London practices often charge more. Specialist treatments like dental implants range from £2,000–£6,000 per implant and Invisalign from £2,500–£5,500. Outer boroughs like Lewisham and Greenwich tend to be 15–30% cheaper than Zone 1 clinics. Pearlie lets you compare prices across boroughs side-by-side so you can find the right balance of quality and cost.",
  },
  {
    question: "Are NHS dentists accepting new patients in London?",
    answer:
      "NHS dental availability in London is extremely limited. Most NHS practices across boroughs maintain long waiting lists and many have stopped accepting new adult patients entirely. Boroughs like Lewisham, Haringey, and Greenwich tend to have slightly better NHS provision than Central London. You can check the NHS Find a Dentist tool or call individual practices — or compare affordable private options on Pearlie where many clinics offer NHS-competitive pricing for routine care.",
  },
  {
    question: "Which London boroughs have the best cosmetic dentists?",
    answer:
      "Westminster (especially the Harley Street area), Kensington & Chelsea, and Camden are known for high concentrations of specialist cosmetic dentists. However, boroughs like Islington, Lambeth (Clapham), and Hackney have seen a surge in quality cosmetic practices — often at lower prices. On Pearlie you can compare verified cosmetic clinics across all London boroughs to find the best fit for your budget and treatment.",
  },
  {
    question: "How much are dental implants in London?",
    answer:
      "Dental implants in London typically cost £2,000–£6,000 per single implant, depending on the borough, clinic, and complexity. Central London (Westminster, City of London) tends to be at the higher end, while outer boroughs may start closer to £2,000. Many London clinics offer finance plans with 0% interest. Compare implant prices across London boroughs on Pearlie to find clinics within your budget.",
  },
  {
    question: "Is Invisalign more expensive in Central London?",
    answer:
      "Yes, Invisalign treatment in Central London (Westminster, City of London, Camden) typically costs £3,500–£5,500, compared to £2,500–£4,500 in outer boroughs. The difference reflects higher operating costs rather than treatment quality — many outer-London orthodontists hold the same Diamond or Platinum Invisalign provider status. Pearlie helps you compare Invisalign providers across boroughs so you can see the price difference clearly.",
  },
  {
    question: "How do I find an emergency dentist in London?",
    answer:
      "For dental emergencies in London you have several options: call NHS 111 for out-of-hours referrals, visit a walk-in emergency dental clinic, or book a same-day appointment at a private practice. Emergency appointments typically cost £50–£250 privately. Most London boroughs have at least one practice offering same-day emergency slots. On Pearlie, you can filter for emergency dental care and find available clinics near your postcode.",
  },
  {
    question: "What should I look for when choosing a dentist in London?",
    answer:
      "Look for GDC (General Dental Council) registration first — every practising dentist in the UK must be registered. Beyond that, check patient reviews, whether the clinic offers your specific treatment, pricing transparency, and convenience (location, opening hours, weekend availability). Pearlie verifies all listed clinics are GDC-registered and shows you real patient reviews, pricing, and available treatments so you can compare easily.",
  },
  {
    question:
      "What is the difference between private and NHS dental care in London?",
    answer:
      "NHS dental care covers essential treatments at fixed Band 1–3 prices (£26.80–£306.80) but availability is severely limited in London and cosmetic treatments are excluded. Private dentists offer shorter wait times, longer appointments, a wider range of treatments (Invisalign, veneers, implants), and modern facilities — but at higher cost. Many London patients use NHS for routine check-ups and private for specialist or cosmetic work.",
  },
]

export const revalidate = 3600

export default async function LondonPage() {
  const testimonials = await getTestimonialsForBasicClinics([])

  const popularBoroughs = POPULAR_BOROUGH_SLUGS.map((slug) =>
    LONDON_BOROUGHS.find((b) => b.slug === slug)
  ).filter(Boolean) as LondonBorough[]

  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://pearlie.org" },
          { name: "London", url: "https://pearlie.org/london" },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Dental Clinics in London by Borough",
            description:
              "Compare verified dental clinics across London boroughs on Pearlie.",
            numberOfItems: LONDON_BOROUGHS.length,
            itemListElement: LONDON_BOROUGHS.map((b, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: `Dentists in ${b.name}`,
              url: `https://pearlie.org/london/${b.slug}`,
            })),
          }),
        }}
      />

      <MainNav />
      <StickyMobilePostcode
        treatmentName="dentist"
        intakeTreatment="general"
      />

      <main>
        {/* 1. Hero */}
        <section className="pt-28 pb-10 sm:pt-32 sm:pb-14 bg-[#004443]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-[#0fbcb0]" />
                <span className="text-sm font-semibold uppercase tracking-wider text-[#0fbcb0]">
                  London
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-[-0.03em] text-white mb-4 text-balance">
                Dentists in London — Compare Verified Private &amp; NHS Clinics
              </h1>
              <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed mb-8">
                Compare GDC-registered clinics across {LONDON_BOROUGHS.length}{" "}
                London boroughs. Transparent pricing. Real reviews. Free
                matching.
              </p>
              <div className="max-w-lg mx-auto [&_p]:text-white/60 [&_input]:bg-white/10 [&_input]:border-white/20 [&_input]:text-white [&_input]:placeholder:text-white/40 [&_input]:focus-visible:ring-[#0fbcb0] [&_input]:focus-visible:border-[#0fbcb0] [&_.text-destructive]:text-red-300 [&_form]:mx-auto">
                <HeroPostcodeCta
                  treatmentName="dentist"
                  intakeTreatment="general"
                />
              </div>
            </div>
          </div>
        </section>

        <TrustBadgeStrip />

        {/* 2. Intro content block — SEO authority copy */}
        <section className="py-10 sm:py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <BreadcrumbNav
                items={[
                  { label: "Home", href: "/" },
                  { label: "London", href: "/london" },
                ]}
              />

              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-4 mt-6">
                Finding the right dentist in London
              </h2>
              <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
                <p>
                  London is home to thousands of dental practices — from
                  specialist cosmetic clinics on Harley Street to family-friendly
                  NHS practices in the outer boroughs. Whether you&apos;re
                  looking for a{" "}
                  <strong>private dentist in London</strong> for routine
                  check-ups, a{" "}
                  <strong>cosmetic dentist</strong> for Invisalign or veneers, or
                  an <strong>emergency dentist</strong> who can see you today,
                  the sheer number of options can be overwhelming.
                </p>
                <p>
                  Pricing varies significantly across boroughs. A dental implant
                  in Westminster might cost £4,000–£6,000, while the same
                  procedure in Greenwich or Lewisham could start from £2,000.
                  Cosmetic treatments like{" "}
                  <Link
                    href="/treatments/composite-bonding"
                    className="text-[#0fbcb0] hover:underline font-medium"
                  >
                    composite bonding
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/treatments/teeth-whitening"
                    className="text-[#0fbcb0] hover:underline font-medium"
                  >
                    teeth whitening
                  </Link>{" "}
                  follow a similar pattern — Central London practices charge a
                  premium, while equally qualified clinics in boroughs like
                  Hackney, Lambeth, and Wandsworth offer competitive rates.
                </p>
                <p>
                  NHS dental availability in London remains extremely limited.
                  Most NHS practices maintain long waiting lists, and many have
                  stopped accepting new adult patients altogether. This has
                  driven demand for affordable private dentistry — and with it, a
                  need for transparent pricing and genuine patient reviews. Many
                  patients now combine NHS care for routine check-ups with
                  private treatment for specialist work like{" "}
                  <Link
                    href="/treatments/dental-implants"
                    className="text-[#0fbcb0] hover:underline font-medium"
                  >
                    dental implants
                  </Link>{" "}
                  or{" "}
                  <Link
                    href="/treatments/invisalign"
                    className="text-[#0fbcb0] hover:underline font-medium"
                  >
                    Invisalign
                  </Link>
                  .
                </p>
                <p>
                  Pearlie helps you cut through the noise. Every clinic listed is
                  verified as GDC-registered, and our platform shows real patient
                  reviews, transparent pricing, and available treatments — so you
                  can compare dentists across London boroughs and choose with
                  confidence. No referral fees, no hidden costs.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Popular London boroughs — primary navigation */}
        <section className="py-10 sm:py-14 bg-[var(--cream)]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-2">
                Popular London boroughs
              </h2>
              <p className="text-base text-muted-foreground mb-8">
                Browse verified dental clinics by borough — see local pricing,
                patient reviews, and available treatments.
              </p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {popularBoroughs.map((borough) => (
                  <Link
                    key={borough.slug}
                    href={`/london/${borough.slug}`}
                    className="group rounded-xl border border-border/50 bg-white p-5 hover:shadow-md hover:border-[#0fbcb0]/30 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-[#0fbcb0]" />
                        <span className="text-xs text-muted-foreground">
                          {borough.postcodes.slice(0, 3).join(", ")}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-[#0fbcb0] transition-colors" />
                    </div>
                    <h3 className="text-base font-heading font-bold text-foreground mb-1.5">
                      Dentists in {borough.name}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {borough.description.slice(0, 120)}...
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 4. Browse by area — secondary region navigation */}
        <section className="py-10 sm:py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-2">
                Browse by area of London
              </h2>
              <p className="text-base text-muted-foreground mb-8">
                All {LONDON_BOROUGHS.length} boroughs, organised by region.
              </p>

              {REGIONS.map((region) => {
                const boroughs = getBoroughsByRegion(region)
                if (boroughs.length === 0) return null

                return (
                  <div key={region} className="mb-10 last:mb-0">
                    <h3 className="text-lg sm:text-xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-1">
                      {region} London
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {boroughs.length} borough
                      {boroughs.length !== 1 ? "s" : ""}
                    </p>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {boroughs.map((borough) => (
                        <Link
                          key={borough.slug}
                          href={`/london/${borough.slug}`}
                          className="group flex items-center gap-3 rounded-lg border border-border/50 bg-white px-4 py-3 hover:shadow-sm hover:border-[#0fbcb0]/30 transition-all"
                        >
                          <MapPin className="w-4 h-4 text-[#0fbcb0] shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-semibold text-foreground group-hover:text-[#004443]">
                              {borough.name}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {borough.postcodes.slice(0, 3).join(", ")}
                            </span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-[#0fbcb0] transition-colors shrink-0" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* 5. Popular treatments in London — treatment hub links */}
        <section className="py-10 sm:py-14 bg-[var(--cream)]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-2">
                Popular treatments in London
              </h2>
              <p className="text-base text-muted-foreground mb-8">
                Compare clinics and prices for the most searched dental
                treatments across London.
              </p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {POPULAR_TREATMENTS.map((treatment) => (
                  <Link
                    key={treatment.slug}
                    href={`/treatments/${treatment.slug}`}
                    className="group rounded-xl border border-border/50 bg-white p-5 hover:shadow-md hover:border-[#0fbcb0]/30 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <Stethoscope className="w-4 h-4 text-[#0fbcb0]" />
                        <span className="text-xs font-medium text-[#0fbcb0]">
                          {treatment.price}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-[#0fbcb0] transition-colors" />
                    </div>
                    <h3 className="text-base font-heading font-bold text-foreground">
                      {treatment.name} in London
                    </h3>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 6. Patient testimonials */}
        <PatientTestimonials areaName="London" testimonials={testimonials} />

        {/* 7. FAQ section */}
        <TreatmentFAQ
          faqs={LONDON_FAQS}
          treatmentName="dentists in London"
        />

        {/* 8. Cross-link to postcode search */}
        <section className="py-8 bg-[var(--cream)]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Know your postcode? Search by neighbourhood instead.
              </p>
              <Link
                href="/find/dentist-near-me"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0fbcb0] hover:underline"
              >
                Find a dentist near me
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* 9. Bottom CTA */}
        <section className="py-12 sm:py-16 bg-[#004443]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-4">
                Not sure where to start?
              </h2>
              <p className="text-white/70 mb-8 leading-relaxed">
                Enter your postcode and we&apos;ll match you with verified,
                GDC-registered clinics near you — across all London boroughs.
              </p>
              <TreatmentPostcodeCta
                treatmentName="dentist"
                intakeTreatment="general"
              />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
