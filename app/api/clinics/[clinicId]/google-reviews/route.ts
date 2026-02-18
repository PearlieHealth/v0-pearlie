import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clinicId: string }> }
) {
  try {
    const { clinicId } = await params

    if (!clinicId) {
      return NextResponse.json({ reviews: [] })
    }

    const supabase = createAdminClient()

    // Look up clinic's google_place_id
    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .select("google_place_id")
      .eq("id", clinicId)
      .single()

    if (clinicError || !clinic?.google_place_id) {
      console.error("[google-reviews] No google_place_id for clinic:", clinicId, "error:", clinicError?.message)
      return NextResponse.json({ reviews: [], debug: { reason: "no_place_id", clinicId, error: clinicError?.message } })
    }

    const placeId = clinic.google_place_id

    // Check cache
    const { data: cached } = await supabase
      .from("google_reviews_cache")
      .select("reviews, fetched_at")
      .eq("clinic_id", clinicId)
      .single()

    if (cached && cached.fetched_at) {
      const fetchedAt = new Date(cached.fetched_at).getTime()
      if (Date.now() - fetchedAt < CACHE_DURATION_MS) {
        return NextResponse.json({ reviews: cached.reviews || [] })
      }
    }

    // Fetch from Google Places API (new)
    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      console.error("[google-reviews] GOOGLE_PLACES_API_KEY not set")
      return NextResponse.json({ reviews: [], debug: { reason: "no_api_key" } })
    }

    const googleRes = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}?fields=reviews&languageCode=en`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "reviews",
        },
      }
    )

    if (!googleRes.ok) {
      const errorText = await googleRes.text()
      console.error("[google-reviews] Google API error:", googleRes.status, errorText)
      // Return cached data if available, even if stale
      if (cached?.reviews) {
        return NextResponse.json({ reviews: cached.reviews, debug: { reason: "api_error_cached", status: googleRes.status } })
      }
      return NextResponse.json({ reviews: [], debug: { reason: "api_error", status: googleRes.status, error: errorText.slice(0, 200) } })
    }

    const googleData = await googleRes.json()
    const rawReviews = googleData.reviews || []

    // Parse and limit to 5 reviews
    const reviews = rawReviews.slice(0, 5).map((r: any) => ({
      authorName: r.authorAttribution?.displayName || "Anonymous",
      authorPhotoUrl: r.authorAttribution?.photoUri || null,
      rating: r.rating || 0,
      relativeTime: r.relativePublishTimeDescription || "",
      text: r.text?.text || "",
    }))

    // Upsert cache
    await supabase
      .from("google_reviews_cache")
      .upsert(
        {
          clinic_id: clinicId,
          reviews,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "clinic_id" }
      )

    return NextResponse.json({ reviews })
  } catch (error) {
    console.error("[google-reviews] Error:", error)
    return NextResponse.json({ reviews: [] })
  }
}
