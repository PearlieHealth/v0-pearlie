import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

/**
 * One-shot fix: scans all clinics and re-uploads any Google Places photo
 * URLs to Supabase storage, replacing them with permanent URLs.
 *
 * GET /api/admin/fix-clinic-images
 *
 * Safe to run multiple times — only touches clinics with Google Places URLs.
 */
export async function GET() {
  const supabase = createAdminClient()
  const envApiKey = process.env.GOOGLE_PLACES_API_KEY

  const { data: clinics, error } = await supabase
    .from("clinics")
    .select("id, name, images, google_place_id")
    .eq("is_archived", false)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: { name: string; before: number; fixed: number; failed: number; errors?: string[] }[] = []

  for (const clinic of clinics || []) {
    const images: string[] = clinic.images || []
    const googleImages = images.filter((url) => url?.includes("places.googleapis.com"))

    if (googleImages.length === 0) continue

    const newImages = [...images]
    let fixed = 0
    let failed = 0
    const errors: string[] = []

    for (let i = 0; i < newImages.length; i++) {
      const url = newImages[i]
      if (!url?.includes("places.googleapis.com")) continue

      try {
        // Extract place_id from URL path: /v1/places/{placeId}/photos/...
        const placeIdFromUrl = extractPlaceId(url)
        const placeId = clinic.google_place_id || placeIdFromUrl
        const keyToUse = envApiKey || extractKeyFromUrl(url)

        if (!keyToUse) {
          errors.push("No API key available")
          failed++
          continue
        }

        // Try 1: fetch the URL directly (uses embedded key)
        let response = await fetch(url, { redirect: "follow" })

        // Try 2: use env var key via header
        if (!response.ok && envApiKey) {
          const parsed = new URL(url)
          parsed.searchParams.delete("key")
          response = await fetch(parsed.toString(), {
            headers: { Accept: "image/*", "X-Goog-Api-Key": envApiKey },
            redirect: "follow",
          })
        }

        // Try 3: expired photo reference — fetch fresh photos from Google
        if (!response.ok && placeId) {
          const freshUrl = await getFreshPhotoUrl(placeId, keyToUse)
          if (freshUrl) {
            response = await fetch(freshUrl, { redirect: "follow" })
          } else {
            errors.push(`No fresh photo found for place ${placeId}`)
          }
        }

        if (!response.ok) {
          errors.push(`All attempts failed (last: HTTP ${response.status})`)
          failed++
          continue
        }

        const contentType = response.headers.get("content-type") || "image/jpeg"
        if (!contentType.startsWith("image/")) {
          errors.push(`Not an image: ${contentType}`)
          failed++
          continue
        }

        const imageBuffer = new Uint8Array(await response.arrayBuffer())
        const extMap: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }
        const ext = extMap[contentType] || "jpg"
        const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`
        const path = `clinic-photos/main/${filename}`

        const { error: uploadError } = await supabase.storage
          .from("clinic-assets")
          .upload(path, imageBuffer, { contentType, cacheControl: "3600", upsert: false })

        if (uploadError) {
          errors.push(`Upload: ${uploadError.message}`)
          failed++
          continue
        }

        const { data: urlData } = supabase.storage.from("clinic-assets").getPublicUrl(path)
        newImages[i] = urlData.publicUrl
        fixed++
      } catch (err) {
        errors.push(`${err}`)
        failed++
      }
    }

    if (fixed > 0) {
      const { error: updateError } = await supabase
        .from("clinics")
        .update({ images: newImages })
        .eq("id", clinic.id)

      if (updateError) {
        errors.push(`DB update: ${updateError.message}`)
      }
    }

    results.push({ name: clinic.name, before: googleImages.length, fixed, failed, ...(errors.length > 0 ? { errors } : {}) })
  }

  return NextResponse.json({
    message: results.length === 0
      ? "All clinics already have Supabase URLs — no Google URLs found"
      : `Processed ${results.length} clinics`,
    results,
  })
}

/** Extract place_id from a Google Places photo URL path */
function extractPlaceId(url: string): string | null {
  // URL format: https://places.googleapis.com/v1/places/{placeId}/photos/{photoRef}/media?...
  const match = url.match(/\/places\/([^/]+)\/photos\//)
  return match?.[1] || null
}

/** Extract the API key from a URL's query params */
function extractKeyFromUrl(url: string): string | null {
  try {
    return new URL(url).searchParams.get("key")
  } catch {
    return null
  }
}

/** Fetch a fresh photo URL from Google Places for a given place_id */
async function getFreshPhotoUrl(placeId: string, apiKey: string): Promise<string | null> {
  try {
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`
    const res = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "photos",
      },
    })
    if (!res.ok) return null
    const data = await res.json()
    const photoName = data?.photos?.[0]?.name
    if (!photoName) return null
    return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=800&maxWidthPx=1200&key=${apiKey}`
  } catch {
    return null
  }
}
