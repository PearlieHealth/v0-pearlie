import type { Metadata } from "next"
import Link from "next/link"
import {
  MapPin,
  ArrowRight,
  Stethoscope,
  CheckCircle2,
  Shield,
} from "lucide-react"
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

/** All boroughs ordered by search volume / prominence. */
const BOROUGH_SLUGS_ORDERED = [
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
  "tower-hamlets",
  "city-of-london",
  "lewisham",
  "haringey",
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

const PRICING_TABLE = [
  { treatment: "Private dental check-up", range: "£50–£120" },
  { treatment: "Hygiene appointment", range: "£70–£150" },
  { treatment: "Composite bonding", range: "£200–£400 per tooth" },
  { treatment: "Teeth whitening", range: "£250–£1,000" },
  { treatment: "Invisalign treatment", range: "£2,500–£5,000" },
  { treatment: "Single dental implant", range: "£2,000–£3,500" },
]

const LONDON_FAQS = [
  {
    question: "How much does a private dentist cost in London?",
    answer:
      "Routine check-ups typically range from £50 to £120. Cosmetic treatments and implants vary depending on complexity and borough location. Central London clinics may charge 20–40% more than outer borough practices.",
  },
  {
    question: "Are NHS dentists accepting new patients in London?",
    answer:
      "Availability varies by borough. Some areas have long waiting lists, while others may have limited capacity. You can check the NHS Find a Dentist tool or compare affordable private options on Pearlie where many clinics offer NHS-competitive pricing for routine care.",
  },
  {
    question: "Are dentists more expensive in Central London?",
    answer:
      "Yes, clinics in Central London often charge higher fees due to location and overheads. The same treatment in an outer borough may be 20–40% cheaper, often from equally qualified clinicians.",
  },
  {
    question: "How much do dental implants cost in London?",
    answer:
      "A single implant typically ranges from £2,000 to £3,500, depending on complexity and whether bone grafting is required. Many London clinics offer 0% finance plans for implant treatment.",
  },
  {
    question: "How much is Invisalign in London?",
    answer:
      "Invisalign treatment usually ranges between £2,500 and £5,000 depending on case complexity. Many outer-London orthodontists hold the same Diamond or Platinum Invisalign provider status as Central London clinics, often at lower prices.",
  },
  {
    question: "Can I find a same-day or emergency dentist in London?",
    answer:
      "Yes. Many private clinics offer same-day emergency appointments, particularly in larger boroughs. Emergency appointments typically cost £50–£250 privately. You can also call NHS 111 for out-of-hours referrals.",
  },
  {
    question: "What should I look for when choosing a dentist in London?",
    answer:
      "Look for GDC (General Dental Council) registration first — every practising dentist in the UK must be registered. Beyond that, check patient reviews, whether the clinic offers your specific treatment, pricing transparency, and convenience such as location and opening hours.",
  },
  {
    question:
      "What is the difference between private and NHS dental care in London?",
    answer:
      "NHS dental care covers essential treatments at fixed Band 1–3 prices (£26.80–£306.80) but availability is severely limited in London and cosmetic treatments are excluded. Private dentists offer shorter wait times, longer appointments, a wider range of treatments, and modern facilities — but at higher cost.",
  },
]

export const revalidate = 3600

export default async function LondonPage() {
  const testimonials = await getTestimonialsForBasicClinics([])

  const boroughs = BOROUGH_SLUGS_ORDERED.map((slug) =>
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

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: LONDON_FAQS.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
              },
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
                Compare GDC-registered dental clinics across London boroughs.
                Transparent pricing, real patient reviews, and free matching in
                under 60 seconds.
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

        {/* 2. Intro content block */}
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
                  searching for a{" "}
                  <strong>private dentist in London</strong> for routine
                  check-ups, a{" "}
                  <strong>cosmetic dentist</strong> for veneers or{" "}
                  <Link
                    href="/treatments/composite-bonding"
                    className="text-[#0fbcb0] hover:underline font-medium"
                  >
                    composite bonding
                  </Link>
                  , or an <strong>emergency dentist in London</strong> who can
                  see you today, the sheer number of options can feel
                  overwhelming.
                </p>
                <p>
                  Pricing and availability vary significantly across boroughs. A
                  dental implant in{" "}
                  <Link
                    href="/london/westminster"
                    className="text-[#0fbcb0] hover:underline font-medium"
                  >
                    Westminster
                  </Link>{" "}
                  may cost more than the same treatment in{" "}
                  <Link
                    href="/london/greenwich"
                    className="text-[#0fbcb0] hover:underline font-medium"
                  >
                    Greenwich
                  </Link>{" "}
                  or{" "}
                  <Link
                    href="/london/lewisham"
                    className="text-[#0fbcb0] hover:underline font-medium"
                  >
                    Lewisham
                  </Link>
                  . Cosmetic treatments like{" "}
                  <Link
                    href="/treatments/invisalign"
                    className="text-[#0fbcb0] hover:underline font-medium"
                  >
                    Invisalign
                  </Link>
                  ,{" "}
                  <Link
                    href="/treatments/composite-bonding"
                    className="text-[#0fbcb0] hover:underline font-medium"
                  >
                    composite bonding
                  </Link>
                  , and{" "}
                  <Link
                    href="/treatments/teeth-whitening"
                    className="text-[#0fbcb0] hover:underline font-medium"
                  >
                    teeth whitening
                  </Link>{" "}
                  often carry a premium in Central London, while equally
                  experienced clinicians in boroughs such as{" "}
                  <Link
                    href="/london/hackney"
                    className="text-[#0fbcb0] hover:underline font-medium"
                  >
                    Hackney
                  </Link>
                  ,{" "}
                  <Link
                    href="/london/lambeth"
                    className="text-[#0fbcb0] hover:underline font-medium"
                  >
                    Lambeth
                  </Link>
                  , and{" "}
                  <Link
                    href="/london/wandsworth"
                    className="text-[#0fbcb0] hover:underline font-medium"
                  >
                    Wandsworth
                  </Link>{" "}
                  offer competitive alternatives.
                </p>
                <p>
                  NHS dental availability in London remains limited in many
                  areas. Waiting lists can be long, and many practices are not
                  currently accepting new NHS patients. As a result, many
                  Londoners choose a mix of NHS care for routine check-ups and
                  private dentistry for cosmetic or specialist treatments such as{" "}
                  <Link
                    href="/treatments/dental-implants"
                    className="text-[#0fbcb0] hover:underline font-medium"
                  >
                    dental implants
                  </Link>{" "}
                  or{" "}
                  <Link
                    href="/treatments/veneers"
                    className="text-[#0fbcb0] hover:underline font-medium"
                  >
                    porcelain veneers
                  </Link>
                  .
                </p>
                <p>
                  Pearlie helps you compare verified clinics across London in one
                  place. Every practice listed is GDC-registered, and we
                  highlight transparent pricing, real patient reviews, available
                  treatments, finance options, and appointment availability — so
                  you can make an informed choice without hidden costs.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Pricing table */}
        <section className="py-10 sm:py-14 bg-[var(--cream)]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-2">
                Typical private dental prices in London
              </h2>
              <p className="text-base text-muted-foreground mb-6">
                While final fees depend on clinical assessment and borough
                location, here is a general pricing snapshot.
              </p>

              <div className="rounded-xl border border-border/50 bg-white overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30">
                      <th className="text-left font-semibold text-foreground px-5 py-3">
                        Treatment
                      </th>
                      <th className="text-right font-semibold text-foreground px-5 py-3">
                        Typical London range
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {PRICING_TABLE.map((row, i) => (
                      <tr
                        key={row.treatment}
                        className={
                          i < PRICING_TABLE.length - 1
                            ? "border-b border-border/30"
                            : ""
                        }
                      >
                        <td className="px-5 py-3 text-foreground">
                          {row.treatment}
                        </td>
                        <td className="px-5 py-3 text-right text-muted-foreground font-medium">
                          {row.range}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-sm text-muted-foreground mt-4">
                Central London clinics may charge 20–40% more than outer borough
                practices. Many private clinics offer 0% finance options for
                higher-value treatments.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Borough grid */}
        <section className="py-10 sm:py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-2">
                Browse dentists by London borough
              </h2>
              <p className="text-base text-muted-foreground mb-8">
                Choose your borough to compare verified clinics, see real
                reviews, and explore available treatments.
              </p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {boroughs.map((borough) => (
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

              <div className="mt-8 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-2">
                  Each borough page includes:
                </p>
                <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0fbcb0] shrink-0" />
                    Local pricing insights
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0fbcb0] shrink-0" />
                    Available NHS vs private options
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0fbcb0] shrink-0" />
                    Cosmetic and restorative treatment availability
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0fbcb0] shrink-0" />
                    Real patient ratings
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Popular treatments in London */}
        <section className="py-10 sm:py-14 bg-[var(--cream)]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-2">
                Popular dental treatments in London
              </h2>
              <p className="text-base text-muted-foreground mb-8">
                Looking for a specific treatment? Compare clinics offering:
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

              <div className="mt-8 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-2">
                  Each treatment page explains:
                </p>
                <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0fbcb0] shrink-0" />
                    Typical costs
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0fbcb0] shrink-0" />
                    What affects pricing
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0fbcb0] shrink-0" />
                    Procedure overview
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0fbcb0] shrink-0" />
                    Local clinic options
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 6. NHS vs Private comparison */}
        <section className="py-10 sm:py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-2 text-center">
                NHS vs private dentists in London
              </h2>
              <p className="text-base text-muted-foreground mb-8 text-center max-w-2xl mx-auto">
                Understanding the difference can help you choose the right
                option.
              </p>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="rounded-xl border border-border/50 bg-white p-6">
                  <h3 className="text-lg font-heading font-bold text-[#004443] mb-4">
                    NHS dentistry
                  </h3>
                  <ul className="space-y-2.5 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0fbcb0] mt-0.5 shrink-0" />
                      Lower fixed Band pricing (£26.80–£306.80)
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0fbcb0] mt-0.5 shrink-0" />
                      Limited cosmetic treatment availability
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0fbcb0] mt-0.5 shrink-0" />
                      Longer waiting times in many boroughs
                    </li>
                  </ul>
                </div>

                <div className="rounded-xl border border-border/50 bg-white p-6">
                  <h3 className="text-lg font-heading font-bold text-[#004443] mb-4">
                    Private dentistry
                  </h3>
                  <ul className="space-y-2.5 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0fbcb0] mt-0.5 shrink-0" />
                      Wider appointment availability
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0fbcb0] mt-0.5 shrink-0" />
                      Cosmetic and specialist treatments available
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0fbcb0] mt-0.5 shrink-0" />
                      Flexible finance options
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0fbcb0] mt-0.5 shrink-0" />
                      Shorter waiting times
                    </li>
                  </ul>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mt-6 text-center">
                Many London patients use NHS care for routine examinations and
                private care for cosmetic or advanced procedures.
              </p>
            </div>
          </div>
        </section>

        {/* 7. Why Use Pearlie */}
        <section className="py-10 sm:py-14 bg-[var(--cream)]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-2">
                Why use Pearlie to find a dentist in London?
              </h2>
              <p className="text-base text-muted-foreground mb-8">
                We help patients compare options clearly and confidently.
              </p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
                {[
                  "All clinics are GDC-registered",
                  "Verified quality standards",
                  "Real Google reviews integrated",
                  "Transparent pricing where available",
                  "No hidden referral fees",
                  "Free matching service",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-white px-4 py-3"
                  >
                    <Shield className="w-4 h-4 text-[#0fbcb0] mt-0.5 shrink-0" />
                    <span className="text-sm font-medium text-foreground">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 8. Patient testimonials */}
        <PatientTestimonials areaName="London" testimonials={testimonials} />

        {/* 9. FAQ section */}
        <TreatmentFAQ
          faqs={LONDON_FAQS}
          treatmentName="dentists in London"
        />

        {/* 10. Cross-link to postcode search */}
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

        {/* 11. Bottom CTA */}
        <section className="py-12 sm:py-16 bg-[#004443]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-4">
                Find a trusted dentist in your London borough
              </h2>
              <p className="text-white/70 mb-8 leading-relaxed">
                Compare verified clinics, see real reviews, and book with
                confidence.
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
