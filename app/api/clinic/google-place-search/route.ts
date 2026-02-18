import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/supabase/get-clinic-user"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const query = request.nextUrl.searchParams.get("q")
    if (!query || query.length < 3) {
      return NextResponse.json({ results: [] })
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Google Places API not configured" }, { status: 500 })
    }

    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri",
      },
      body: JSON.stringify({
        textQuery: query,
        includedType: "dentist",
        languageCode: "en",
      }),
    })

    if (!res.ok) {
      console.error("[google-place-search] API error:", res.status)
      return NextResponse.json({ error: "Google API error" }, { status: 502 })
    }

    const data = await res.json()
    const results = (data.places || []).slice(0, 5).map((place: any) => ({
      placeId: place.id,
      name: place.displayName?.text || "",
      address: place.formattedAddress || "",
      rating: place.rating || null,
      reviewCount: place.userRatingCount || 0,
      mapsUrl: place.googleMapsUri || null,
    }))

    return NextResponse.json({ results })
  } catch (error) {
    console.error("[google-place-search] Error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
