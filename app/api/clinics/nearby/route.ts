import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { CLINIC_CARD_SELECT } from "@/lib/clinics/queries"
import { calculateHaversineDistance } from "@/lib/utils/geo"

const MAX_RADIUS_MILES = 10
const DEFAULT_RADIUS_MILES = 5
const MAX_RESULTS = 6

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const lat = parseFloat(searchParams.get("lat") || "")
  const lng = parseFloat(searchParams.get("lng") || "")
  const radius = Math.min(
    parseFloat(searchParams.get("radius") || String(DEFAULT_RADIUS_MILES)),
    MAX_RADIUS_MILES
  )

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: "lat and lng query parameters are required" },
      { status: 400 }
    )
  }

  // Bounding box filter (rough, fast — then refine with Haversine)
  const latDelta = radius / 69
  const lngDelta = radius / 43 // approx at London's latitude
  const minLat = lat - latDelta
  const maxLat = lat + latDelta
  const minLng = lng - lngDelta
  const maxLng = lng + lngDelta

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("clinics")
      .select(CLINIC_CARD_SELECT + ", latitude, longitude")
      .eq("is_archived", false)
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .gte("latitude", minLat)
      .lte("latitude", maxLat)
      .gte("longitude", minLng)
      .lte("longitude", maxLng)

    if (error) {
      console.error("Nearby clinics query error:", error)
      return NextResponse.json({ clinics: [] })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ clinics: [] })
    }

    // Compute exact distance, filter by radius, sort
    const clinics = data
      .map((clinic) => ({
        ...clinic,
        distance_miles: calculateHaversineDistance(
          lat,
          lng,
          clinic.latitude as number,
          clinic.longitude as number
        ),
      }))
      .filter((c) => c.distance_miles <= radius)
      .sort((a, b) => {
        // Verified first
        if (a.verified && !b.verified) return -1
        if (!a.verified && b.verified) return 1
        // Then rating desc
        if ((b.rating ?? 0) !== (a.rating ?? 0)) return (b.rating ?? 0) - (a.rating ?? 0)
        // Then distance asc
        return a.distance_miles - b.distance_miles
      })
      .slice(0, MAX_RESULTS)
      // Strip lat/lng from response
      .map(({ latitude, longitude, ...rest }) => rest)

    return NextResponse.json({ clinics })
  } catch {
    return NextResponse.json({ clinics: [] })
  }
}
