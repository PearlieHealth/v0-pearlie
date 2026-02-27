import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MainNav } from "@/components/main-nav"
import { SiteFooter } from "@/components/site-footer"
import { BreadcrumbSchema } from "@/components/breadcrumb-schema"
import { TreatmentClinicGrid } from "@/components/treatments/treatment-clinic-grid"
import { TreatmentFAQ } from "@/components/treatments/treatment-faq"
import { TreatmentPostcodeCta } from "@/components/treatments/treatment-postcode-cta"
import { AreaHero } from "@/components/areas/area-hero"
import { AreaStatsBar } from "@/components/areas/area-stats-bar"
import { AreaNhsInfo } from "@/components/areas/area-nhs-info"
import { NearbyBoroughs } from "@/components/areas/nearby-boroughs"
import { RelatedTreatments } from "@/components/treatments/related-treatments"
import { PatientTestimonials } from "@/components/find/patient-testimonials"
import {
  getBoroughBySlug,
  getNearbyBoroughs,
} from "@/lib/data/london-boroughs"
import {
  getTreatmentBySlug,
  getAllTreatments,
  getRelatedTreatments,
} from "@/lib/content/treatments"
import {
  getAllAreaTreatmentParams,
  getAreaTreatmentData,
} from "@/lib/data/area-treatments"
import { getTestimonialsForBasicClinics } from "@/lib/locations/queries"
import { TrustBadgeStrip } from "@/components/trust-badge-strip"
import { createClient } from "@/lib/supabase/server"

export const revalidate = 3600

interface AreaTreatmentPageProps {
  params: Promise<{ borough: string; treatment: string }>
}

export async function generateStaticParams() {
  return getAllAreaTreatmentParams()
}

export async function generateMetadata({
  params,
}: AreaTreatmentPageProps): Promise<Metadata> {
  const { borough: boroughSlug, treatment: treatmentSlug } = await params
  const borough = getBoroughBySlug(boroughSlug)
  const treatment = getTreatmentBySlug(treatmentSlug)

  if (!borough || !treatment) {
    return { title: "Not Found" }
  }

  const { meta } = treatment
  const title = `${meta.treatmentName} in ${borough.name} — Compare Clinics & Prices`
  const description = `Compare verified ${meta.treatmentName.toLowerCase()} providers in ${borough.name}, London. Prices from ${meta.priceRange}. See reviews, check availability, and get matched — free.`

  return {
    title,
    description,
    keywords: [
      `${meta.treatmentName.toLowerCase()} ${borough.name}`,
      `${meta.treatmentName.toLowerCase()} near ${borough.landmarks[0]}`,
      ...borough.postcodes.map(
        (pc) => `${meta.treatmentName.toLowerCase()} ${pc}`
      ),
      `${meta.treatmentName.toLowerCase()} cost ${borough.name}`,
      `best ${meta.treatmentName.toLowerCase()} ${borough.name}`,
    ],
    alternates: {
      canonical: `https://pearlie.org/london/${boroughSlug}/${treatmentSlug}`,
    },
    openGraph: {
      title: `${title} | Pearlie`,
      description,
      url: `https://pearlie.org/london/${boroughSlug}/${treatmentSlug}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Pearlie`,
      description,
    },
  }
}

const CLINIC_SELECT =
  "id, name, slug, city, address, postcode, rating, review_count, images, treatments, price_range, highlight_chips, verified, description"

async function getClinicsForAreaTreatment(
  postcodes: string[],
  filterTags: string[]
) {
  try {
    const supabase = await createClient()

    const postcodeFilters = postcodes
      .map((pc) => `postcode.ilike.${pc}%`)
      .join(",")

    // First: clinics in this area offering this treatment
    const { data } = await supabase
      .from("clinics")
      .select(CLINIC_SELECT)
      .eq("is_archived", false)
      .eq("is_live", true)
      .overlaps("treatments", filterTags)
      .or(postcodeFilters)
      .order("rating", { ascending: false })
      .limit(12)

    if (data && data.length > 0) return data

    // Second fallback: any clinic offering this treatment in London
    const { data: treatmentFallback } = await supabase
      .from("clinics")
      .select(CLINIC_SELECT)
      .eq("is_archived", false)
      .eq("is_live", true)
      .overlaps("treatments", filterTags)
      .order("rating", { ascending: false })
      .limit(6)

    if (treatmentFallback && treatmentFallback.length > 0)
      return treatmentFallback

    // Third fallback: top-rated clinics
    const { data: fallback } = await supabase
      .from("clinics")
      .select(CLINIC_SELECT)
      .eq("is_archived", false)
      .eq("is_live", true)
      .order("rating", { ascending: false })
      .limit(6)

    return fallback || []
  } catch {
    return []
  }
}

export default async function AreaTreatmentPage({
  params,
}: AreaTreatmentPageProps) {
  const { borough: boroughSlug, treatment: treatmentSlug } = await params
  const borough = getBoroughBySlug(boroughSlug)
  const treatment = getTreatmentBySlug(treatmentSlug)

  if (!borough || !treatment) {
    notFound()
  }

  const { meta } = treatment
  const areaTreatmentData = getAreaTreatmentData(boroughSlug, treatmentSlug)

  const clinics = await getClinicsForAreaTreatment(
    borough.postcodes,
    meta.clinicFilterTags
  )
  const testimonials = await getTestimonialsForBasicClinics(clinics)
  const nearbyBoroughs = getNearbyBoroughs(boroughSlug, 4)
  const relatedTreatments = getRelatedTreatments(treatmentSlug, 3)

  // Structured data
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: meta.serviceType || "DentalService",
    name: `${meta.treatmentName} in ${borough.name}`,
    description: `Compare verified ${meta.treatmentName.toLowerCase()} providers in ${borough.name}, London.`,
    provider: {
      "@type": "Organization",
      name: "Pearlie",
      url: "https://pearlie.org",
    },
    areaServed: {
      "@type": "AdministrativeArea",
      name: borough.name,
      containedInPlace: {
        "@type": "City",
        name: "London",
      },
    },
    url: `https://pearlie.org/london/${boroughSlug}/${treatmentSlug}`,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "GBP",
      availability: "https://schema.org/InStock",
      offerCount: clinics.length > 0 ? clinics.length : undefined,
      description: meta.priceRange,
    },
  }

  // Merge area-specific FAQs (first) with generic treatment FAQs
  const allFaqs = [
    ...(areaTreatmentData?.areaFaqs || []),
    ...(meta.faqs || []),
  ]

  const faqSchema =
    allFaqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: allFaqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        }
      : null

  const breadcrumbItems = [
    { name: "Home", url: "https://pearlie.org" },
    { name: "London", url: "https://pearlie.org/london" },
    { name: borough.name, url: `https://pearlie.org/london/${boroughSlug}` },
    {
      name: meta.treatmentName,
      url: `https://pearlie.org/london/${boroughSlug}/${treatmentSlug}`,
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbSchema items={breadcrumbItems} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <MainNav />

      <main>
        {/* 1. Hero */}
        <AreaHero
          borough={borough}
          clinicCount={clinics.length}
          treatmentName={meta.treatmentName}
          treatmentSlug={treatmentSlug}
        />

        {/* 2. Stats bar */}
        <AreaStatsBar
          borough={borough}
          clinicCount={clinics.length}
          treatmentName={meta.treatmentName}
        />

        {/* 3. Clinic listings */}
        <TreatmentClinicGrid
          clinics={clinics}
          treatmentName={`${meta.treatmentName} in ${borough.name}`}
        />

        <TrustBadgeStrip />

        {/* 4. Unique area × treatment content */}
        {areaTreatmentData && (
          <section className="py-10 sm:py-14">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mx-auto space-y-8">
                {/* Local insight */}
                <div>
                  <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-4">
                    {meta.treatmentName} in {borough.name}
                  </h2>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {areaTreatmentData.localInsight}
                  </p>
                </div>

                {/* Price context */}
                <div className="rounded-xl border border-border/50 bg-white p-6">
                  <h3 className="text-lg font-heading font-bold text-foreground mb-2">
                    {meta.treatmentName} pricing in {borough.name}
                  </h3>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {areaTreatmentData.priceContext}
                  </p>
                </div>

                {/* Demand signal */}
                <div>
                  <h3 className="text-lg font-heading font-bold text-foreground mb-2">
                    Why patients in {borough.name} choose {meta.treatmentName.toLowerCase()}
                  </h3>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {areaTreatmentData.demandSignal}
                  </p>
                </div>

                {/* Links back to main treatment page */}
                <p className="text-sm text-muted-foreground">
                  Read our full guide:{" "}
                  <Link
                    href={`/treatments/${treatmentSlug}`}
                    className="text-[#0fbcb0] hover:underline font-medium"
                  >
                    {meta.treatmentName} in London &amp; UK
                  </Link>
                </p>
              </div>
            </div>
          </section>
        )}

        {/* 5. NHS info */}
        <AreaNhsInfo borough={borough} />

        {/* 6. FAQs — area-specific first, then generic treatment FAQs */}
        {allFaqs.length > 0 && (
          <TreatmentFAQ
            faqs={allFaqs}
            treatmentName={`${meta.treatmentName.toLowerCase()} in ${borough.name}`}
          />
        )}

        {/* 7. Patient testimonials */}
        <PatientTestimonials areaName={borough.name} testimonials={testimonials} />

        {/* 8. Nearby boroughs for same treatment */}
        <NearbyBoroughs
          boroughs={nearbyBoroughs}
          treatmentSlug={treatmentSlug}
          treatmentName={meta.treatmentName}
        />

        {/* 8. Related treatments in this borough */}
        <RelatedTreatments treatments={relatedTreatments} />

        {/* 9. Bottom CTA */}
        <section className="py-12 sm:py-16 bg-[#004443]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-4">
                Find my {meta.treatmentName.toLowerCase()} clinic in{" "}
                {borough.name}
              </h2>
              <p className="text-white/70 mb-8 leading-relaxed">
                Enter your postcode and we&apos;ll match you with verified{" "}
                {meta.treatmentName.toLowerCase()} providers near you.
              </p>
              <TreatmentPostcodeCta
                treatmentName={meta.treatmentName}
                intakeTreatment={meta.intakeTreatment}
              />
            </div>
          </div>
        </section>

        {/* Medical disclaimer */}
        <div className="border-t border-border/50 bg-[var(--cream)]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="max-w-3xl mx-auto">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>Medical disclaimer:</strong> This content is for
                informational purposes only and does not constitute medical or
                dental advice. Always consult a GDC registered dental
                professional for diagnosis and treatment recommendations. Prices
                shown are estimates and may vary by clinic and individual case.
                Last reviewed:{" "}
                {areaTreatmentData?.updatedAt || borough.updatedAt}.
              </p>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
