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
      return NextResponse.json({ reviews: [], error: "missing_clinic_id" })
    }

    const supabase = createAdminClient()

    // Look up clinic's google_place_id
    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .select("google_place_id")
      .eq("id", clinicId)
      .single()

    if (clinicError) {
      console.error("[google-reviews] Clinic lookup error:", clinicError.message)
      return NextResponse.json({ reviews: [], error: "clinic_lookup_failed", detail: clinicError.message })
    }

    if (!clinic?.google_place_id) {
      return NextResponse.json({ reviews: [], error: "no_google_place_id" })
    }

    const placeId = clinic.google_place_id

    // Check cache
    const { data: cached, error: cacheError } = await supabase
      .from("google_reviews_cache")
      .select("reviews, fetched_at")
      .eq("clinic_id", clinicId)
      .single()

    if (cacheError && !cacheError.message.includes("0 rows")) {
      console.error("[google-reviews] Cache lookup error:", cacheError.message)
      // Continue past cache — not fatal
    }

    if (cached && cached.fetched_at) {
      const fetchedAt = new Date(cached.fetched_at).getTime()
      if (Date.now() - fetchedAt < CACHE_DURATION_MS) {
        return NextResponse.json({ reviews: cached.reviews || [], source: "cache" })
      }
    }

    // Fetch from Google Places API (new)
    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      console.error("[google-reviews] GOOGLE_PLACES_API_KEY not set")
      return NextResponse.json({ reviews: [], error: "api_key_missing" })
    }

    const googleUrl = `https://places.googleapis.com/v1/places/${placeId}?languageCode=en`
    const googleRes = await fetch(googleUrl, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "reviews",
      },
    })

    if (!googleRes.ok) {
      const errorBody = await googleRes.text().catch(() => "")
      console.error("[google-reviews] Google API error:", googleRes.status, errorBody)
      // Return cached data if available, even if stale
      if (cached?.reviews) {
        return NextResponse.json({ reviews: cached.reviews, source: "stale_cache" })
      }
      return NextResponse.json({
        reviews: [],
        error: "google_api_error",
        detail: `Status ${googleRes.status}`,
      })
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
    const { error: upsertError } = await supabase
      .from("google_reviews_cache")
      .upsert(
        {
          clinic_id: clinicId,
          reviews,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "clinic_id" }
      )

    if (upsertError) {
      console.error("[google-reviews] Cache upsert error:", upsertError.message)
      // Non-fatal — still return the reviews we fetched
    }

    return NextResponse.json({ reviews, source: "google_api" })
  } catch (error) {
    console.error("[google-reviews] Error:", error)
    return NextResponse.json({ reviews: [], error: "server_error" })
  }
}
