import { Suspense } from "react"
import { notFound, redirect } from "next/navigation"
import type { Metadata } from "next"
import { getPublicClinic } from "@/lib/get-public-clinic"
import { ClinicProfileContent } from "@/components/clinic/profile/clinic-profile-content"
import type { Clinic } from "@/components/clinic/profile/types"

interface Props {
  params: Promise<{ clinicId: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { clinicId } = await params
  const sp = await searchParams
  const isPreview = sp?.preview === "true"

  // Don't generate metadata for preview mode (requires auth, not for search engines)
  if (isPreview) return {}

  const clinic = await getPublicClinic(clinicId)
  if (!clinic) {
    return { title: "Clinic Not Found" }
  }

  const title = clinic.city
    ? `${clinic.name} - Dentist in ${clinic.city}`
    : `${clinic.name} - ${clinic.postcode}`

  const description =
    clinic.description ||
    `Book an appointment at ${clinic.name}, ${clinic.address}. Verified dental clinic on Pearlie.`

  const canonicalSlug = clinic.slug || clinic.id
  const canonicalUrl = `https://pearlie.org/clinic/${canonicalSlug}`

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "website",
      locale: "en_GB",
      url: canonicalUrl,
      siteName: "Pearlie",
      title,
      description,
      images: clinic.images?.length
        ? [{ url: clinic.images[0], width: 1200, height: 630, alt: clinic.name }]
        : [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Pearlie" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

function buildClinicJsonLd(clinic: Clinic) {
  const canonicalSlug = clinic.slug || clinic.id

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Dentist",
    "@id": `https://pearlie.org/clinic/${canonicalSlug}#dentist`,
    name: clinic.name,
    url: `https://pearlie.org/clinic/${canonicalSlug}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: clinic.address,
      addressLocality: clinic.city || "",
      postalCode: clinic.postcode,
      addressCountry: "GB",
    },
  }

  if (clinic.phone) schema.telephone = clinic.phone
  if (clinic.website) schema.sameAs = [clinic.website]
  if (clinic.description) schema.description = clinic.description
  if (clinic.images?.length) schema.image = clinic.images[0]

  if (clinic.latitude && clinic.longitude) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: clinic.latitude,
      longitude: clinic.longitude,
    }
  }

  // Aggregate rating
  if (clinic.rating && clinic.review_count) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: clinic.rating,
      reviewCount: clinic.review_count,
      bestRating: 5,
      worstRating: 1,
    }
  }

  // Opening hours
  if (clinic.opening_hours && typeof clinic.opening_hours === "object") {
    const dayMap: Record<string, string> = {
      monday: "Mo",
      tuesday: "Tu",
      wednesday: "We",
      thursday: "Th",
      friday: "Fr",
      saturday: "Sa",
      sunday: "Su",
    }
    const specs: string[] = []
    for (const [day, val] of Object.entries(clinic.opening_hours)) {
      const abbr = dayMap[day.toLowerCase()]
      if (!abbr) continue
      if (typeof val === "object" && val && "open" in val && "close" in val && !val.closed) {
        specs.push(`${abbr} ${val.open}-${val.close}`)
      }
    }
    if (specs.length) schema.openingHours = specs
  }

  // Accessibility
  if (clinic.wheelchair_accessible) {
    schema.accessibilityFeature = "wheelchair accessible"
  }

  // Price range
  if (clinic.price_range) {
    const priceMap: Record<string, string> = {
      budget: "$",
      mid: "$$",
      premium: "$$$",
    }
    schema.priceRange = priceMap[clinic.price_range] || "$$"
  }

  // NHS acceptance
  if (clinic.accepts_nhs) {
    schema.paymentAccepted = "NHS, Private"
  }

  return schema
}

export default async function ClinicDetailPage({ params, searchParams }: Props) {
  const { clinicId } = await params
  const sp = await searchParams
  const isPreview = sp?.preview === "true"

  // Preview mode: let client component handle auth + fetching
  if (isPreview) {
    return (
      <Suspense fallback={<ClinicProfileSkeleton />}>
        <ClinicProfileContent />
      </Suspense>
    )
  }

  const clinic = await getPublicClinic(clinicId)

  if (!clinic) {
    notFound()
  }

  // Server-side canonical redirect: UUID -> slug
  if (clinic.slug && clinicId !== clinic.slug) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clinicId)
    if (isUUID) {
      const query = new URLSearchParams()
      for (const [key, val] of Object.entries(sp || {})) {
        if (typeof val === "string") query.set(key, val)
      }
      const qs = query.toString()
      redirect(`/clinic/${clinic.slug}${qs ? `?${qs}` : ""}`)
    }
  }

  const jsonLd = buildClinicJsonLd(clinic)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={<ClinicProfileSkeleton />}>
        <ClinicProfileContent initialClinic={clinic} />
      </Suspense>
    </>
  )
}

function ClinicProfileSkeleton() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a1a1a] mx-auto mb-4" />
        <p className="text-[#666]">Loading clinic details...</p>
      </div>
    </div>
  )
}
