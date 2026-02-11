import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query || query.trim().length < 3) {
      return NextResponse.json({ error: "Search query must be at least 3 characters" }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY

    if (!apiKey) {
      console.error("[v0] GOOGLE_PLACES_API_KEY not configured")
      return NextResponse.json({ error: "Google Places API key not configured" }, { status: 500 })
    }
    
    console.log("[v0] Google clinic search (New API) - query:", query)

    // Use the new Places API (New) - Text Search endpoint
    const searchUrl = "https://places.googleapis.com/v1/places:searchText"
    
    const searchResponse = await fetch(searchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.regularOpeningHours,places.photos"
      },
      body: JSON.stringify({
        textQuery: `${query} dental clinic`,
        locationBias: {
          circle: {
            center: { latitude: 51.5074, longitude: -0.1278 }, // London, UK
            radius: 50000.0 // 50km radius
          }
        },
        maxResultCount: 5
      })
    })

    const searchData = await searchResponse.json()
    
    console.log("[v0] Google Places New API response:", searchResponse.status, searchData.error?.message || "OK")

    if (!searchResponse.ok) {
      console.error("[v0] Google Places New API error:", searchData.error)
      return NextResponse.json({ 
        error: searchData.error?.message || "Search failed" 
      }, { status: searchResponse.status })
    }

    if (!searchData.places || searchData.places.length === 0) {
      return NextResponse.json({ results: [] })
    }

    // Format results for frontend
    const formattedResults = searchData.places.map((place: any) => {
      const address = place.formattedAddress || ""
      
      // Extract postcode from address
      const postcodeMatch = address.match(/[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}/i)
      const postcode = postcodeMatch ? postcodeMatch[0] : ""

      // Get photo URL using the new API format
      let photoUrl = null
      if (place.photos && place.photos.length > 0) {
        const photoName = place.photos[0].name
        photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=800&maxWidthPx=1200&key=${apiKey}`
      }

      return {
        placeId: place.id,
        name: place.displayName?.text || "",
        address: address,
        postcode,
        latitude: place.location?.latitude || 0,
        longitude: place.location?.longitude || 0,
        rating: place.rating || 0,
        reviewCount: place.userRatingCount || 0,
        phone: place.nationalPhoneNumber || place.internationalPhoneNumber || "",
        website: place.websiteUri || "",
        mapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.id}`,
        openingHours: place.regularOpeningHours?.weekdayDescriptions || [],
        photoUrl,
      }
    })

    return NextResponse.json({ results: formattedResults })
  } catch (error) {
    console.error("[v0] Google Places API error:", error)
    return NextResponse.json({ error: "Failed to search clinics" }, { status: 500 })
  }
}
