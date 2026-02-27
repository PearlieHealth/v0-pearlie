import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MainNav } from "@/components/main-nav"
import { SiteFooter } from "@/components/site-footer"
import { BreadcrumbSchema } from "@/components/breadcrumb-schema"
import { TreatmentClinicGrid } from "@/components/treatments/treatment-clinic-grid"
import { AreaHero } from "@/components/areas/area-hero"
import { AreaStatsBar } from "@/components/areas/area-stats-bar"
import { AreaNhsInfo } from "@/components/areas/area-nhs-info"
import { AreaTreatmentGrid } from "@/components/areas/area-treatment-grid"
import { NearbyBoroughs } from "@/components/areas/nearby-boroughs"
import {
  getAllBoroughSlugs,
  getBoroughBySlug,
  getNearbyBoroughs,
} from "@/lib/data/london-boroughs"
import { getAllTreatments } from "@/lib/content/treatments"
import { TrustBadgeStrip } from "@/components/trust-badge-strip"
import { createClient } from "@/lib/supabase/server"

export const revalidate = 3600

interface BoroughPageProps {
  params: Promise<{ borough: string }>
}

export async function generateStaticParams() {
  return getAllBoroughSlugs().map((slug) => ({ borough: slug }))
}

export async function generateMetadata({
  params,
}: BoroughPageProps): Promise<Metadata> {
  const { borough: slug } = await params
  const borough = getBoroughBySlug(slug)

  if (!borough) {
    return { title: "Area Not Found" }
  }

  const title = `Dentists in ${borough.name} — Compare Verified Clinics`
  const description = `Compare verified, GDC registered dental clinics in ${borough.name}, London. ${borough.description.slice(0, 120)} See pricing, read reviews, and get matched free.`

  return {
    title,
    description,
    keywords: [
      `dentist ${borough.name}`,
      `dental clinic ${borough.name}`,
      `${borough.name} dentist`,
      `dentist near ${borough.landmarks[0]}`,
      ...borough.postcodes.map((pc) => `dentist ${pc}`),
    ],
    alternates: {
      canonical: `https://pearlie.org/london/${slug}`,
    },
    openGraph: {
      title: `${title} | Pearlie`,
      description,
      url: `https://pearlie.org/london/${slug}`,
      type: "website",
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

async function getClinicsInArea(postcodes: string[]) {
  try {
    const supabase = await createClient()

    // Build an OR filter matching any of the borough's postcodes
    const postcodeFilters = postcodes
      .map((pc) => `postcode.ilike.${pc}%`)
      .join(",")

    const { data } = await supabase
      .from("clinics")
      .select(CLINIC_SELECT)
      .eq("is_archived", false)
      .eq("is_live", true)
      .or(postcodeFilters)
      .order("rating", { ascending: false })
      .limit(12)

    if (data && data.length > 0) return data

    // Fallback: if no postcode match, show top London clinics
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

export default async function BoroughPage({ params }: BoroughPageProps) {
  const { borough: slug } = await params
  const borough = getBoroughBySlug(slug)

  if (!borough) {
    notFound()
  }

  const clinics = await getClinicsInArea(borough.postcodes)
  const treatments = getAllTreatments()
  const nearbyBoroughs = getNearbyBoroughs(slug, 4)

  // Structured data
  const placeSchema = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: borough.name,
    description: borough.description,
    geo: {
      "@type": "GeoCoordinates",
      latitude: borough.lat,
      longitude: borough.lng,
    },
    containedInPlace: {
      "@type": "City",
      name: "London",
      containedInPlace: {
        "@type": "Country",
        name: "United Kingdom",
      },
    },
  }

  const localBusinessListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Dental Clinics in ${borough.name}`,
    description: `Verified dental clinics in ${borough.name}, London`,
    numberOfItems: clinics.length,
    itemListElement: clinics.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Dentist",
        name: c.name,
        address: {
          "@type": "PostalAddress",
          streetAddress: c.address,
          postalCode: c.postcode,
          addressLocality: "London",
          addressCountry: "GB",
        },
        ...(c.rating && { aggregateRating: { "@type": "AggregateRating", ratingValue: c.rating, reviewCount: c.review_count || 1 } }),
      },
    })),
  }

  const breadcrumbItems = [
    { name: "Home", url: "https://pearlie.org" },
    { name: "London", url: "https://pearlie.org/london" },
    { name: borough.name, url: `https://pearlie.org/london/${slug}` },
  ]

  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbSchema items={breadcrumbItems} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(placeSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusinessListSchema),
        }}
      />

      <MainNav />

      <main>
        {/* 1. Hero */}
        <AreaHero borough={borough} clinicCount={clinics.length} />

        {/* 2. Stats bar */}
        <AreaStatsBar borough={borough} clinicCount={clinics.length} />

        {/* 3. Clinic listings */}
        <TreatmentClinicGrid
          clinics={clinics}
          treatmentName={`dental care in ${borough.name}`}
        />

        <TrustBadgeStrip />

        {/* 4. About this area */}
        <section className="py-10 sm:py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-4">
                Dental care in {borough.name}
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed mb-4">
                {borough.description}
              </p>
              <p className="text-base text-muted-foreground leading-relaxed">
                Key areas include {borough.landmarks.join(", ")}. The borough is
                well connected via {borough.transport.slice(0, 3).join(", ")}{" "}
                {borough.transport.length > 3
                  ? `and ${borough.transport.length - 3} more stations`
                  : ""}
                , covering postcodes {borough.postcodes.join(", ")}.
              </p>
            </div>
          </div>
        </section>

        {/* 5. NHS info */}
        <AreaNhsInfo borough={borough} />

        {/* 6. Treatment grid — links to /london/[borough]/[treatment] */}
        <AreaTreatmentGrid borough={borough} treatments={treatments} />

        {/* 7. Nearby boroughs */}
        <NearbyBoroughs boroughs={nearbyBoroughs} />

        {/* 8. Bottom CTA */}
        <section className="py-12 sm:py-16 bg-[#004443]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-4">
                Find my dentist in {borough.name}
              </h2>
              <p className="text-white/70 mb-6 leading-relaxed">
                Enter your postcode and we&apos;ll match you with verified,
                GDC registered clinics near you in {borough.name}.
              </p>
              <Button
                size="lg"
                className="bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full px-8 h-12 text-base"
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
