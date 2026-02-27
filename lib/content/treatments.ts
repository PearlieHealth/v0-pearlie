import { getAllContent, getContentBySlug, type ContentMeta } from "./mdx"

export interface TreatmentFAQ {
  question: string
  answer: string
}

export interface TreatmentMeta extends ContentMeta {
  treatmentName: string
  clinicFilterTags: string[]
  intakeTreatment: string
  priceRange: string
  treatmentDuration: string
  relatedBlogSlugs: string[]
  relatedTreatmentSlugs: string[]
  faqs: TreatmentFAQ[]
  serviceType: string
  medicalSpecialty?: string
  financeAvailable?: boolean
}

const CONTENT_TYPE = "treatments"

export function getAllTreatments(): TreatmentMeta[] {
  return getAllContent<TreatmentMeta>(CONTENT_TYPE)
}

export function getTreatmentBySlug(
  slug: string
): { meta: TreatmentMeta; content: string } | null {
  return getContentBySlug<TreatmentMeta>(CONTENT_TYPE, slug)
}

export function getRelatedTreatments(
  currentSlug: string,
  limit = 3
): TreatmentMeta[] {
  const current = getTreatmentBySlug(currentSlug)
  if (!current) return []

  const allTreatments = getAllTreatments().filter((t) => t.slug !== currentSlug)

  if (current.meta.relatedTreatmentSlugs?.length) {
    const explicit = current.meta.relatedTreatmentSlugs
      .map((slug) => allTreatments.find((t) => t.slug === slug))
      .filter(Boolean) as TreatmentMeta[]

    if (explicit.length >= limit) return explicit.slice(0, limit)

    const remaining = allTreatments
      .filter(
        (t) => !current.meta.relatedTreatmentSlugs.includes(t.slug)
      )
      .slice(0, limit - explicit.length)

    return [...explicit, ...remaining]
  }

  return allTreatments.slice(0, limit)
}
