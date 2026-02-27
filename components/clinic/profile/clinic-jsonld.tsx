import type { Clinic } from "./types"

export function ClinicJsonLd({ clinic }: { clinic: Pick<Clinic, "name" | "address" | "city" | "postcode" | "latitude" | "longitude" | "phone" | "website" | "rating" | "review_count" | "images" | "opening_hours" | "description"> }) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Dentist",
    name: clinic.name,
    description: clinic.description,
    address: {
      "@type": "PostalAddress",
      streetAddress: clinic.address,
      addressLocality: clinic.city,
      postalCode: clinic.postcode,
      addressCountry: "GB",
    },
    image: clinic.images?.[0],
  }

  if (clinic.phone) {
    schema.telephone = clinic.phone
  }

  if (clinic.website) {
    schema.url = clinic.website
  }

  if (clinic.latitude && clinic.longitude) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: clinic.latitude,
      longitude: clinic.longitude,
    }
  }

  if (clinic.rating && clinic.review_count) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: clinic.rating,
      reviewCount: clinic.review_count,
      bestRating: 5,
    }
  }

  if (clinic.opening_hours && typeof clinic.opening_hours === "object") {
    const dayMap: Record<string, string> = {
      monday: "Monday",
      tuesday: "Tuesday",
      wednesday: "Wednesday",
      thursday: "Thursday",
      friday: "Friday",
      saturday: "Saturday",
      sunday: "Sunday",
    }

    const specs: string[] = []
    for (const [day, value] of Object.entries(clinic.opening_hours)) {
      const schemaDay = dayMap[day.toLowerCase()]
      if (!schemaDay) continue
      if (typeof value === "object" && value !== null && "open" in value && "close" in value) {
        if (!(value as { closed?: boolean }).closed && (value as { open: string }).open && (value as { close: string }).close) {
          specs.push(`${schemaDay} ${(value as { open: string }).open}-${(value as { close: string }).close}`)
        }
      } else if (typeof value === "string" && value.toLowerCase() !== "closed") {
        specs.push(`${schemaDay} ${value}`)
      }
    }

    if (specs.length > 0) {
      schema.openingHours = specs
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
