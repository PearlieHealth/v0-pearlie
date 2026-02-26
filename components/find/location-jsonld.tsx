import type { LondonArea } from "@/lib/locations/london"
import type { LocationClinic } from "@/lib/locations/queries"

interface LocationJsonLdProps {
  area: LondonArea
  clinics: LocationClinic[]
}

export function LocationJsonLd({ area, clinics }: LocationJsonLdProps) {
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Dentists in ${area.name}, London`,
    numberOfItems: clinics.length,
    itemListElement: clinics.map((clinic, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Dentist",
        name: clinic.name,
        address: {
          "@type": "PostalAddress",
          streetAddress: clinic.address,
          postalCode: clinic.postcode,
          addressLocality: "London",
          addressCountry: "GB",
        },
        ...(clinic.rating > 0 && {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: clinic.rating,
            reviewCount: clinic.review_count || 1,
            bestRating: 5,
          },
        }),
        ...(clinic.phone && { telephone: clinic.phone }),
        ...(clinic.website && { url: clinic.website }),
      },
    })),
  }

  const faqSchema =
    area.faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: area.faq.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        }
      : null

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
    </>
  )
}
