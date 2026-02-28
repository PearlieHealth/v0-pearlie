/**
 * Google Places bulk search for London dental clinics.
 *
 * Reuses the same Google Places (New) Text Search API as the manual admin flow
 * (/api/google/clinics/search), but iterates across London neighbourhoods to
 * achieve broad coverage.
 */

// London neighbourhood seeds grouped by area
export const LONDON_NEIGHBOURHOODS: Record<string, string[]> = {
  Central: [
    "Soho", "Mayfair", "Marylebone", "Fitzrovia", "Covent Garden",
    "Bank", "London Bridge", "Holborn", "Bloomsbury", "Westminster",
  ],
  North: [
    "Islington", "Camden", "Hampstead", "Finchley", "Muswell Hill",
    "Highgate", "Crouch End", "Stoke Newington",
  ],
  East: [
    "Shoreditch", "Canary Wharf", "Stratford", "Walthamstow",
    "Bethnal Green", "Mile End", "Hackney",
  ],
  West: [
    "Kensington", "Chelsea", "Hammersmith", "Ealing", "Chiswick",
    "Notting Hill", "Fulham", "Shepherd's Bush",
  ],
  South: [
    "Clapham", "Balham", "Wimbledon", "Greenwich", "Dulwich",
    "Brixton", "Peckham", "Putney", "Croydon",
  ],
}

export const ALL_NEIGHBOURHOODS = Object.values(LONDON_NEIGHBOURHOODS).flat()

export interface GooglePlaceResult {
  placeId: string
  name: string
  address: string
  postcode: string
  latitude: number
  longitude: number
  rating: number
  reviewCount: number
  phone: string
  website: string
  mapsUrl: string
  openingHours: string[]
  photoUrl: string | null
  photoUrls: string[]
}

/**
 * Search Google Places (New) Text Search API for dental clinics in a specific
 * London neighbourhood.  Returns up to 20 results per query.
 *
 * This is the same API used by `/api/google/clinics/search` but with a higher
 * maxResultCount for bulk import efficiency.
 */
export async function searchGooglePlaces(
  neighbourhood: string,
  apiKey: string,
): Promise<GooglePlaceResult[]> {
  const searchUrl = "https://places.googleapis.com/v1/places:searchText"

  const response = await fetch(searchUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.regularOpeningHours,places.photos,places.types",
    },
    body: JSON.stringify({
      textQuery: `dentist ${neighbourhood} London`,
      locationBias: {
        circle: {
          center: { latitude: 51.5074, longitude: -0.1278 },
          radius: 50000.0,
        },
      },
      maxResultCount: 20,
    }),
  })

  const data = await response.json()

  if (!response.ok || !data.places) {
    console.error("[bulk-import] Google search error:", data.error?.message || response.status)
    return []
  }

  return data.places.map((place: any) => {
    const address = place.formattedAddress || ""
    const postcodeMatch = address.match(/[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}/i)
    const postcode = postcodeMatch ? postcodeMatch[0] : ""

    const photoUrls: string[] = (place.photos || []).map(
      (photo: any) =>
        `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=800&maxWidthPx=1200`,
    )

    return {
      placeId: place.id,
      name: place.displayName?.text || "",
      address,
      postcode,
      latitude: place.location?.latitude || 0,
      longitude: place.location?.longitude || 0,
      rating: place.rating || 0,
      reviewCount: place.userRatingCount || 0,
      phone: place.nationalPhoneNumber || place.internationalPhoneNumber || "",
      website: place.websiteUri || "",
      mapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.id}`,
      openingHours: place.regularOpeningHours?.weekdayDescriptions || [],
      photoUrl: photoUrls[0] || null,
      photoUrls,
    }
  })
}

/**
 * Check if a Google Places address is within Greater London.
 * Simple heuristic: address contains "London" or a London postcode prefix.
 */
export function isGreaterLondon(address: string): boolean {
  if (/london/i.test(address)) return true
  // London postcode areas
  const londonPrefixes = [
    "E", "EC", "N", "NW", "SE", "SW", "W", "WC",
    "BR", "CR", "DA", "EN", "HA", "IG", "KT", "RM", "SM", "TW", "UB",
  ]
  const postcodeMatch = address.match(/([A-Z]{1,2})\d/i)
  if (postcodeMatch) {
    return londonPrefixes.includes(postcodeMatch[1].toUpperCase())
  }
  return false
}
