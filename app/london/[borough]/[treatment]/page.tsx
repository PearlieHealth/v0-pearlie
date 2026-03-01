import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { MainNav } from "@/components/main-nav"
import { SiteFooter } from "@/components/site-footer"
import { BreadcrumbSchema } from "@/components/breadcrumb-schema"
import { TreatmentClinicGrid } from "@/components/treatments/treatment-clinic-grid"
import { TreatmentFAQ } from "@/components/treatments/treatment-faq"
import { TreatmentPostcodeCta } from "@/components/treatments/treatment-postcode-cta"
import { StickyMobilePostcode } from "@/components/treatments/sticky-mobile-postcode"
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
  getRelatedTreatments,
} from "@/lib/content/treatments"
import {
  getAllAreaTreatmentParams,
  getAreaTreatmentData,
} from "@/lib/data/area-treatments"
import { getTestimonialsForBasicClinics } from "@/lib/locations/queries"
import { getBlogPostBySlug } from "@/lib/content/blog"
import { CLINIC_CARD_SELECT } from "@/lib/clinics/queries"
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
  const title = `${meta.treatmentName} in ${borough.name} — Compare Verified Clinics & Prices`
  const description = `Looking for ${meta.treatmentName.toLowerCase()} in ${borough.name}? Compare GDC-registered clinics near ${borough.postcodes[0]}. Prices from ${meta.priceRange}. See reviews, check availability, and get matched — free.`

  return {
    title,
    description,
    keywords: [
      `${meta.treatmentName.toLowerCase()} ${borough.name}`,
      `${meta.treatmentName.toLowerCase()} near ${borough.landmarks[0]}`,
      `${meta.treatmentName.toLowerCase()} ${borough.postcodes[0]}`,
      ...borough.postcodes.slice(1).map(
        (pc) => `${meta.treatmentName.toLowerCase()} ${pc}`
      ),
      `${meta.treatmentName.toLowerCase()} cost ${borough.name}`,
      `best ${meta.treatmentName.toLowerCase()} ${borough.name}`,
      `${meta.treatmentName.toLowerCase()} near ${borough.landmarks[0]}`,
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
      .select(CLINIC_CARD_SELECT)
      .eq("is_archived", false)
      .overlaps("treatments", filterTags)
      .or(postcodeFilters)
      .order("rating", { ascending: false })
      .limit(12)

    if (data && data.length > 0) return data

    // Second fallback: any clinic offering this treatment in London
    const { data: treatmentFallback } = await supabase
      .from("clinics")
      .select(CLINIC_CARD_SELECT)
      .eq("is_archived", false)
      .overlaps("treatments", filterTags)
      .order("rating", { ascending: false })
      .limit(6)

    if (treatmentFallback && treatmentFallback.length > 0)
      return treatmentFallback

    // Third fallback: top-rated clinics
    const { data: fallback } = await supabase
      .from("clinics")
      .select(CLINIC_CARD_SELECT)
      .eq("is_archived", false)
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

  // Resolve related blog posts for internal linking
  const relatedBlogPosts = (meta.relatedBlogSlugs || [])
    .map((slug) => {
      const post = getBlogPostBySlug(slug)
      return post ? { slug, title: post.meta.title } : null
    })
    .filter(Boolean) as { slug: string; title: string }[]

  // Always include NHS vs Private guide if not already linked
  const nhsGuide = getBlogPostBySlug("nhs-vs-private-dentist")
  const hasNhsGuide = relatedBlogPosts.some((p) => p.slug === "nhs-vs-private-dentist")
  if (nhsGuide && !hasNhsGuide) {
    relatedBlogPosts.push({ slug: "nhs-vs-private-dentist", title: nhsGuide.meta.title })
  }

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
      <StickyMobilePostcode
        treatmentName={meta.treatmentName}
        intakeTreatment={meta.intakeTreatment}
      />

      <main>
        {/* 1. Hero — with "Compare Verified Clinics" H1 */}
        <AreaHero
          borough={borough}
          clinicCount={clinics.length}
          treatmentName={meta.treatmentName}
          treatmentSlug={treatmentSlug}
          intakeTreatment={meta.intakeTreatment}
          priceRange={meta.priceRange}
        />

        {/* 2. Stats bar */}
        <AreaStatsBar
          borough={borough}
          clinicCount={clinics.length}
          treatmentName={meta.treatmentName}
        />

        {/* 3. Quick price range section (above clinics) */}
        {areaTreatmentData && (
          <section className="py-8 sm:py-10">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mx-auto">
                <div className="rounded-xl border border-[#0fbcb0]/20 bg-[#0fbcb0]/5 p-6">
                  <h2 className="text-lg sm:text-xl font-heading font-bold text-[#004443] mb-2">
                    Typical {meta.treatmentName.toLowerCase()} cost in {borough.name}
                  </h2>
                  <p className="text-2xl sm:text-3xl font-heading font-bold text-[#004443] mb-3">
                    {meta.priceRange}
                  </p>
                  <p className="text-base text-muted-foreground leading-relaxed mb-4">
                    {areaTreatmentData.priceContext}
                  </p>
                  <Link
                    href={`#clinics`}
                    className="inline-flex items-center text-sm font-semibold text-[#0fbcb0] hover:underline"
                  >
                    See {meta.treatmentName.toLowerCase()} clinics in {borough.name}
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 4. "Why choose [treatment] in [borough]?" — Local SEO block */}
        {areaTreatmentData && (
          <section className="pb-10 sm:pb-14">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-4">
                  Why choose {meta.treatmentName.toLowerCase()} in {borough.name}?
                </h2>
                <p className="text-base text-muted-foreground leading-relaxed mb-6">
                  {areaTreatmentData.whyChoose}
                </p>
                <p className="text-base text-muted-foreground leading-relaxed">
                  {areaTreatmentData.localInsight}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* 5. Clinic listings */}
        <div id="clinics">
          <TreatmentClinicGrid
            clinics={clinics}
            treatmentName={`${meta.treatmentName} in ${borough.name}`}
          />
        </div>

        <TrustBadgeStrip />

        {/* 6. Mid-page conversion CTA */}
        <section className="py-10 sm:py-14 bg-[#004443]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-3">
                Ready to compare {meta.treatmentName.toLowerCase()} clinics in {borough.name}?
              </h2>
              <p className="text-white/70 mb-6 leading-relaxed">
                Enter your postcode to get matched with verified {meta.treatmentName.toLowerCase()} providers near you.
              </p>
              <div className="[&_button]:bg-[#0fbcb0] [&_button]:hover:bg-[#0da399] [&_button]:text-white [&_p]:text-white/60 [&_input]:bg-white/10 [&_input]:border-white/20 [&_input]:text-white [&_input]:placeholder:text-white/40 [&_input]:focus-visible:ring-[#0fbcb0] [&_input]:focus-visible:border-[#0fbcb0]">
                <TreatmentPostcodeCta
                  treatmentName={meta.treatmentName}
                  intakeTreatment={meta.intakeTreatment}
                />
              </div>
            </div>
          </div>
        </section>

        {/* 7. Demand signal + local context */}
        {areaTreatmentData && (
          <section className="py-10 sm:py-14">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mx-auto space-y-8">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-4">
                    {meta.treatmentName} in {borough.name}
                  </h2>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {areaTreatmentData.demandSignal}
                  </p>
                </div>

                {/* Internal linking block */}
                <div className="rounded-xl border border-border/50 bg-white p-6">
                  <h3 className="text-lg font-heading font-bold text-foreground mb-3">
                    Learn more about {meta.treatmentName.toLowerCase()}
                  </h3>
                  <ul className="space-y-2">
                    <li>
                      <Link
                        href={`/treatments/${treatmentSlug}`}
                        className="text-[#0fbcb0] hover:underline font-medium text-sm"
                      >
                        {meta.treatmentName} — full guide, costs &amp; what to expect
                      </Link>
                    </li>
                    {meta.relatedTreatmentSlugs?.slice(0, 2).map((relSlug) => {
                      const related = getTreatmentBySlug(relSlug)
                      if (!related) return null
                      return (
                        <li key={relSlug}>
                          <Link
                            href={`/treatments/${relSlug}`}
                            className="text-[#0fbcb0] hover:underline font-medium text-sm"
                          >
                            {related.meta.treatmentName} — guide &amp; prices
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                  {relatedBlogPosts.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-sm text-muted-foreground mb-2">
                        Guides and cost comparisons
                      </p>
                      <ul className="space-y-2">
                        {relatedBlogPosts.map((post) => (
                          <li key={post.slug}>
                            <Link
                              href={`/blog/${post.slug}`}
                              className="text-[#0fbcb0] hover:underline font-medium text-sm"
                            >
                              {post.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <p className="text-sm text-muted-foreground mb-2">
                      Looking outside {borough.name}?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {nearbyBoroughs.slice(0, 3).map((nb) => (
                        <Link
                          key={nb.slug}
                          href={`/london/${nb.slug}/${treatmentSlug}`}
                          className="text-sm text-[#0fbcb0] hover:underline"
                        >
                          {meta.treatmentName} in {nb.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 8. Educational sections (short, non-duplicate from main treatment page) */}
        {areaTreatmentData && areaTreatmentData.educationalSections.length > 0 && (
          <section className="py-10 sm:py-14 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-8">
                  What you need to know about {meta.treatmentName.toLowerCase()}
                </h2>
                <div className="grid sm:grid-cols-2 gap-6">
                  {areaTreatmentData.educationalSections.map((section) => (
                    <div
                      key={section.heading}
                      className="rounded-xl border border-border/50 bg-[var(--cream)] p-5"
                    >
                      <h3 className="text-base font-heading font-bold text-foreground mb-2">
                        {section.heading}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {section.body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 9. NHS info */}
        <AreaNhsInfo borough={borough} />

        {/* 10. FAQs — area-specific first, then generic treatment FAQs */}
        {allFaqs.length > 0 && (
          <TreatmentFAQ
            faqs={allFaqs}
            treatmentName={`${meta.treatmentName.toLowerCase()} in ${borough.name}`}
          />
        )}

        {/* 11. Patient testimonials */}
        <PatientTestimonials areaName={borough.name} testimonials={testimonials} />

        {/* 12. Nearby boroughs for same treatment */}
        <NearbyBoroughs
          boroughs={nearbyBoroughs}
          treatmentSlug={treatmentSlug}
          treatmentName={meta.treatmentName}
        />

        {/* 13. Related treatments in this borough */}
        <RelatedTreatments treatments={relatedTreatments} />

        {/* 14. Bottom CTA */}
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
