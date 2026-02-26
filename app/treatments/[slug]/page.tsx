import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { MDXRemote } from "next-mdx-remote/rsc"
import remarkGfm from "remark-gfm"
import { MainNav } from "@/components/main-nav"
import { SiteFooter } from "@/components/site-footer"
import { BreadcrumbSchema } from "@/components/breadcrumb-schema"
import { TreatmentHero } from "@/components/treatments/treatment-hero"
import { TreatmentPostcodeCta } from "@/components/treatments/treatment-postcode-cta"
import { KeyFactsBar } from "@/components/treatments/key-facts-bar"
import { TreatmentClinicGrid } from "@/components/treatments/treatment-clinic-grid"
import { TreatmentFAQ } from "@/components/treatments/treatment-faq"
import { RelatedTreatments } from "@/components/treatments/related-treatments"
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

  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    alternates: {
      canonical: `https://pearlie.org/treatments/${meta.slug}`,
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `https://pearlie.org/treatments/${meta.slug}`,
      type: "article",
      publishedTime: meta.publishedAt,
      modifiedTime: meta.updatedAt || meta.publishedAt,
      authors: [meta.author],
      images: meta.heroImage
        ? [
            {
              url: meta.heroImage,
              width: 1200,
              height: 630,
              alt: meta.heroImageAlt || meta.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
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
  const components = useMDXComponents()
  const relatedTreatments = getRelatedTreatments(slug, 3)

  // Fetch clinics offering this treatment
  const clinics = await getClinicsForTreatment(meta.clinicFilterTags)

  // Resolve related blog posts
  const relatedBlogPosts: BlogPost[] = (meta.relatedBlogSlugs || [])
    .map((blogSlug) => {
      const post = getBlogPostBySlug(blogSlug)
      return post ? post.meta : null
    })
    .filter(Boolean) as BlogPost[]

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
      "@type": "Country",
      name: "United Kingdom",
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

  // FAQPage schema
  const faqSchema =
    meta.faqs && meta.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: meta.faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        }
      : null

  // MedicalWebPage schema
  const medicalPageSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: meta.title,
    description: meta.description,
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

      <main>
        {/* 1. Treatment Hero */}
        <TreatmentHero treatment={meta} />

        {/* 2. Key Facts Bar */}
        <KeyFactsBar
          priceRange={meta.priceRange}
          treatmentDuration={meta.treatmentDuration}
          clinicCount={clinics.length}
        />

        {/* 3. Clinic Listings */}
        <TreatmentClinicGrid
          clinics={clinics}
          treatmentName={meta.treatmentName}
          intakeTreatment={meta.intakeTreatment}
        />

        {/* 4. MDX Editorial Content */}
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

        {/* 5. FAQ Accordion */}
        {meta.faqs && meta.faqs.length > 0 && (
          <TreatmentFAQ faqs={meta.faqs} treatmentName={meta.treatmentName} />
        )}

        {/* 6. Related Blog Posts */}
        {relatedBlogPosts.length > 0 && (
          <RelatedPosts posts={relatedBlogPosts} />
        )}

        {/* 7. Related Treatments */}
        <RelatedTreatments treatments={relatedTreatments} />

        {/* 8. Bottom CTA with postcode input */}
        <section className="py-12 sm:py-16 bg-[#004443]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-4">
                Find my {meta.treatmentName.toLowerCase()} clinic
              </h2>
              <p className="text-white/70 mb-8 leading-relaxed">
                Enter your postcode and we'll match you with verified,
                GDC registered clinics near you.
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
                Last reviewed: {meta.updatedAt || meta.publishedAt}.
              </p>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
