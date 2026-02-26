import { createClient } from "@/lib/supabase/server"
import { calculateHaversineDistance } from "@/lib/utils/geo"
import type { LondonArea } from "./london"

/** Fields matching the public clinic API — safe for patient-facing views */
const LOCATION_CLINIC_FIELDS = `
  id, name, slug, address, postcode, city, latitude, longitude,
  phone, website, rating, review_count, treatments, description,
  facilities, opening_hours, images, verified, accepts_nhs,
  parking_available, wheelchair_accessible, tags, available_days,
  available_hours, accepts_same_day, highlight_chips, price_range,
  featured
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
  highlight_chips: string[] | null
  price_range: string | null
  featured: boolean
  distance_miles: number
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
