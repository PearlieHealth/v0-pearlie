import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminAuth } from "@/lib/admin-auth"

// Bulk fetch Google reviews data (rating, review count, featured review) for clinics
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

    const { data: clinics, error } = await supabase
      .from("clinics")
      .select("id, name, google_place_id, google_rating, google_review_count, featured_review")
      .in("id", clinicIds)

    if (error) throw error

    const results: Array<{
      clinicId: string
      clinicName: string
      status: "updated" | "no_place_id" | "no_reviews_found" | "failed"
      googleRating?: number
      googleReviewCount?: number
      error?: string
    }> = []

    for (const clinic of clinics || []) {
      if (!clinic.google_place_id) {
        results.push({
          clinicId: clinic.id,
          clinicName: clinic.name,
          status: "no_place_id",
        })
        continue
      }

      try {
        // Fetch place details: rating, review count, and reviews
        const detailsRes = await fetch(
          `https://places.googleapis.com/v1/places/${clinic.google_place_id}?languageCode=en`,
          {
            method: "GET",
            headers: {
              "X-Goog-Api-Key": apiKey,
              "X-Goog-FieldMask": "rating,userRatingCount,reviews,googleMapsUri",
            },
          }
        )

        if (!detailsRes.ok) {
          results.push({
            clinicId: clinic.id,
            clinicName: clinic.name,
            status: "failed",
            error: "Google API error",
          })
          continue
        }

        const detailsData = await detailsRes.json()
        const rating = detailsData.rating || null
        const reviewCount = detailsData.userRatingCount || null
        const mapsUrl = detailsData.googleMapsUri || `https://www.google.com/maps/place/?q=place_id:${clinic.google_place_id}`

        if (!rating && !reviewCount) {
          results.push({
            clinicId: clinic.id,
            clinicName: clinic.name,
            status: "no_reviews_found",
          })
          continue
        }

        // Build update payload
        const updateData: Record<string, any> = {
          google_rating: rating,
          google_review_count: reviewCount,
          google_maps_url: mapsUrl,
          last_google_sync: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        // Pick a featured review if the clinic doesn't already have one
        if (!clinic.featured_review) {
          const rawReviews = detailsData.reviews || []
          const goodReviews = rawReviews.filter(
            (r: any) => r.rating >= 4 && r.text?.text && r.text.text.length >= 40
          )
          if (goodReviews.length > 0) {
            const picked = goodReviews[Math.floor(Math.random() * goodReviews.length)]
            updateData.featured_review = picked.text.text.slice(0, 500)
          }
        }

        // Also upsert into google_reviews_cache for the reviews tab
        const rawReviews = detailsData.reviews || []
        if (rawReviews.length > 0) {
          const parsedReviews = rawReviews.slice(0, 5).map((r: any) => ({
            authorName: r.authorAttribution?.displayName || "Anonymous",
            authorPhotoUrl: r.authorAttribution?.photoUri || null,
            rating: r.rating || 0,
            relativeTime: r.relativePublishTimeDescription || "",
            text: r.text?.text || "",
          }))

          await supabase
            .from("google_reviews_cache")
            .upsert(
              {
                clinic_id: clinic.id,
                reviews: parsedReviews,
                fetched_at: new Date().toISOString(),
              },
              { onConflict: "clinic_id" }
            )
        }

        const { error: updateError } = await supabase
          .from("clinics")
          .update(updateData)
          .eq("id", clinic.id)

        if (updateError) throw updateError

        results.push({
          clinicId: clinic.id,
          clinicName: clinic.name,
          status: "updated",
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

    const updated = results.filter((r) => r.status === "updated").length
    const noPlaceId = results.filter((r) => r.status === "no_place_id").length
    const noReviewsFound = results.filter((r) => r.status === "no_reviews_found").length
    const failed = results.filter((r) => r.status === "failed").length

    return NextResponse.json({
      results,
      summary: { updated, noPlaceId, noReviewsFound, failed, total: results.length },
    })
  } catch (error) {
    console.error("[bulk-fetch-reviews] Error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
