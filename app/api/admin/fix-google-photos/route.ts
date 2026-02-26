import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isGooglePlacesUrl(url: string): boolean {
  try {
    return new URL(url).hostname === "places.googleapis.com"
  } catch {
    return false
  }
}

/**
 * Downloads a Google Places photo and uploads to Supabase with retries.
 */
async function downloadAndUpload(
  photoUrl: string,
  apiKey: string,
): Promise<{ url: string; success: boolean }> {
  const parsed = new URL(photoUrl)

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const imageResponse = await fetch(parsed.toString(), {
        headers: { Accept: "image/*", "X-Goog-Api-Key": apiKey },
        redirect: "follow",
      })

      if (!imageResponse.ok) {
        if (attempt < MAX_RETRIES) { await sleep(RETRY_DELAY_MS * attempt); continue }
        break
      }

      const contentType = imageResponse.headers.get("content-type") || "image/jpeg"
      if (!contentType.startsWith("image/")) {
        if (attempt < MAX_RETRIES) { await sleep(RETRY_DELAY_MS * attempt); continue }
        break
      }

      const imageBuffer = new Uint8Array(await imageResponse.arrayBuffer())

      const extMap: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }
      const ext = extMap[contentType] || "jpg"

      const supabase = createAdminClient()
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(7)
      const filename = `${timestamp}_${randomString}.${ext}`
      const path = `clinic-photos/main/${filename}`

      const { error } = await supabase.storage.from("clinic-assets").upload(path, imageBuffer, {
        contentType,
        cacheControl: "3600",
        upsert: false,
      })

      if (error) {
        if (attempt < MAX_RETRIES) { await sleep(RETRY_DELAY_MS * attempt); continue }
        break
      }

      const { data: urlData } = supabase.storage.from("clinic-assets").getPublicUrl(path)
      return { url: urlData.publicUrl, success: true }
    } catch {
      if (attempt < MAX_RETRIES) { await sleep(RETRY_DELAY_MS * attempt); continue }
    }
  }

  return { url: photoUrl, success: false }
}

/**
 * GET: Scan all clinics and return which ones have Google Places URLs
 * POST: Fix all clinics by re-uploading their Google Places photos to Supabase
 */
export async function GET() {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const supabase = createAdminClient()
    const { data: clinics, error } = await supabase
      .from("clinics")
      .select("id, name, images")

    if (error) throw error

    const affected = (clinics || [])
      .filter((c) => c.images?.some((img: string) => isGooglePlacesUrl(img)))
      .map((c) => ({
        id: c.id,
        name: c.name,
        googleUrlCount: c.images.filter((img: string) => isGooglePlacesUrl(img)).length,
        totalImages: c.images.length,
      }))

    return NextResponse.json({
      totalClinics: clinics?.length || 0,
      affectedClinics: affected.length,
      clinics: affected,
    })
  } catch (error) {
    console.error("[fix-google-photos] Scan error:", error)
    return NextResponse.json({ error: "Failed to scan clinics" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Google Places API key not configured" }, { status: 500 })
  }

  try {
    const supabase = createAdminClient()
    const { data: clinics, error } = await supabase
      .from("clinics")
      .select("id, name, images")

    if (error) throw error

    const affected = (clinics || []).filter(
      (c) => c.images?.some((img: string) => isGooglePlacesUrl(img)),
    )

    if (affected.length === 0) {
      return NextResponse.json({ message: "No clinics with Google Places URLs found", fixed: 0 })
    }

    const results: Array<{ id: string; name: string; fixed: number; failed: number }> = []

    for (const clinic of affected) {
      let fixed = 0
      let failed = 0
      const newImages: string[] = []

      for (const imageUrl of clinic.images) {
        if (!isGooglePlacesUrl(imageUrl)) {
          newImages.push(imageUrl)
          continue
        }

        const result = await downloadAndUpload(imageUrl, apiKey)
        if (result.success) {
          newImages.push(result.url)
          fixed++
        } else {
          // Drop the Google URL entirely — it will expire anyway
          failed++
        }
      }

      // Update the clinic's images array
      const { error: updateError } = await supabase
        .from("clinics")
        .update({ images: newImages })
        .eq("id", clinic.id)

      if (updateError) {
        console.error(`[fix-google-photos] Failed to update clinic ${clinic.id}:`, updateError)
        failed = clinic.images.filter((img: string) => isGooglePlacesUrl(img)).length
      }

      results.push({ id: clinic.id, name: clinic.name, fixed, failed })
    }

    const totalFixed = results.reduce((sum, r) => sum + r.fixed, 0)
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0)

    return NextResponse.json({
      message: `Processed ${affected.length} clinics`,
      totalFixed,
      totalFailed,
      details: results,
    })
  } catch (error) {
    console.error("[fix-google-photos] Fix error:", error)
    return NextResponse.json({ error: "Failed to fix photos" }, { status: 500 })
  }
}
