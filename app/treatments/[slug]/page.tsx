import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { MDXRemote } from "next-mdx-remote/rsc"
import remarkGfm from "remark-gfm"
import { MainNav } from "@/components/main-nav"
import { SiteFooter } from "@/components/site-footer"
import { BreadcrumbSchema } from "@/components/breadcrumb-schema"
import { TreatmentHero } from "@/components/treatments/treatment-hero"
import { TreatmentPostcodeCta } from "@/components/treatments/treatment-postcode-cta"
import { StickyMobilePostcode } from "@/components/treatments/sticky-mobile-postcode"
import { KeyFactsBar } from "@/components/treatments/key-facts-bar"
import { TrustBadgeStrip } from "@/components/trust-badge-strip"
import { TreatmentClinicGrid } from "@/components/treatments/treatment-clinic-grid"
import { TreatmentFAQ } from "@/components/treatments/treatment-faq"
import { TreatmentAreaLinks } from "@/components/treatments/treatment-area-links"
import { RelatedTreatments } from "@/components/treatments/related-treatments"
import { PriceBreakdown } from "@/components/treatments/price-breakdown"
import { CompareOptions } from "@/components/treatments/compare-options"
import { CostFAQ } from "@/components/treatments/cost-faq"
import { TableOfContents } from "@/components/blog/table-of-contents"
import { RelatedPosts } from "@/components/blog/related-posts"
import { useMDXComponents } from "@/components/blog/mdx-components"
import {
  getAllTreatments,
  getTreatmentBySlug,
  getRelatedTreatments,
} from "@/lib/content/treatments"
import { getBlogPostBySlug, type BlogPost } from "@/lib/content/blog"
import { extractHeadings } from "@/lib/content/mdx"
import { createClient } from "@/lib/supabase/server"
import { treatmentCostContent } from "@/lib/data/treatment-cost-content"

export const revalidate = 3600

interface TreatmentPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const treatments = getAllTreatments()
  return treatments.map((t) => ({ slug: t.slug }))
}

export async function generateMetadata({
  params,
}: TreatmentPageProps): Promise<Metadata> {
  const { slug } = await params
  const treatment = getTreatmentBySlug(slug)

  if (!treatment) {
    return { title: "Treatment Not Found" }
  }

  const { meta } = treatment
  const costContent = treatmentCostContent[slug]

  const pageTitle = costContent?.metaTitle || meta.title
  const pageDescription = costContent?.metaDescription || meta.description

  return {
    title: pageTitle,
    description: pageDescription,
    keywords: meta.keywords,
    alternates: {
      canonical: `https://pearlie.org/treatments/${meta.slug}`,
    },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `https://pearlie.org/treatments/${meta.slug}`,
      type: "article",
      publishedTime: meta.publishedAt,
      modifiedTime: meta.updatedAt || meta.publishedAt,
      images: meta.heroImage
        ? [
            {
              url: meta.heroImage,
              width: 1200,
              height: 630,
              alt: meta.heroImageAlt || pageTitle,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDescription,
      images: meta.heroImage ? [meta.heroImage] : undefined,
    },
  }
}

const CLINIC_SELECT =
  "id, name, slug, city, address, postcode, rating, review_count, images, treatments, price_range, highlight_chips, verified, description"

async function getClinicsForTreatment(filterTags: string[]) {
  try {
    const supabase = await createClient()

    // Try treatment-specific clinics first
    const { data } = await supabase
      .from("clinics")
      .select(CLINIC_SELECT)
      .eq("is_archived", false)
      .eq("is_live", true)
      .overlaps("treatments", filterTags)
      .order("rating", { ascending: false })
      .limit(12)

    if (data && data.length > 0) return data

    // Fallback: show top-rated verified clinics if no treatment match
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

export default async function TreatmentPage({ params }: TreatmentPageProps) {
  const { slug } = await params
  const treatment = getTreatmentBySlug(slug)

  if (!treatment) {
    notFound()
  }

  const { meta, content } = treatment
  const headings = extractHeadings(content)
  const components = useMDXComponents({
    treatmentName: meta.treatmentName,
    intakeTreatment: meta.intakeTreatment,
  })
  const relatedTreatments = getRelatedTreatments(slug, 3)
  const costContent = treatmentCostContent[slug]

  // Fetch clinics offering this treatment
  const clinics = await getClinicsForTreatment(meta.clinicFilterTags)

  // Split clinics: featured (top 6) shown early, rest shown later
  const featuredClinics = clinics.slice(0, 6)
  const moreClinics = clinics.slice(6)

  // Resolve related blog posts
  const relatedBlogPosts: BlogPost[] = (meta.relatedBlogSlugs || [])
    .map((blogSlug) => {
      const post = getBlogPostBySlug(blogSlug)
      return post ? post.meta : null
    })
    .filter(Boolean) as BlogPost[]

  // Combine all FAQs for schema (existing + cost FAQs)
  const allFaqs = [
    ...(meta.faqs || []),
    ...(costContent?.costFaqs?.map((f) => ({ question: f.question, answer: f.answer })) || []),
  ]

  // Service schema
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: meta.serviceType || "DentalService",
    name: meta.treatmentName,
    description: meta.description,
    provider: {
      "@type": "Organization",
      name: "Pearlie",
      url: "https://pearlie.org",
    },
    areaServed: {
      "@type": "City",
      name: "London",
      containedInPlace: {
        "@type": "Country",
        name: "United Kingdom",
      },
    },
    url: `https://pearlie.org/treatments/${meta.slug}`,
    ...(meta.heroImage && {
      image: `https://pearlie.org${meta.heroImage}`,
    }),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "GBP",
      availability: "https://schema.org/InStock",
      offerCount: clinics.length > 0 ? clinics.length : undefined,
      description: meta.priceRange,
    },
  }

  // FAQPage schema (includes both original and cost FAQs)
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

  // MedicalWebPage schema with Speakable
  const medicalPageSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: costContent?.metaTitle || meta.title,
    description: costContent?.metaDescription || meta.description,
    url: `https://pearlie.org/treatments/${meta.slug}`,
    datePublished: meta.publishedAt,
    dateModified: meta.updatedAt || meta.publishedAt,
    lastReviewed: meta.updatedAt || meta.publishedAt,
    about: {
      "@type": "MedicalCondition",
      name: meta.treatmentName,
    },
    ...(meta.medicalSpecialty && {
      specialty: {
        "@type": "MedicalSpecialty",
        name: meta.medicalSpecialty,
      },
    }),
    reviewedBy: {
      "@type": "Organization",
      name: "Pearlie",
      url: "https://pearlie.org",
    },
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: [
        "[data-speakable='description']",
        "[data-speakable='faq']",
      ],
    },
  }

  // Breadcrumb schema
  const breadcrumbItems = [
    { name: "Home", url: "https://pearlie.org" },
    { name: "Treatments", url: "https://pearlie.org/treatments" },
    {
      name: meta.treatmentName,
      url: `https://pearlie.org/treatments/${meta.slug}`,
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbSchema items={breadcrumbItems} />

      {/* Service schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />

      {/* FAQPage schema */}
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {/* MedicalWebPage schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(medicalPageSchema),
        }}
      />

      <MainNav />
      <StickyMobilePostcode
        treatmentName={meta.treatmentName}
        intakeTreatment={meta.intakeTreatment}
      />

      <main>
        {/* 1. PROMISE — Hero (cost-intent H1 + subheading + transactional CTA) */}
        <TreatmentHero
          treatment={meta}
          costIntentH1={costContent?.costIntentH1}
          heroSubheading={costContent?.heroSubheading}
          ctaButtonText={costContent?.ctaButtonText}
        />

        {/* 2. Key Facts Bar */}
        <KeyFactsBar
          priceRange={meta.priceRange}
          treatmentDuration={meta.treatmentDuration}
        />

        {/* 3. PROOF — Trust badges immediately after hero */}
        <TrustBadgeStrip />

        {/* 4. SUPPLY — Featured clinics early (top 6) to prove legitimacy */}
        <TreatmentClinicGrid
          clinics={featuredClinics}
          treatmentName={meta.treatmentName}
        />

        {/* 5. EDUCATION — Price Breakdown (SEO layer, keeps Google happy) */}
        {costContent && (
          <PriceBreakdown
            costContent={costContent}
            treatmentName={meta.treatmentName}
            intakeTreatment={meta.intakeTreatment}
          />
        )}

        {/* 6. EDUCATION — Compare Options */}
        {costContent && (
          <CompareOptions costContent={costContent} />
        )}

        {/* 7. SUPPLY — More clinics / expanded list */}
        {moreClinics.length > 0 && (
          <TreatmentClinicGrid
            clinics={moreClinics}
            treatmentName={meta.treatmentName}
            heading={`More ${meta.treatmentName.toLowerCase()} clinics`}
            subheading="Explore more verified providers in your area."
          />
        )}

        {/* 8. MDX Editorial Content */}
        <section className="py-8 sm:py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <div className="grid lg:grid-cols-[1fr_280px] gap-10">
                {/* Main content */}
                <article className="min-w-0">
                  <MDXRemote
                    source={content}
                    components={components}
                    options={{
                      mdxOptions: { remarkPlugins: [remarkGfm] },
                    }}
                  />
                </article>

                {/* Sidebar — TOC (desktop only) */}
                <aside className="hidden lg:block">
                  <div className="sticky top-24">
                    <TableOfContents headings={headings} />
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </section>

        {/* 9. Cost FAQ Accordion (from cost content data) */}
        {costContent?.costFaqs && costContent.costFaqs.length > 0 && (
          <CostFAQ faqs={costContent.costFaqs} treatmentName={meta.treatmentName} />
        )}

        {/* 10. General FAQ Accordion (from MDX frontmatter) */}
        {meta.faqs && meta.faqs.length > 0 && (
          <TreatmentFAQ faqs={meta.faqs} treatmentName={meta.treatmentName} />
        )}

        {/* 11. Find treatment by area */}
        <TreatmentAreaLinks
          treatmentSlug={slug}
          treatmentName={meta.treatmentName}
        />

        {/* 12. Related Blog Posts */}
        {relatedBlogPosts.length > 0 && (
          <RelatedPosts posts={relatedBlogPosts} />
        )}

        {/* 13. Related Treatments */}
        <RelatedTreatments treatments={relatedTreatments} />

        {/* 14. Bottom CTA with postcode input */}
        <section className="py-12 sm:py-16 bg-[#004443]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-4">
                Compare {meta.treatmentName.toLowerCase()} clinics near you
              </h2>
              <p className="text-white/70 mb-8 leading-relaxed">
                Enter your postcode and we&apos;ll match you with verified,
                GDC registered clinics with transparent pricing.
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
                dental advice. Always consult a GDC-registered dental
                professional for diagnosis and treatment recommendations. Prices
                shown are estimates and may vary by clinic and individual case.
              </p>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
