/**
 * Shared clinic creation pipeline for bulk import.
 *
 * Extracts the reusable logic from:
 * - POST /api/admin/clinics (geocoding, sanitization, insert)
 * - handleGoogleClinicSelect (photo re-upload)
 * - POST /api/admin/reupload-google-photo (download + Supabase upload)
 *
 * All functions operate server-side with the admin Supabase client.
 */

import { createAdminClient } from "@/lib/supabase/admin"
import { TREATMENT_OPTIONS } from "@/lib/constants"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClinicCreateInput {
  name: string
  address: string
  postcode: string
  latitude?: number
  longitude?: number
  phone?: string
  website?: string
  google_place_id: string
  google_rating?: number
  google_review_count?: number
  google_maps_url?: string
  opening_hours?: any
  images?: string[]
  is_live?: boolean
  is_archived?: boolean
  verified?: boolean
  description?: string
}

export interface ClinicCreateResult {
  success: boolean
  clinicId?: string
  error?: string
}

export interface PhotoUploadResult {
  urls: string[]
  failedCount: number
}

// ---------------------------------------------------------------------------
// Geocoding (same as /api/admin/clinics)
// ---------------------------------------------------------------------------

export async function geocodePostcode(
  postcode: string,
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const clean = postcode.toUpperCase().trim().replace(/\s+/g, "")
    const res = await fetch(`https://api.postcodes.io/postcodes/${clean}`)
    if (!res.ok) return null
    const data = await res.json()
    if (data.status === 200 && data.result) {
      return { latitude: data.result.latitude, longitude: data.result.longitude }
    }
    return null
  } catch {
    return null
  }
}

export function validateUKPostcode(postcode: string): boolean {
  return /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i.test(postcode.trim())
}

// ---------------------------------------------------------------------------
// Photo re-upload (same logic as /api/admin/reupload-google-photo)
// ---------------------------------------------------------------------------

const MAX_PHOTO_RETRIES = 2 // fewer retries for bulk to save time

async function downloadAndUploadPhoto(
  photoUrl: string,
  apiKey: string,
): Promise<string | null> {
  for (let attempt = 1; attempt <= MAX_PHOTO_RETRIES; attempt++) {
    try {
      const imageResponse = await fetch(photoUrl, {
        headers: {
          Accept: "image/*",
          "X-Goog-Api-Key": apiKey,
        },
        redirect: "follow",
      })

      if (!imageResponse.ok) continue

      const contentType = imageResponse.headers.get("content-type") || "image/jpeg"
      if (!contentType.startsWith("image/")) continue

      const imageBuffer = new Uint8Array(await imageResponse.arrayBuffer())

      const extMap: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      }
      const ext = extMap[contentType] || "jpg"

      const supabase = createAdminClient()
      const timestamp = Date.now()
      const rand = Math.random().toString(36).substring(7)
      const path = `clinic-photos/main/${timestamp}_${rand}.${ext}`

      const { error } = await supabase.storage
        .from("clinic-assets")
        .upload(path, imageBuffer, { contentType, cacheControl: "3600", upsert: false })

      if (error) continue

      const { data: urlData } = supabase.storage.from("clinic-assets").getPublicUrl(path)
      return urlData.publicUrl
    } catch {
      // retry
    }
  }
  return null
}

/**
 * Re-upload Google Places photos to Supabase storage.
 * Same pipeline as the manual admin flow but runs server-side.
 */
export async function reuploadGooglePhotos(
  photoUrls: string[],
  apiKey: string,
  maxPhotos = 5,
): Promise<PhotoUploadResult> {
  const batch = photoUrls.slice(0, maxPhotos)
  const results = await Promise.allSettled(
    batch.map((url) => downloadAndUploadPhoto(url, apiKey)),
  )

  const urls: string[] = []
  let failedCount = 0

  for (const r of results) {
    if (r.status === "fulfilled" && r.value) {
      urls.push(r.value)
    } else {
      failedCount++
    }
  }

  return { urls, failedCount }
}

// ---------------------------------------------------------------------------
// Deduplication checks
// ---------------------------------------------------------------------------

/**
 * Check if a clinic already exists by google_place_id, website domain, or
 * name + postcode combination.  Returns the existing clinic id if found.
 */
export async function findDuplicateClinic(
  placeId: string,
  website: string | null,
  name: string,
  postcode: string,
): Promise<string | null> {
  const supabase = createAdminClient()

  // 1. Check by google_place_id (unique constraint)
  if (placeId) {
    const { data } = await supabase
      .from("clinics")
      .select("id")
      .eq("google_place_id", placeId)
      .maybeSingle()
    if (data) return data.id
  }

  // 2. Check by website domain
  if (website && website.length > 0) {
    try {
      const domain = new URL(website).hostname.replace(/^www\./, "")
      const { data } = await supabase
        .from("clinics")
        .select("id, website")
        .not("website", "is", null)
      if (data) {
        for (const c of data) {
          try {
            const existingDomain = new URL(c.website).hostname.replace(/^www\./, "")
            if (existingDomain === domain) return c.id
          } catch {
            // skip invalid URLs
          }
        }
      }
    } catch {
      // invalid URL — skip domain check
    }
  }

  // 3. Check by name + postcode
  if (name && postcode) {
    const cleanPostcode = postcode.toUpperCase().replace(/\s+/g, "")
    const { data } = await supabase
      .from("clinics")
      .select("id, postcode")
      .ilike("name", name)
    if (data) {
      for (const c of data) {
        const existingClean = (c.postcode || "").toUpperCase().replace(/\s+/g, "")
        if (existingClean === cleanPostcode) return c.id
      }
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Create clinic (same logic as POST /api/admin/clinics)
// ---------------------------------------------------------------------------

/**
 * Create a single clinic record in the database.
 * Mirrors the logic of POST /api/admin/clinics but callable from server-side
 * bulk import code.
 */
export async function createClinicRecord(
  input: ClinicCreateInput,
): Promise<ClinicCreateResult> {
  try {
    // Validate postcode
    if (!input.postcode || !validateUKPostcode(input.postcode)) {
      return { success: false, error: `Invalid postcode: ${input.postcode}` }
    }

    // Geocode if coords not provided
    let lat = input.latitude
    let lng = input.longitude
    if (!lat || !lng) {
      const coords = await geocodePostcode(input.postcode)
      if (!coords) {
        return { success: false, error: `Could not geocode postcode: ${input.postcode}` }
      }
      lat = coords.latitude
      lng = coords.longitude
    }

    // Build clean body
    const body: Record<string, any> = {
      name: input.name,
      address: input.address,
      postcode: input.postcode,
      latitude: lat,
      longitude: lng,
      phone: input.phone || "",
      website: input.website || null,
      google_place_id: input.google_place_id,
      google_rating: input.google_rating ?? null,
      google_review_count: input.google_review_count ?? null,
      google_maps_url: input.google_maps_url || null,
      images: input.images || [],
      treatments: [...TREATMENT_OPTIONS],
      is_live: input.is_live ?? false,
      is_archived: input.is_archived ?? false,
      verified: input.verified ?? false,
      description: input.description || `Dental practice located at ${input.address}`,
    }

    // Handle opening hours
    if (input.opening_hours) {
      body.opening_hours = input.opening_hours
    }

    // Sanitize empty strings to null
    const fieldsToSanitize = ["price_range", "city", "email", "notification_email", "tag_notes", "description"]
    for (const field of fieldsToSanitize) {
      if (body[field] === "" || body[field] === undefined) {
        body[field] = null
      }
    }

    // Remove undefined values
    const cleanBody = Object.fromEntries(
      Object.entries(body).filter(([_, v]) => v !== undefined),
    )

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("clinics")
      .insert([cleanBody])
      .select("id")
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, clinicId: data.id }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error creating clinic",
    }
  }
}
