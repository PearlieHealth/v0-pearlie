export interface PostcodeResult {
  postcode: string
  latitude: number
  longitude: number
  country: string
  region: string
  admin_district: string
}

export async function geocodePostcode(postcode: string): Promise<PostcodeResult | null> {
  try {
    const sanitized = postcode.replace(/\s/g, "").toUpperCase()
    const response = await fetch(`https://api.postcodes.io/postcodes/${sanitized}`)

    if (!response.ok) {
      console.warn(`[v0] Postcode lookup failed for ${postcode}: ${response.status}`)
      return null
    }

    const data = await response.json()

    if (data.status !== 200 || !data.result) {
      return null
    }

    return {
      postcode: data.result.postcode,
      latitude: data.result.latitude,
      longitude: data.result.longitude,
      country: data.result.country,
      region: data.result.region,
      admin_district: data.result.admin_district,
    }
  } catch (error) {
    console.error(`[v0] Error geocoding postcode ${postcode}:`, error)
    return null
  }
}

export function validateUKPostcode(postcode: string): boolean {
  // UK postcode regex pattern - covers all valid formats
  const ukPostcodeRegex = /^([A-Z]{1,2}\d{1,2}[A-Z]?)\s*(\d[A-Z]{2})$/i
  return ukPostcodeRegex.test(postcode.trim())
}
