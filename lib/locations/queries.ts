import { createClient } from "@/lib/supabase/server"
import { calculateHaversineDistance } from "@/lib/utils/geo"
import type { LondonArea, LondonRegion } from "./london"

export interface AreaTestimonial {
  authorName: string
  rating: number
  text: string
  relativeTime: string
  clinicName: string
  clinicId: string
}

/** Fields matching the public clinic API — safe for patient-facing views */
const LOCATION_CLINIC_FIELDS = `
  id, name, slug, address, postcode, city, latitude, longitude,
  phone, website, rating, review_count, treatments, description,
  facilities, opening_hours, images, verified, accepts_nhs,
  parking_available, wheelchair_accessible, tags, available_days,
  available_hours, accepts_same_day, highlight_chips, price_range,
  featured, google_rating, google_review_count, google_maps_url
`.replace(/\s+/g, " ").trim()

export interface LocationClinic {
  id: string
  name: string
  slug: string | null
  address: string
  postcode: string
  city: string
  latitude: number
  longitude: number
  phone: string | null
  website: string | null
  rating: number
  review_count: number
  treatments: string[] | null
  description: string | null
  images: string[] | null
  verified: boolean
  accepts_nhs: boolean
  accepts_same_day: boolean
  tags: string[] | null
  highlight_chips: string[] | null
  price_range: string | null
  featured: boolean
  distance_miles: number
  google_rating: number | null
  google_review_count: number | null
  google_maps_url: string | null
}

/**
 * Rough degree offset for a given radius in miles at London's latitude (~51.5°N).
 * 1° lat ≈ 69 miles, 1° lng ≈ 69 * cos(51.5°) ≈ 43 miles.
 */
function boundingBox(center: { lat: number; lng: number }, radiusMiles: number) {
  const latDelta = radiusMiles / 69
  const lngDelta = radiusMiles / 43
  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  }
}

export async function getClinicsNearArea(area: LondonArea): Promise<LocationClinic[]> {
  const supabase = await createClient()
  const box = boundingBox(area.center, area.radiusMiles)

  const { data, error } = await supabase
    .from("clinics")
    .select(LOCATION_CLINIC_FIELDS)
    .eq("is_archived", false)
    .eq("is_live", true)
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .gte("latitude", box.minLat)
    .lte("latitude", box.maxLat)
    .gte("longitude", box.minLng)
    .lte("longitude", box.maxLng)

  if (error) {
    console.error(`Error fetching clinics for area ${area.slug}:`, error)
    return []
  }

  if (!data || data.length === 0) return []

  // Cast rows — Supabase returns a generic type for dynamic column selection
  const rows = data as unknown as Array<Omit<LocationClinic, "distance_miles"> & { latitude: number; longitude: number }>

  // Compute exact distance and filter by actual radius
  const clinics: LocationClinic[] = rows
    .map((clinic) => ({
      ...clinic,
      distance_miles: calculateHaversineDistance(
        area.center.lat,
        area.center.lng,
        clinic.latitude,
        clinic.longitude,
      ),
    }))
    .filter((c) => c.distance_miles <= area.radiusMiles)
    .sort((a, b) => {
      // Featured first
      if (a.featured !== b.featured) return a.featured ? -1 : 1
      // Then rating desc
      if (b.rating !== a.rating) return b.rating - a.rating
      // Then distance asc
      return a.distance_miles - b.distance_miles
    })

  return clinics
}

export async function getClinicsNearRegion(region: LondonRegion): Promise<LocationClinic[]> {
  const supabase = await createClient()
  const box = boundingBox(region.center, region.radiusMiles)

  const { data, error } = await supabase
    .from("clinics")
    .select(LOCATION_CLINIC_FIELDS)
    .eq("is_archived", false)
    .eq("is_live", true)
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .gte("latitude", box.minLat)
    .lte("latitude", box.maxLat)
    .gte("longitude", box.minLng)
    .lte("longitude", box.maxLng)

  if (error) {
    console.error(`Error fetching clinics for region ${region.slug}:`, error)
    return []
  }

  if (!data || data.length === 0) return []

  const rows = data as unknown as Array<Omit<LocationClinic, "distance_miles"> & { latitude: number; longitude: number }>

  const clinics: LocationClinic[] = rows
    .map((clinic) => ({
      ...clinic,
      distance_miles: calculateHaversineDistance(
        region.center.lat,
        region.center.lng,
        clinic.latitude,
        clinic.longitude,
      ),
    }))
    .filter((c) => c.distance_miles <= region.radiusMiles)
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1
      if (b.rating !== a.rating) return b.rating - a.rating
      return a.distance_miles - b.distance_miles
    })

  return clinics
}

/**
 * Fetch real Google reviews from cached reviews for a set of clinics.
 * Returns up to `limit` 4–5 star reviews with text, attributed to the clinic.
 */
export async function getTestimonialsForClinics(
  clinics: LocationClinic[],
  limit = 3,
): Promise<AreaTestimonial[]> {
  if (clinics.length === 0) return []

  const supabase = await createClient()
  const clinicIds = clinics.slice(0, 20).map((c) => c.id)

  const { data, error } = await supabase
    .from("google_reviews_cache")
    .select("clinic_id, reviews")
    .in("clinic_id", clinicIds)

  if (error || !data) return []

  const clinicMap = new Map(clinics.map((c) => [c.id, c.name]))

  const testimonials: AreaTestimonial[] = []
  for (const row of data) {
    const reviews = (row.reviews as Array<{
      authorName: string
      rating: number
      text: string
      relativeTime: string
    }>) || []

    for (const r of reviews) {
      if (r.rating >= 4 && r.text && r.text.length >= 40) {
        testimonials.push({
          authorName: r.authorName,
          rating: r.rating,
          text: r.text,
          relativeTime: r.relativeTime,
          clinicName: clinicMap.get(row.clinic_id) || "Dental Clinic",
          clinicId: row.clinic_id,
        })
      }
    }
  }

  // Prefer 5-star reviews, then by text length (more detail = better testimonial)
  testimonials.sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating
    return b.text.length - a.text.length
  })

  // Deduplicate by clinic — max 1 review per clinic for variety
  const seen = new Set<string>()
  const unique: AreaTestimonial[] = []
  for (const t of testimonials) {
    if (seen.has(t.clinicId)) continue
    seen.add(t.clinicId)
    unique.push(t)
    if (unique.length >= limit) break
  }

  return unique
}
