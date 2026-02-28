import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminAuth } from "@/lib/admin-auth"

// Bulk link Google Place IDs for multiple clinics
export async function POST(request: Request) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Missing GOOGLE_PLACES_API_KEY" }, { status: 500 })
  }

  try {
    const { clinicIds } = await request.json()

    if (!Array.isArray(clinicIds) || clinicIds.length === 0) {
      return NextResponse.json({ error: "clinicIds array required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Fetch clinic details
    const { data: clinics, error } = await supabase
      .from("clinics")
      .select("id, name, address, postcode, google_place_id")
      .in("id", clinicIds)

    if (error) throw error

    const results: Array<{
      clinicId: string
      clinicName: string
      status: "linked" | "already_linked" | "not_found" | "failed"
      googleRating?: number
      googleReviewCount?: number
      error?: string
    }> = []

    for (const clinic of clinics || []) {
      // Skip clinics that already have a google_place_id
      if (clinic.google_place_id) {
        results.push({
          clinicId: clinic.id,
          clinicName: clinic.name,
          status: "already_linked",
        })
        continue
      }

      try {
        // Search Google Places for this clinic
        const query = `${clinic.name}, ${clinic.address || clinic.postcode}`
        const searchRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask":
              "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount",
          },
          body: JSON.stringify({
            textQuery: `${query} dental clinic`,
            locationBias: {
              circle: {
                center: { latitude: 51.5074, longitude: -0.1278 },
                radius: 50000.0,
              },
            },
            maxResultCount: 1,
          }),
        })

        const searchData = await searchRes.json()
        const place = searchData.places?.[0]

        if (!place) {
          results.push({
            clinicId: clinic.id,
            clinicName: clinic.name,
            status: "not_found",
          })
          continue
        }

        const placeId = place.id
        const rating = place.rating || null
        const reviewCount = place.userRatingCount || null
        const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${placeId}`

        // Update clinic with Google data
        const { error: updateError } = await supabase
          .from("clinics")
          .update({
            google_place_id: placeId,
            google_rating: rating,
            google_review_count: reviewCount,
            google_maps_url: mapsUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", clinic.id)

        if (updateError) throw updateError

        results.push({
          clinicId: clinic.id,
          clinicName: clinic.name,
          status: "linked",
          googleRating: rating,
          googleReviewCount: reviewCount,
        })
      } catch (err) {
        results.push({
          clinicId: clinic.id,
          clinicName: clinic.name,
          status: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
        })
      }
    }

    const linked = results.filter((r) => r.status === "linked").length
    const alreadyLinked = results.filter((r) => r.status === "already_linked").length
    const notFound = results.filter((r) => r.status === "not_found").length
    const failed = results.filter((r) => r.status === "failed").length

    return NextResponse.json({
      results,
      summary: { linked, alreadyLinked, notFound, failed, total: results.length },
    })
  } catch (error) {
    console.error("[bulk-google-link] Error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
